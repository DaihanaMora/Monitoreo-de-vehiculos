import { useState } from "react";
import type { AsyncState } from "../../hooks/asyncState";
import { useNow } from "../../hooks/useNow";
import type { Device, Position } from "../../lib/traccarClient";
import { formatRelativeTime } from "../../lib/relativeTime";
import { ErrorPanel } from "../ErrorPanel/ErrorPanel";
import { Skeleton } from "../Skeleton/Skeleton";
import { isMoving } from "../DeviceList/motion";

interface StatusCardProps {
  device: Device;
  positionState: AsyncState<Position | null>;
  /** Rediseño (Assets/desktop1.png): flota sobre el mapa en vez de vivir en su propia columna. */
  floating?: boolean;
}

/**
 * Semántica `<dl>/<dt>/<dd>` real (spine AD-10), no divs con estilo.
 * `aria-live="polite"` en el contenedor: velocidad y última actualización
 * cambian solas cada 5s (el mismo sondeo agregado de useAllPositions) y un
 * lector de pantalla debe enterarse sin que se le interrumpa lo que esté
 * haciendo. "Ver detalles" (Assets/desktop2.png) expande identificador,
 * coordenadas, rumbo y hora exacta -- todo dato real de Traccar; la "ruta"
 * del mockup no se implementa (Traccar no tiene ese concepto, ver memlog).
 */
export function StatusCard({ device, positionState, floating = false }: StatusCardProps) {
  const now = useNow();
  const online = device.status === "online";
  const [expanded, setExpanded] = useState(false);
  const position = positionState.status === "success" ? positionState.data : null;

  return (
    <div className={`status-card${floating ? " status-card--floating" : ""}`} aria-live="polite">
      <dl className="status-list">
        {/* Cabecera: nombre + insignia de estado en la misma fila
            (Assets/desktop1.png). Las etiquetas "Vehículo"/"Estado" quedan
            para lectores de pantalla -- visualmente el nombre y la insignia
            de color ya comunican lo mismo que un rótulo de texto. */}
        <div className="status-list__row status-card__header">
          <dt className="visually-hidden">Vehículo</dt>
          <dd className="status-card__name capitalize">{device.name}</dd>
          <dt className="visually-hidden">Estado</dt>
          <dd className={`status-pill${online ? " status-pill--online" : ""}`}>
            <span
              className={`pulse-dot ${online ? "pulse-dot--online" : "pulse-dot--offline"}`}
              aria-hidden="true"
            />
            {online ? "En línea" : "Fuera de línea"}
          </dd>
        </div>

        <PositionRows positionState={positionState} now={now} online={online} />
      </dl>

      {position && (
        <>
          <button
            type="button"
            className="status-card__toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {/* Flecha lineal que rota 180° al desplegar (pedido explícito
                de Daihana) -- currentColor sigue el color del botón. */}
            <svg
              className={`status-card__toggle-icon${expanded ? " status-card__toggle-icon--expanded" : ""}`}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {expanded ? "Ocultar detalles" : "Ver detalles del vehículo"}
          </button>

          {/* Siempre montado (no {expanded && ...}) -- es justo lo que
              permite animar el despliegue con CSS puro (grid-template-rows
              0fr->1fr, ver components.css) en vez de que el contenido
              aparezca/desaparezca de golpe. */}
          <div className={`status-card__details-wrapper${expanded ? " status-card__details-wrapper--expanded" : ""}`}>
            <div className="status-card__details-inner">
              <dl className="status-list">
                <div className="status-list__row">
                  <dt>Identificador</dt>
                  <dd className="mono">{device.uniqueId}</dd>
                </div>
                <div className="status-list__row">
                  <dt>Coordenadas</dt>
                  <dd className="mono">
                    {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
                  </dd>
                </div>
                <div className="status-list__row">
                  <dt>Rumbo</dt>
                  <dd className="mono">{Math.round(position.course)}°</dd>
                </div>
                <div className="status-list__row">
                  <dt>Hora exacta</dt>
                  <dd className="mono">
                    {new Date(position.fixTime).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PositionRows({
  positionState,
  now,
  online,
}: {
  positionState: AsyncState<Position | null>;
  now: Date;
  online: boolean;
}) {
  if (positionState.status === "idle" || positionState.status === "loading") {
    return (
      <div className="status-list__row">
        <dt>Posición</dt>
        <dd>
          <Skeleton width="6rem" height="1rem" />
        </dd>
      </div>
    );
  }

  if (positionState.status === "error") {
    return (
      <div className="status-list__row">
        <dt>Posición</dt>
        <dd>
          <ErrorPanel error={positionState.error} title="No pudimos actualizar la posición">
            <span className="map-view__retry-note">Reintentando automáticamente…</span>
          </ErrorPanel>
        </dd>
      </div>
    );
  }

  // Spine AD-13: sin posición reportada es un éxito válido, no un error --
  // una sola fila explícita, no un <dd> vacío.
  if (!positionState.data) {
    return (
      <div className="status-list__row">
        <dt>Posición</dt>
        <dd>Sin datos de posición para este vehículo todavía.</dd>
      </div>
    );
  }

  const { speedKmh, fixTime } = positionState.data;
  // Mismo bug/fix que DeviceList.tsx: "En movimiento" solo tiene sentido
  // si el dispositivo está reportando ahora mismo (online), no a partir de
  // la última posición conocida cuando ya está fuera de línea.
  const moving = online && isMoving(positionState.data);
  return (
    <>
      <div className="status-list__row status-card__hero">
        <dt className="visually-hidden">Velocidad</dt>
        <dd className="status-card__speed">
          <span className="status-card__speed-num mono">{Math.round(speedKmh)}</span>{" "}
          <span className="status-card__speed-unit mono">km/h</span>
        </dd>
      </div>
      <div className="status-list__row status-card__freshness-row">
        <dt className="visually-hidden">Última actualización</dt>
        <dd className="status-card__freshness">{formatRelativeTime(fixTime, now)}</dd>
      </div>
      <div className="status-list__row status-card__movement-row">
        <dt className="visually-hidden">Movimiento</dt>
        <dd className={`status-card__movement${moving ? " status-card__movement--moving" : ""}`}>
          <span className="motion-dot" aria-hidden="true" />
          {moving ? "En movimiento" : "Detenido"}
        </dd>
      </div>
    </>
  );
}
