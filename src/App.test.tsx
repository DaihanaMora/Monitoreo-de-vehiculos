import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Enruta el fetch simulado según el endpoint del proxy, como haría el proxy real. */
function stubFetchByEndpoint(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      for (const [path, body] of Object.entries(routes)) {
        if (url.includes(path)) return Promise.resolve(jsonResponse(body));
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    }),
  );
}

async function loginAsDaihana() {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText("Correo"), "d@x.com");
  await user.type(screen.getByLabelText("Contraseña"), "buena-clave");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  // "Cerrar sesión" ahora vive adentro del desplegable de cuenta, cerrado
  // por defecto -- el avatar (siempre visible) es la señal confiable de
  // que ya se pasó la pantalla de login.
  await screen.findByRole("button", { name: /^Cuenta de/ });
  return user;
}

describe("<App /> post-login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tras iniciar sesión con la lista de dispositivos vacía, ni el mapa ni la tarjeta de estado tienen nada que mostrar (Fase 6: StatusCard no se monta sin vehículo)", async () => {
    stubFetchByEndpoint({
      session: { id: 1, name: "Daihana", email: "d@x.com" },
      devices: [],
    });

    await loginAsDaihana();

    expect(screen.getByText("Selecciona un vehículo para ver su ubicación.")).toBeInTheDocument();
    expect(await screen.findByText("No hay vehículos disponibles en esta cuenta.")).toBeInTheDocument();
    expect(document.querySelector(".status-card")).not.toBeInTheDocument();
  });

  it("Fase 5/6: con un dispositivo seleccionado pero sin posición reportada, el mapa Y la tarjeta de estado muestran la nota de 'sin datos' cada uno por su lado (spine AD-13: null es éxito, no error)", async () => {
    stubFetchByEndpoint({
      session: { id: 1, name: "Daihana", email: "d@x.com" },
      devices: [{ id: 7, name: "Camión 07", status: "online" }],
      positions: [], // Traccar responde arreglo vacío -> getLatestPosition resuelve null
    });

    await loginAsDaihana();

    // Misma leyenda aparece dos veces (mapa + tarjeta) -- se verifica cada
    // una en su propio contenedor, no con un texto ambiguo compartido.
    const note = "Sin datos de posición para este vehículo todavía.";
    await waitFor(() => {
      expect(document.querySelector(".map-view")).toHaveTextContent(note);
      expect(document.querySelector(".status-card")).toHaveTextContent(note);
    });
    // El mapa (Leaflet) sí se monta -- no revienta en el entorno de pruebas.
    expect(document.querySelector(".map-view__canvas")).toBeInTheDocument();
    expect(document.querySelector(".leaflet-container")).toBeInTheDocument();
  });

  it("Fase 6: con una posición real, la tarjeta de estado muestra velocidad convertida a km/h, estado en línea y última actualización humanizada", async () => {
    stubFetchByEndpoint({
      session: { id: 1, name: "Daihana", email: "d@x.com" },
      devices: [{ id: 7, name: "Camión 07", status: "online" }],
      positions: [
        { deviceId: 7, latitude: -12.05, longitude: -77.04, course: 45, speed: 33.5, fixTime: new Date().toISOString() },
      ],
    });

    await loginAsDaihana();

    const card = await waitFor(() => {
      const el = document.querySelector(".status-card");
      if (!el || !el.textContent?.includes("km/h")) throw new Error("aún cargando");
      return el;
    });

    expect(card).toHaveTextContent("Camión 07");
    expect(card).toHaveTextContent("En línea");
    // 33.5 nudos -> 62.04 km/h, redondeado a 62 -- la tarjeta NUNCA muestra nudos crudos.
    expect(card).toHaveTextContent("62 km/h");
    expect(card).not.toHaveTextContent("33.5");
    expect(card).toHaveTextContent(/Hace (instantes|\d+ segundos?)/);
    // aria-live="polite" en el contenedor, para que un lector de pantalla
    // anuncie los cambios de velocidad/última actualización (spine AD-10).
    expect(card).toHaveAttribute("aria-live", "polite");
  });

  it("Fase 5: con una posición real, el mapa dibuja el marcador vectorial con la rotación correcta (spine AD-6)", async () => {
    stubFetchByEndpoint({
      session: { id: 1, name: "Daihana", email: "d@x.com" },
      devices: [{ id: 7, name: "Camión 07", status: "online" }],
      positions: [
        { deviceId: 7, latitude: -12.05, longitude: -77.04, course: 45, speed: 20, fixTime: "2026-08-19T12:00:00Z" },
      ],
    });

    await loginAsDaihana();

    expect(
      screen.queryByText("Sin datos de posición para este vehículo todavía."),
    ).not.toBeInTheDocument();

    const rotor = await waitFor(() => {
      const el = document.querySelector<HTMLElement>(".vehicle-marker__rotor");
      if (!el) throw new Error("marcador aún no montado");
      return el;
    });
    expect(rotor.style.transform).toBe("rotate(45deg)");
    // en línea -> la clase de color online debe estar en el contenedor del icono
    expect(document.querySelector(".vehicle-marker-icon--online")).toBeInTheDocument();
  });

  it("Fase 4: lista los dispositivos reales, distingue en línea/fuera de línea, y selecciona el primero automáticamente (spine AD-12)", async () => {
    stubFetchByEndpoint({
      session: { id: 1, name: "Daihana", email: "d@x.com" },
      devices: [
        { id: 7, name: "Camión 07", status: "online" },
        { id: 3, name: "Camioneta 03", status: "offline" },
      ],
    });

    await loginAsDaihana();

    const camion = await screen.findByRole("button", { name: /Camión 07/ });
    const camioneta = screen.getByRole("button", { name: /Camioneta 03/ });

    expect(camion).toHaveTextContent("En línea");
    expect(camioneta).toHaveTextContent("Fuera de línea");
    // El primer dispositivo queda seleccionado sin necesidad de hacer clic
    // (el efecto de auto-selección corre después del primer render).
    await waitFor(() => expect(camion).toHaveAttribute("aria-pressed", "true"));
    expect(camioneta).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(camioneta);
    expect(camioneta).toHaveAttribute("aria-pressed", "true");
    expect(camion).toHaveAttribute("aria-pressed", "false");
  });

  it("Fase 4: un error al cargar dispositivos muestra ErrorPanel con Reintentar, no una lista vacía silenciosa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("session")) return Promise.resolve(jsonResponse({ id: 1, name: "Daihana", email: "d@x.com" }));
        return Promise.resolve(new Response(JSON.stringify({ error: "upstream_unreachable" }), { status: 502 }));
      }),
    );

    await loginAsDaihana();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo contactar al servidor/i);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
