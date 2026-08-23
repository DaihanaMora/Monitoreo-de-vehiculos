import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

describe("<ErrorBoundary />", () => {
  it("atrapa un error de render y muestra una salida amigable con Reintentar, no una pantalla en blanco", () => {
    // React registra el error en consola en modo dev -- silenciamos ese
    // ruido esperado solo para esta prueba puntual.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal en la aplicación");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("cuando no hay error, renderiza los hijos normalmente", () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("todo bien")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
