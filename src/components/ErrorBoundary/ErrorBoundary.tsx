import { Component, type ErrorInfo, type ReactNode } from "react";

// Fase 8 — resiliencia real ante un crash inesperado de render (no un
// TraccarError de red, sino un bug en el propio árbol de React). Sin esto,
// React desmonta todo y el usuario ve una pantalla en blanco -- ya vimos la
// advertencia de la consola pidiendo exactamente esto durante el desarrollo
// de Fase 4. Los Error Boundaries de React solo pueden ser clases; no hay
// equivalente con hooks todavía.

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary atrapó un error de render:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app-crash">
          <div className="error-panel" role="alert">
            <svg width="28" height="28" viewBox="0 0 52 52" fill="none" aria-hidden="true">
              <circle cx="26" cy="26" r="24" stroke="var(--color-error)" strokeWidth="2" />
              <path d="M26 15v14" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="26" cy="35" r="2" fill="var(--color-error)" />
            </svg>
            <div>
              <p className="error-panel__title">Algo salió mal en la aplicación</p>
              <p className="error-panel__message">
                Ocurrió un error inesperado que no pudimos manejar. Intenta recargar — si persiste,
                es un bug real, no un problema de tu conexión.
              </p>
            </div>
            <button type="button" className="btn btn--secondary" onClick={this.handleReset}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
