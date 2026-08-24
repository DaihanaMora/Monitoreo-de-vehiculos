import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceListPanel } from "./DeviceListPanel";
import type { Device, Position } from "../../lib/traccarClient";
import type { AsyncState } from "../../hooks/asyncState";

// Offsets relativos a "ahora" en el momento en que corre la prueba -- sin
// congelar el reloj (fake timers choca con los delays internos de
// userEvent a menos que se configuren explícitamente, no vale la pena
// aquí). 1 min siempre clasifica "reciente"; 20 min siempre "desactualizado"
// contra el umbral real de 5 min de DeviceListPanel.
const devices: Device[] = [
  { id: 7, name: "Camión 07", status: "online", lastUpdate: new Date(Date.now() - 60_000).toISOString(), uniqueId: "TRC-1021" },
  { id: 3, name: "Camioneta 03", status: "offline", lastUpdate: new Date(Date.now() - 20 * 60_000).toISOString(), uniqueId: "TRC-1022" },
  { id: 21, name: "Moto 21", status: "online", lastUpdate: null, uniqueId: "TRC-1023" }, // sin dato -> se trata como desactualizado
];

// Camión 07: en movimiento (45 km/h). Camioneta 03: detenida (0 km/h).
// Moto 21: sin posición en absoluto (no está en el Map) -- prueba el caso
// "no se puede clasificar" del filtro de Movimiento.
const positionsById: Map<number, Position> = new Map([
  [7, { latitude: -12.05, longitude: -77.04, course: 45, speedKmh: 45, fixTime: new Date().toISOString() }],
  [3, { latitude: -12.06, longitude: -77.05, course: 0, speedKmh: 0, fixTime: new Date().toISOString() }],
]);
const positions: AsyncState<Map<number, Position>> = { status: "success", data: positionsById };

