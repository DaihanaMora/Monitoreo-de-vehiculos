import { useMemo, useState } from "react";
import type { Device, Position } from "../../lib/traccarClient";
import type { AsyncState } from "../../hooks/asyncState";
import { DeviceList } from "./DeviceList";
import { MOVING_THRESHOLD_KMH } from "./motion";
import { AdvancedFiltersButton } from "./AdvancedFilters";
import { DEFAULT_ADVANCED_FILTERS, type AdvancedFiltersValue } from "./advancedFiltersTypes";

// Umbral "dato desactualizado" del filtro de frescura: 5 minutos sin
// contacto. No es un valor de Traccar -- es un criterio nuestro, elegido
// por ser un punto de referencia común en paneles de flota.
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Referencia estable (no un Map nuevo en cada render) para cuando aún no
// hay posiciones cargadas -- evita invalidar el useMemo de abajo sin motivo.
const EMPTY_POSITIONS: Map<number, Position> = new Map();

// Rediseño (Assets/desktop1.png, movilResponsive1.png): buscador + chips de
// filtro por conteo sobre la lista de dispositivos. Se decidió con Daihana
// dejar SOLO en línea/fuera de línea -- el mockup mostraba un tercer chip
// "Connecting" que no se implementa (Traccar no nos da ese tercer estado
// en el shape fijado por la spine, AD-5).
//
// El buscar/filtrar es estado de UI puro, local a este componente -- no
// toca selectedDeviceId (spine AD-12) ni el fetch de useDevices. Filtrar
// la lista nunca deselecciona el vehículo activo en el mapa/tarjeta.

type StatusFilter = "all" | "online" | "offline";

interface DeviceListPanelProps {
  devices: Device[];
  positions: AsyncState<Map<number, Position>>;
  selectedDeviceId: number | null;
  onSelectDevice: (id: number) => void;
}

export function DeviceListPanel({ devices, positions, selectedDeviceId, onSelectDevice }: DeviceListPanelProps) {
  // Se resuelve UNA vez a un Map plano (vacío mientras carga/si falla) --
  // DeviceList y la lógica de filtro/orden de abajo comparten la misma
  // fuente, ninguna reimplementa su propia noción de "loading".
  const positionsMap = positions.status === "success" ? positions.data : EMPTY_POSITIONS;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [advanced, setAdvanced] = useState<AdvancedFiltersValue>(DEFAULT_ADVANCED_FILTERS);
  // "ahora" para clasificar frescura se fija en el EVENTO de aplicar
  // filtros (handleApplyAdvanced), no durante el render -- Date.now() ahí
  // es una llamada impura que oxlint marca correctamente si se hace en el
  // cuerpo de un useMemo. Arranca en 0: inofensivo, porque freshness
  // empieza en "all" y ese valor nunca se usa hasta que freshness cambie.
  const [asOf, setAsOf] = useState(0);

  function handleApplyAdvanced(next: AdvancedFiltersValue) {
    setAdvanced(next);
    setAsOf(Date.now());
  }

  const onlineCount = useMemo(() => devices.filter((d) => d.status === "online").length, [devices]);
  const offlineCount = devices.length - onlineCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = devices.filter((device) => {
      if (statusFilter === "online" && device.status !== "online") return false;
      if (statusFilter === "offline" && device.status === "online") return false;
      if (q && !device.name.toLowerCase().includes(q)) return false;

      if (advanced.freshness !== "all") {
        const ageMs = device.lastUpdate ? asOf - new Date(device.lastUpdate).getTime() : Infinity;
        const isStale = !device.lastUpdate || ageMs >= STALE_THRESHOLD_MS;
        if (advanced.freshness === "recent" && isStale) return false;
        if (advanced.freshness === "stale" && !isStale) return false;
      }

      if (advanced.movement !== "all") {
        // Sin dato de posición no se puede clasificar -- se excluye de
        // ambos lados en vez de adivinar (spine AD-13: null es un estado
        // propio, no se colapsa a un booleano).
        const position = positionsMap.get(device.id);
        if (!position) return false;
        const moving = position.speedKmh > MOVING_THRESHOLD_KMH;
        if (advanced.movement === "moving" && !moving) return false;
        if (advanced.movement === "stopped" && moving) return false;
      }

      return true;
    });

    if (advanced.sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else if (advanced.sortBy === "speed") {
      result.sort((a, b) => {
        const speedA = positionsMap.get(a.id)?.speedKmh ?? -1;
        const speedB = positionsMap.get(b.id)?.speedKmh ?? -1;
        return speedB - speedA; // más rápido primero; sin dato queda al final
      });
    } else {
      result.sort((a, b) => {
        const timeA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
        const timeB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
        return timeB - timeA; // más reciente primero
      });
    }

    return result;
  }, [devices, statusFilter, query, advanced, asOf, positionsMap]);

  return (
    <div className="device-list-panel">
      <div className="device-search-row">
        <div className="device-search">
          <svg className="device-search__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Buscar vehículos"
            placeholder="Buscar vehículos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="device-search__clear"
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          )}
        </div>

        <AdvancedFiltersButton value={advanced} onApply={handleApplyAdvanced} />
      </div>

      <div className="filter-chips" role="group" aria-label="Filtrar por estado">
        <FilterChip label="Todos" count={devices.length} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <FilterChip label="En línea" count={onlineCount} active={statusFilter === "online"} onClick={() => setStatusFilter("online")} />
        <FilterChip label="Fuera de línea" count={offlineCount} active={statusFilter === "offline"} onClick={() => setStatusFilter("offline")} />
      </div>

      {devices.length === 0 ? (
        <DeviceList devices={[]} positions={positionsMap} selectedDeviceId={selectedDeviceId} onSelectDevice={onSelectDevice} />
      ) : filtered.length === 0 ? (
        <p className="placeholder-note" style={{ position: "static" }}>
          Ningún vehículo coincide con tu búsqueda.
        </p>
      ) : (
        <DeviceList devices={filtered} positions={positionsMap} selectedDeviceId={selectedDeviceId} onSelectDevice={onSelectDevice} />
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filter-chip${active ? " filter-chip--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label} <span className="filter-chip__count">{count}</span>
    </button>
  );
}
