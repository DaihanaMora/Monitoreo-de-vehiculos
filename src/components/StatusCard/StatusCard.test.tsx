import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusCard } from "./StatusCard";
import type { AsyncState } from "../../hooks/asyncState";
import type { Device, Position } from "../../lib/traccarClient";

const device: Device = {
  id: 7,
  name: "Camión 07",
  status: "online",
  lastUpdate: new Date().toISOString(),
  uniqueId: "TRC-1021",
};

const withPosition: AsyncState<Position | null> = {
  status: "success",
  data: { latitude: -12.0464, longitude: -77.0428, course: 45, speedKmh: 62, fixTime: new Date().toISOString() },
};

const withoutPosition: AsyncState<Position | null> = { status: "success", data: null };

describe("<StatusCard />", () => {
  it("aplica la clase flotante solo cuando floating=true (Assets/desktop1.png)", () => {
    const { container, rerender } = render(<StatusCard device={device} positionState={withPosition} />);
    expect(container.querySelector(".status-card--floating")).not.toBeInTheDocument();

    rerender(<StatusCard device={device} positionState={withPosition} floating />);
    expect(container.querySelector(".status-card--floating")).toBeInTheDocument();
  });

  it("sin datos de posición no ofrece 'Ver detalles' -- no hay nada real que expandir", () => {
    render(<StatusCard device={device} positionState={withoutPosition} />);
    expect(screen.queryByRole("button", { name: /ver detalles/i })).not.toBeInTheDocument();
  });

  it("'Ver detalles del vehículo' expande identificador, coordenadas, rumbo y hora exacta -- nunca una ruta inventada (Traccar no la tiene)", async () => {
    const user = userEvent.setup();
    render(<StatusCard device={device} positionState={withPosition} />);

    const toggle = screen.getByRole("button", { name: "Ver detalles del vehículo" });
    expect(screen.queryByText("Identificador")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: "Ocultar detalles" })).toBeInTheDocument();
    expect(screen.getByText("Identificador")).toBeInTheDocument();
    expect(screen.getByText("TRC-1021")).toBeInTheDocument();
    expect(screen.getByText("Coordenadas")).toBeInTheDocument();
    expect(screen.getByText("-12.0464, -77.0428")).toBeInTheDocument();
    expect(screen.getByText("Rumbo")).toBeInTheDocument();
    expect(screen.getByText("45°")).toBeInTheDocument();
    expect(screen.getByText("Hora exacta")).toBeInTheDocument();
    expect(screen.queryByText(/Ruta|Route/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ocultar detalles" }));
    expect(screen.queryByText("Identificador")).not.toBeInTheDocument();
  });
});
