// Tipos + valor por defecto separados de AdvancedFilters.tsx a propósito:
// un archivo que exporta un componente Y una constante de valor rompe el
// Fast Refresh de oxlint (react/only-export-components), mismo ajuste que
// ya se hizo para AuthContext/AuthProvider en Fase 3.

export type Freshness = "all" | "recent" | "stale";
export type Movement = "all" | "moving" | "stopped";
export type SortKey = "lastUpdate" | "name" | "speed";

export interface AdvancedFiltersValue {
  freshness: Freshness;
  movement: Movement;
  sortBy: SortKey;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedFiltersValue = {
  freshness: "all",
  movement: "all",
  sortBy: "lastUpdate",
};
