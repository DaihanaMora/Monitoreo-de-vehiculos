import { useEffect, useRef, useState } from "react";

// ==========================================================================
// Botón "Simular movimiento" -- SOLO existe en desarrollo local (guardado
// por `import.meta.env.DEV` en el único lugar donde se importa, DeviceList).
// Llama al endpoint dev-only de vite-plugin-gps-simulator.ts, que a su vez
// reenvía un ping OsmAnd real al Traccar configurado -- mismo mecanismo que
// scripts/simulate-gps.sh, pero activable/desactivable por vehículo desde
// la propia UI en vez de una terminal (pedido explícito de Daihana:
// "sin necesidad de hacerlo mediante curl").
//
// Por qué esto NO reemplaza el Traccar Client real: sigue siendo movimiento
// inventado (avanza en línea recta a partir de un punto fijo), no la
// posición real de un GPS. Es una herramienta de prueba, no una fuente de
// datos legítima -- por eso vive fuera del bundle de producción.
// ==========================================================================

const INTERVAL_MS = 4000;
const STEP = 0.0006; // grados por tick, mismo valor que scripts/simulate-gps.sh
const BEARING_DEG = 45;
const SPEED_KNOTS = 12;

interface SimulateToggleProps {
  uniqueId: string;
  /** Punto de partida -- se ofrece un offset por dispositivo para que varios
   *  autos simulados a la vez no queden exactamente superpuestos. */
  seedLat?: number;
  seedLng?: number;
}

export function SimulateToggle({ uniqueId, seedLat = 4.711, seedLng = -74.0721 }: SimulateToggleProps) {
  const [active, setActive] = useState(false);
  const [lastError, setLastError] = useState(false);
  const positionRef = useRef({ lat: seedLat, lng: seedLng });

  useEffect(() => {
    if (!active) return;

    const rad = (BEARING_DEG * Math.PI) / 180;
    const dLat = Math.cos(rad) * STEP;
    const dLng = Math.sin(rad) * STEP;

    const tick = () => {
      const { lat, lng } = positionRef.current;
      fetch("/api/dev/simulate-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueId, lat, lon: lng, speed: SPEED_KNOTS, bearing: BEARING_DEG }),
      })
        .then((res) => setLastError(!res.ok))
        .catch(() => setLastError(true));
      positionRef.current = { lat: lat + dLat, lng: lng + dLng };
    };

    tick(); // primer ping inmediato, no esperar 4s para el primero
    const id = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, uniqueId]);

  return (
    <button
      type="button"
      className={`dev-simulate-toggle${active ? " dev-simulate-toggle--active" : ""}`}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation(); // no debe seleccionar la fila del vehículo
        setActive((v) => !v);
      }}
      title="Solo en desarrollo local -- manda posiciones inventadas a Traccar (protocolo OsmAnd)"
    >
      {active ? (lastError ? "⚠ Simulación (error)" : "■ Detener simulación") : "▶ Simular movimiento"}
    </button>
  );
}
