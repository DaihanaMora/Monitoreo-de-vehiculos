import type { ReactNode } from "react";
import type { TraccarError, TraccarErrorKind } from "../../lib/traccarClient";

// Spine AD-4: un solo componente de error, montado inline en el punto de
// llamada de cada hook — nunca un agregador global de errores. La variante
// de pantalla completa ("sin conexión con Traccar" del mockup Calma
// Operativa) es este mismo componente montado donde falla la fuente de
// datos de toda la app (p. ej. el login), no un mecanismo aparte.

const MESSAGES: Record<TraccarErrorKind, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  upstream_unreachable: "No se pudo contactar al servidor de Traccar (posible caída del servicio o bloqueo de red).",
  upstream_timeout: "El servidor de Traccar no respondió a tiempo.",
  network_error: "No hay conexión de red. Revisa tu internet e inténtalo de nuevo.",
  unknown: "Ocurrió un error inesperado.",
};

interface ErrorPanelProps {
  error: TraccarError;
  title?: string;
  onRetry?: () => void;
  /** Nota extra opcional (p. ej. "Reintentando automáticamente…" cuando no hay botón). */
  children?: ReactNode;
}

export function ErrorPanel({ error, title = "No pudimos completar la operación", onRetry, children }: ErrorPanelProps) {
  return (
    <div className="error-panel" role="alert">
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <circle cx="26" cy="26" r="24" stroke="var(--color-error)" strokeWidth="2" />
        <path d="M26 15v14" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="26" cy="35" r="2" fill="var(--color-error)" />
      </svg>
      <div>
        <p className="error-panel__title">{title}</p>
        <p className="error-panel__message">{MESSAGES[error.kind] ?? error.message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
      {children}
    </div>
  );
}