describe("<DeviceListPanel />", () => {
  it("muestra los chips con el conteo correcto y sin 'Connecting' (decisión explícita, spine)", () => {
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Todos 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "En línea 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fuera de línea 1" })).toBeInTheDocument();
    expect(screen.queryByText(/Connecting/i)).not.toBeInTheDocument();
  });

  it("filtra por chip de estado sin tocar la selección activa", async () => {
    const user = userEvent.setup();
    const onSelectDevice = vi.fn();
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={7} onSelectDevice={onSelectDevice} />);

    await user.click(screen.getByRole("button", { name: "Fuera de línea 1" }));

    expect(screen.getByText("Camioneta 03")).toBeInTheDocument();
    expect(screen.queryByText("Camión 07")).not.toBeInTheDocument();
    expect(screen.queryByText("Moto 21")).not.toBeInTheDocument();
    // filtrar la lista visible no dispara una re-selección (AD-12 intacto)
    expect(onSelectDevice).not.toHaveBeenCalled();
  });

  it("filtra por texto de búsqueda, sin distinguir mayúsculas/minúsculas", async () => {
    const user = userEvent.setup();
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

    await user.type(screen.getByLabelText("Buscar vehículos"), "MOTO");

    expect(screen.getByText("Moto 21")).toBeInTheDocument();
    expect(screen.queryByText("Camión 07")).not.toBeInTheDocument();
  });

  it("una búsqueda sin resultados muestra un mensaje distinto al de 'cuenta sin vehículos'", async () => {
    const user = userEvent.setup();
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

    await user.type(screen.getByLabelText("Buscar vehículos"), "no-existe-este-vehiculo");

    expect(screen.getByText("Ningún vehículo coincide con tu búsqueda.")).toBeInTheDocument();
    expect(screen.queryByText("No hay vehículos disponibles en esta cuenta.")).not.toBeInTheDocument();
  });

  it("el botón de limpiar búsqueda solo aparece con texto escrito, y la vacía", async () => {
    const user = userEvent.setup();
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

    expect(screen.queryByLabelText("Limpiar búsqueda")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar vehículos"), "camion");
    expect(screen.getByLabelText("Limpiar búsqueda")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Limpiar búsqueda"));
    expect(screen.getByLabelText("Buscar vehículos")).toHaveValue("");
    expect(screen.getByText("Camión 07")).toBeInTheDocument();
  });

  it("cada fila muestra velocidad y estado de movimiento cuando hay posición, y ninguno cuando no la hay", () => {
    render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

    expect(screen.getByText("45 km/h")).toBeInTheDocument();
    expect(screen.getByText("En movimiento")).toBeInTheDocument();
    expect(screen.getByText("0 km/h")).toBeInTheDocument();
    expect(screen.getByText("Detenido")).toBeInTheDocument();
    // Moto 21 no tiene posición -- no debe inventarse una fila de velocidad para ella.
    expect(screen.getAllByText(/km\/h$/)).toHaveLength(2);
  });

  describe("filtros avanzados (Assets/displayComponentFilters.png)", () => {
    it("abre el popover con los tres grupos completos -- Movimiento y Velocidad ya no faltan (useAllPositions los habilitó)", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));

      expect(screen.getByRole("dialog", { name: "Filtros avanzados" })).toBeInTheDocument();
      expect(screen.getByText("Movimiento")).toBeInTheDocument();
      expect(screen.getByText("Frescura del dato")).toBeInTheDocument();
      expect(screen.getByText("Ordenar por")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Velocidad" })).toBeInTheDocument();
    });

    it("Escape cierra el popover sin aplicar nada", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("ordenar por nombre reordena la lista tras Aplicar filtros", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));
      await user.click(screen.getByRole("radio", { name: "Nombre" }));
      await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      const names = screen
        .getAllByText(/^(Camión 07|Camioneta 03|Moto 21)$/)
        .map((el) => el.textContent);
      // orden alfabético: lo único inequívoco entre locales es que "Moto"
      // (M) va después de ambos "Cami..." (C) -- evita depender de cómo
      // colacione la tilde de "Camión" vs "Camioneta".
      expect(names.indexOf("Moto 21")).toBe(2);
    });

    it("ordenar por velocidad pone primero al más rápido; sin dato de posición queda al final", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));
      await user.click(screen.getByRole("radio", { name: "Velocidad" }));
      await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      const names = screen
        .getAllByText(/^(Camión 07|Camioneta 03|Moto 21)$/)
        .map((el) => el.textContent);
      expect(names).toEqual(["Camión 07", "Camioneta 03", "Moto 21"]);
    });

    it("filtrar por 'En movimiento' excluye al detenido y al que no tiene dato de posición", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));
      await user.click(screen.getByRole("radio", { name: "En movimiento" }));
      await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      expect(screen.getByText("Camión 07")).toBeInTheDocument();
      expect(screen.queryByText("Camioneta 03")).not.toBeInTheDocument(); // detenida
      expect(screen.queryByText("Moto 21")).not.toBeInTheDocument(); // sin dato: no se puede clasificar
    });

    it("filtrar por 'dato desactualizado' oculta el vehículo con contacto reciente", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "Filtros avanzados" }));
      await user.click(screen.getByRole("radio", { name: "Dato desactualizado" }));
      await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      expect(screen.queryByText("Camión 07")).not.toBeInTheDocument(); // 1 min: reciente
      expect(screen.getByText("Camioneta 03")).toBeInTheDocument(); // 20 min: desactualizado
      expect(screen.getByText("Moto 21")).toBeInTheDocument(); // sin lastUpdate: se trata como desactualizado
    });

    it("el botón disparador se marca activo solo cuando hay filtros avanzados aplicados de verdad", async () => {
      const user = userEvent.setup();
      render(<DeviceListPanel devices={devices} positions={positions} selectedDeviceId={null} onSelectDevice={vi.fn()} />);

      const trigger = screen.getByRole("button", { name: "Filtros avanzados" });
      expect(trigger.className).not.toContain("filter-trigger--active");

      await user.click(trigger);
      await user.click(screen.getByRole("radio", { name: "Dato desactualizado" }));
      await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      expect(screen.getByRole("button", { name: "Filtros avanzados" }).className).toContain(
        "filter-trigger--active",
      );
    });
  });
});
