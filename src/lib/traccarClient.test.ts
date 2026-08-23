import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TraccarError, getAllPositions, getLatestPosition, isAuthenticated, login, logout } from "./traccarClient";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("traccarClient", () => {
  beforeEach(() => {
    logout(); // credenciales son estado de módulo (AD-3) — aislar tests
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("login / logout / isAuthenticated", () => {
    it("guarda las credenciales en memoria cuando el login es exitoso", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(200, { id: 1, name: "Daihana", email: "d@x.com" })),
      );

      expect(isAuthenticated()).toBe(false);
      const user = await login("d@x.com", "secreta");

      expect(user.name).toBe("Daihana");
      expect(isAuthenticated()).toBe(true);
    });

    it("NO deja credenciales inválidas pegadas en memoria si el login falla", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("stack trace de Java, no JSON", { status: 401 })),
      );

      await expect(login("d@x.com", "mala")).rejects.toThrow(TraccarError);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("clasificación de errores (spine AD-4)", () => {
    it("un 401 se clasifica como invalid_credentials SIN intentar parsear el cuerpo como JSON", async () => {
      // Regresión directa del hallazgo real: demo4.traccar.org responde 401
      // con un stack trace de Java en texto plano. Si el cliente llamara
      // response.json() antes de revisar el status, esto reventaría con un
      // SyntaxError en vez de lanzar el TraccarError esperado.
      const rawBody = "jakarta.ws.rs.WebApplicationException: HTTP 401 Unauthorized\n\tat org.traccar...";
      const response = new Response(rawBody, { status: 401 });
      const jsonSpy = vi.spyOn(response, "json");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

      await expect(login("d@x.com", "mala")).rejects.toMatchObject({
        kind: "invalid_credentials",
      });
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("un 502 con error=upstream_timeout se clasifica como upstream_timeout", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(502, { error: "upstream_timeout", message: "no respondió a tiempo" })),
      );

      await expect(login("d@x.com", "x")).rejects.toMatchObject({ kind: "upstream_timeout" });
    });

    it("un fetch que rechaza (sin red) se clasifica como network_error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(login("d@x.com", "x")).rejects.toMatchObject({ kind: "network_error" });
    });
  });

  describe("getLatestPosition (spine AD-5 / AD-13)", () => {
    it("convierte nudos a km/h exactamente una vez, en el adaptador", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, [
            { latitude: -12.05, longitude: -77.04, course: 45, speed: 33.5, fixTime: "2026-08-19T12:00:00Z" },
          ]),
        ),
      );

      const position = await getLatestPosition(7);

      expect(position).not.toBeNull();
      expect(position!.speedKmh).toBeCloseTo(33.5 * 1.852, 2);
      // el campo crudo en nudos nunca debe cruzar el límite del adaptador
      expect(position).not.toHaveProperty("speed");
    });

    it("una lista de posiciones vacía es un éxito válido: null, no un error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

      await expect(getLatestPosition(99)).resolves.toBeNull();
    });
  });

  describe("getAllPositions (rediseño: un solo fetch para toda la lista, spine AD-7 evolucionada)", () => {
    it("arma un Map por deviceId, con la misma conversión de nudos a km/h que getLatestPosition", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(200, [
            { deviceId: 7, latitude: -12.05, longitude: -77.04, course: 45, speed: 33.5, fixTime: "2026-08-19T12:00:00Z" },
            { deviceId: 3, latitude: -12.06, longitude: -77.05, course: 90, speed: 0, fixTime: "2026-08-19T12:00:00Z" },
          ]),
        ),
      );

      const positions = await getAllPositions();

      expect(positions.size).toBe(2);
      expect(positions.get(7)?.speedKmh).toBeCloseTo(33.5 * 1.852, 2);
      expect(positions.get(3)?.speedKmh).toBe(0);
      // el deviceId no cruza al valor -- ya está en la clave del Map, no se duplica en el objeto
      expect(positions.get(7)).not.toHaveProperty("deviceId");
      expect(positions.get(7)).not.toHaveProperty("speed");
    });

    it("un dispositivo sin posición reportada simplemente no aparece en el Map (no es un error)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

      const positions = await getAllPositions();

      expect(positions.size).toBe(0);
      expect(positions.get(999)).toBeUndefined();
    });
  });
});
