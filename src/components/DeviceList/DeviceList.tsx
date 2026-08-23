import type { Device, Position } from "../../lib/traccarClient";
import { Skeleton } from "../Skeleton/Skeleton";
import { formatRelativeTime } from "../../lib/relativeTime";
import { useNow } from "../../hooks/useNow";
import { isMoving } from "./motion";
import { SimulateToggle } from "./SimulateToggle";

// Presentacional puro (spine paradigma: components/ no hace fetch ni
// timers propios -- useNow es un reloj de UI, no una fuente de datos).
// selectedDeviceId/onSelectDevice llegan por prop desde App.tsx, nunca por
// Context (spine AD-12). `positions` ya viene resuelto a un Map plano
// (DeviceListPanel colapsa el AsyncState antes de pasarlo) para que este
// componente no tenga que conocer loading/error de la posición agregada.

interface DeviceListProps {
  devices: Device[];
  positions: Map<number, Position>;
  selectedDeviceId: number | null;
  onSelectDevice: (id: number) => void;
}

/** online/offline es el enum crudo de Traccar, sin normalizar (spine AD-5). */
function isOnline(status: string): boolean {
  return status === "online";
}

export function DeviceList({ devices, positions, selectedDeviceId, onSelectDevice }: DeviceListProps) {
  const now = useNow();

  if (devices.length === 0) {
    return <p className="placeholder-note">No hay vehículos disponibles en esta cuenta.</p>;
  }

  return (
    <ul className="device-list">
      {devices.map((device) => {
        const online = isOnline(device.status);
        const selected = device.id === selectedDeviceId;
        const position = positions.get(device.id);
        const moving = isMoving(position);

        return (
          <li key={device.id} className="device-list-item">
            <button
              type="button"
              className={`device-row${selected ? " device-row--selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onSelectDevice(device.id)}
            >
              <div className="device-row__top">
                <span className="device-row__name">{device.name}</span>
                <span className={`device-row__status${online ? " device-row__status--online" : ""}`}>
                  <span className={`pulse-dot ${online ? "pulse-dot--online" : "pulse-dot--offline"}`} aria-hidden="true" />
                  {online ? "En línea" : "Fuera de línea"}
                </span>
              </div>
              <span className="device-row__id mono">#{device.uniqueId}</span>

              {position && (
                <div className="device-row__meta">
                  <span className="device-row__speed mono">{Math.round(position.speedKmh)} km/h</span>
                  <span className="device-row__updated">{formatRelativeTime(position.fixTime, now)}</span>
                </div>
              )}

              {position && (
                <div className={`device-row__motion${moving ? " device-row__motion--moving" : ""}`}>
                  <span className="motion-dot" aria-hidden="true" />
                  {moving ? "En movimiento" : "Detenido"}
                </div>
              )}
            </button>

            {/* Dev-only: fuera del <button> de la fila a propósito (HTML no
                permite <button> anidado) y excluido del build de producción
                por import.meta.env.DEV -- Vite elimina esta rama entera al
                hacer tree-shaking en `vite build` (spine: mismo principio
                dev-only que vite-plugin-gps-simulator.ts). */}
            {import.meta.env.DEV && (
              <SimulateToggle uniqueId={device.uniqueId} seedLat={4.711 + (device.id % 10) * 0.01} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Fila fantasma mientras useDevices está en "loading" — reutiliza Skeleton (Fase 3). */
export function DeviceListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="device-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="device-row">
          <Skeleton width="2.5rem" height="2.5rem" radius="var(--radius-md)" />
        </li>
      ))}
    </ul>
  );
}
