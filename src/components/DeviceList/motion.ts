import type { Position } from "../../lib/traccarClient";

// Por debajo de esto se considera "detenido", no "en movimiento" -- el
// ruido normal del GPS en reposo puede reportar 0.2-0.8 km/h. Una sola
// definición, usada por DeviceList (badge visual) Y DeviceListPanel
// (filtro "Movimiento"), para que nunca puedan desincronizarse.
export const MOVING_THRESHOLD_KMH = 1;

export function isMoving(position: Position | undefined): boolean {
  return position !== undefined && position.speedKmh > MOVING_THRESHOLD_KMH;
}
