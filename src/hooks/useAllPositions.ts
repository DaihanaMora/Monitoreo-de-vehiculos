import { useEffect, useState } from "react";
import { getAllPositions, TraccarError, type Position } from "../lib/traccarClient";
import type { AsyncState } from "./asyncState";

// Spine AD-7, evolucionada para el rediseño: sigue siendo UN solo dueño del
// sondeo (intervalo 5s, [ASUNCIÓN] original sin cambios), pero ahora trae
// la posición de TODOS los dispositivos visibles en una sola petición —
// Traccar la sirve desde caché server-side (GET /api/positions sin
// deviceId), así que es más barato que sondear uno por uno. El mapa
// (vehículo seleccionado), la tarjeta de estado, y las tarjetas de la
// lista (velocidad, movimiento) se derivan todas de este mismo estado, sin
// fetches propios.
const POLL_INTERVAL_MS = 5000;

export function useAllPositions() {
  const [state, setState] = useState<AsyncState<Map<number, Position>>>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // No vuelve a "loading" entre sondeos ya exitosos -- evita que el
      // mapa/lista parpadeen cada 5s solo porque llegó el siguiente poll.
      setState((prev) => (prev.status === "success" ? prev : { status: "loading" }));
      try {
        const data = await getAllPositions();
        if (!cancelled) setState({ status: "success", data });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof TraccarError ? err : new TraccarError("unknown", "Ocurrió un error inesperado.");
        setState({ status: "error", error });
      }
    }

    void poll(); // primer dato de inmediato, no esperar los 5s iniciales
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return state;
}

/**
 * Deriva la posición de UN dispositivo a partir del estado agregado --
 * para que MapView/StatusCard (spine AD-13) sigan viendo exactamente la
 * misma forma AsyncState<Position | null> que ya conocían, sin enterarse
 * de que ahora hay un solo fetch compartido detrás.
 */
export function selectPosition(
  state: AsyncState<Map<number, Position>>,
  deviceId: number | null,
): AsyncState<Position | null> {
  if (deviceId === null) return { status: "idle" };
  if (state.status === "idle" || state.status === "loading") return state;
  if (state.status === "error") return state;
  return { status: "success", data: state.data.get(deviceId) ?? null };
}

/**
 * El `fixTime` más reciente entre todos los vehículos -- alimenta el
 * indicador "● LIVE" del header (Assets/desktop1.png), que faltaba por
 * completo (encontrado por Daihana). Los timestamps ISO 8601 comparan
 * correctamente como texto, sin necesidad de parsear a Date primero.
 */
export function latestFixTime(state: AsyncState<Map<number, Position>>): string | null {
  if (state.status !== "success") return null;
  let latest: string | null = null;
  for (const position of state.data.values()) {
    if (!latest || position.fixTime > latest) latest = position.fixTime;
  }
  return latest;
}
