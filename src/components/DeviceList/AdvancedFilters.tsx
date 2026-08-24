import { useEffect, useState } from "react";
import { DEFAULT_ADVANCED_FILTERS, type AdvancedFiltersValue } from "./advancedFiltersTypes";

// Popover de filtros avanzados (Assets/displayComponentFilters.png). Los
// tres grupos del mockup ya están completos: "Frescura del dato" y
// "Ordenar por" se resolvieron primero con lastUpdate (campo real de
// Device); "Movimiento" y ordenar por "Velocidad" se sumaron acá, una vez
// que useAllPositions trajo la posición de TODOS los vehículos visibles
// (antes solo pedíamos la del seleccionado, AD-7 evolucionada).

interface AdvancedFiltersButtonProps {
  value: AdvancedFiltersValue;
  onApply: (value: AdvancedFiltersValue) => void;
}

export function AdvancedFiltersButton({ value, onApply }: AdvancedFiltersButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFiltersValue>(value);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleOpen() {
    setDraft(value); // el borrador arranca desde lo ya aplicado, no desde cero
    setOpen(true);
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  const isActive = value.freshness !== "all" || value.movement !== "all" || value.sortBy !== "lastUpdate";

  return (
    <div className="advanced-filters">
      <button
        type="button"
        className={`filter-trigger${isActive ? " filter-trigger--active" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? setOpen(false) : handleOpen())}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="visually-hidden">Filtros avanzados</span>
      </button>

      {/* Fondo de cierre -- solo se ve/actúa en móvil (ver .filters-popover-backdrop
          en components.css), donde el popover pasa a ser una hoja de pantalla
          completa; en escritorio queda invisible y no bloquea nada. */}
      {open && <div className="filters-popover-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      {open && (
        <div className="filters-popover" role="dialog" aria-label="Filtros avanzados">
          <div className="filters-popover__header">
            <h3>Filtros</h3>
            <button
              type="button"
              className="filters-popover__close"
              aria-label="Cerrar filtros"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <fieldset className="filters-popover__group">
            <legend>Movimiento</legend>
            <RadioOption
              name="movement"
              label="Todos"
              checked={draft.movement === "all"}
              onChange={() => setDraft((d) => ({ ...d, movement: "all" }))}
            />
            <RadioOption
              name="movement"
              label="En movimiento"
              checked={draft.movement === "moving"}
              onChange={() => setDraft((d) => ({ ...d, movement: "moving" }))}
            />
            <RadioOption
              name="movement"
              label="Detenido"
              checked={draft.movement === "stopped"}
              onChange={() => setDraft((d) => ({ ...d, movement: "stopped" }))}
            />
          </fieldset>

          <fieldset className="filters-popover__group">
            <legend>Frescura del dato</legend>
            <RadioOption
              name="freshness"
              label="Todos"
              checked={draft.freshness === "all"}
              onChange={() => setDraft((d) => ({ ...d, freshness: "all" }))}
            />
            <RadioOption
              name="freshness"
              label="Actualizado recientemente"
              checked={draft.freshness === "recent"}
              onChange={() => setDraft((d) => ({ ...d, freshness: "recent" }))}
            />
            <RadioOption
              name="freshness"
              label="Dato desactualizado"
              checked={draft.freshness === "stale"}
              onChange={() => setDraft((d) => ({ ...d, freshness: "stale" }))}
            />
          </fieldset>

          <fieldset className="filters-popover__group">
            <legend>Ordenar por</legend>
            <RadioOption
              name="sortBy"
              label="Última actualización"
              checked={draft.sortBy === "lastUpdate"}
              onChange={() => setDraft((d) => ({ ...d, sortBy: "lastUpdate" }))}
            />
            <RadioOption
              name="sortBy"
              label="Nombre"
              checked={draft.sortBy === "name"}
              onChange={() => setDraft((d) => ({ ...d, sortBy: "name" }))}
            />
            <RadioOption
              name="sortBy"
              label="Velocidad"
              checked={draft.sortBy === "speed"}
              onChange={() => setDraft((d) => ({ ...d, sortBy: "speed" }))}
            />
          </fieldset>

          <div className="filters-popover__actions">
            <button type="button" className="filters-popover__link" onClick={() => setDraft(DEFAULT_ADVANCED_FILTERS)}>
              Quitar filtros avanzados
            </button>
            <button type="button" className="btn btn--primary" onClick={handleApply}>
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RadioOption({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="radio-option">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
