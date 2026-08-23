// ==========================================================================
// Construcción del HTML del marcador vectorial personalizado — lógica PURA
// (sin Leaflet, sin DOM real), separada de MapView.tsx a propósito para
// poder probarla con pruebas normales de Vitest sin montar un mapa real en
// jsdom (Leaflet depende de layout de navegador real que jsdom no
// implementa completo — se probó y no vale la pena la fragilidad).
//
// Estructura (spine AD-6): el anillo/aro (estado online/offline) va en un
// elemento; la rotación del rumbo va en un elemento INTERNO separado
// (".vehicle-marker__rotor"), nunca en el mismo nodo que Leaflet mueve por
// su cuenta con setLatLng() — así la transición CSS de rotación no compite
// con el transform de posición que pone Leaflet.
// ==========================================================================

export const VEHICLE_MARKER_ICON_CLASS = "vehicle-marker-icon";
export const VEHICLE_MARKER_ICON_ONLINE_CLASS = "vehicle-marker-icon--online";
export const VEHICLE_MARKER_ROTOR_SELECTOR = ".vehicle-marker__rotor";

export function vehicleMarkerIconClassName(online: boolean): string {
  return online ? `${VEHICLE_MARKER_ICON_CLASS} ${VEHICLE_MARKER_ICON_ONLINE_CLASS}` : VEHICLE_MARKER_ICON_CLASS;
}

/** HTML interno del divIcon. El color real lo decide el CSS vía la clase del contenedor, no un valor inline. */
export function buildVehicleMarkerHtml(): string {
  return `
    <div class="vehicle-marker">
      <svg class="vehicle-marker__ring-svg" width="52" height="52" viewBox="0 0 72 72" aria-hidden="true">
        <circle class="vehicle-marker__ring" cx="36" cy="36" r="24" fill="none" stroke-width="2.5"></circle>
        <circle class="vehicle-marker__core" cx="36" cy="36" r="17" stroke-width="2.5"></circle>
      </svg>
      <div class="vehicle-marker__rotor" style="transform: rotate(0deg)">
        <svg width="52" height="52" viewBox="0 0 72 72" aria-hidden="true">
          <path class="vehicle-marker__arrow" d="M36 17 L46 43 L36 36 L26 43 Z"></path>
        </svg>
      </div>
    </div>
  `;
}

/** Normaliza el rumbo de Traccar (grados) a la forma que espera CSS transform: rotate(). */
export function bearingToRotateCss(course: number): string {
  const normalized = ((course % 360) + 360) % 360;
  return `rotate(${normalized}deg)`;
}
