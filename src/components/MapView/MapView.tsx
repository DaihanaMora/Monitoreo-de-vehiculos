import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Position, TraccarError } from "../../lib/traccarClient";
import type { AsyncState } from "../../hooks/asyncState";
import { Skeleton } from "../Skeleton/Skeleton";
import { ErrorPanel } from "../ErrorPanel/ErrorPanel";
import {
  bearingToRotateCss,
  buildVehicleMarkerHtml,
  vehicleMarkerIconClassName,
  VEHICLE_MARKER_ICON_ONLINE_CLASS,
  VEHICLE_MARKER_ROTOR_SELECTOR,
} from "../../lib/vehicleMarkerIcon";

interface MapViewProps {
  positionState: AsyncState<Position | null>;
  deviceName: string;
  online: boolean;
}

// Lima, Perú — mismo centro que usan los mockups de UX cuando no hay una
// posición real todavía.
const DEFAULT_CENTER: L.LatLngExpression = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 13;

function errorFrom(state: AsyncState<Position | null>): TraccarError | null {
  return state.status === "error" ? state.error : null;
}

function positionFrom(state: AsyncState<Position | null>): Position | null {
  return state.status === "success" ? state.data : null;
}

export function MapView({ positionState, deviceName, online }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const position = positionFrom(positionState);
  const error = errorFrom(positionState);

  // Inicializa el mapa UNA sola vez; se destruye al desmontar.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    // El contenedor ahora depende del alto del viewport (height:100% del
    // panel, rediseño), no de un rem fijo -- si la ventana cambia de
    // tamaño, Leaflet necesita que se lo digan explícitamente o los tiles
    // quedan mal alineados/recortados.
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Crea/mueve/quita el marcador cuando cambia la posición o el estado.
  // Spine AD-6: Leaflet mueve el marcador por su cuenta (setLatLng, sin
  // interpolación propia nuestra); solo la ROTACIÓN se anima con CSS, sobre
  // un nodo interno separado (.vehicle-marker__rotor) que actualizamos a
  // mano para no perder la transición al recrear el icono.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!position) {
      // Spine AD-13: sin posición reportada es un éxito válido, no un
      // error -- el marcador simplemente no se dibuja.
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latLng: L.LatLngExpression = [position.latitude, position.longitude];

    if (!markerRef.current) {
      const icon = L.divIcon({
        html: buildVehicleMarkerHtml(),
        className: vehicleMarkerIconClassName(online),
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
      markerRef.current = L.marker(latLng, { icon }).addTo(map);
      map.setView(latLng, DEFAULT_ZOOM);
    } else {
      markerRef.current.setLatLng(latLng);
    }

    const el = markerRef.current.getElement();
    if (el) {
      el.classList.toggle(VEHICLE_MARKER_ICON_ONLINE_CLASS, online);
      const rotor = el.querySelector<HTMLElement>(VEHICLE_MARKER_ROTOR_SELECTOR);
      if (rotor) rotor.style.transform = bearingToRotateCss(position.course);
    }
  }, [position, online]);

  return (
    <div className="map-view">
      <div
        ref={containerRef}
        className="map-view__canvas"
        role="img"
        aria-label={
          position
            ? `Mapa mostrando la ubicación de ${deviceName}`
            : `Mapa sin posición reportada todavía para ${deviceName}`
        }
      />

      {(positionState.status === "idle" || positionState.status === "loading") && (
        <div className="map-view__overlay" aria-live="polite">
          <Skeleton width="12rem" height="1.25rem" radius="var(--radius-full)" />
        </div>
      )}

      {error && (
        <div className="map-view__overlay">
          <ErrorPanel error={error} title="No pudimos actualizar la posición">
            <span className="map-view__retry-note">Reintentando automáticamente…</span>
          </ErrorPanel>
        </div>
      )}

      {positionState.status === "success" && !position && (
        <p className="map-view__empty-note">Sin datos de posición para este vehículo todavía.</p>
      )}
    </div>
  );
}
