import { useCallback, useState } from "react";

// ==========================================================================
// useTheme — hook independiente de tema claro/oscuro (spine AD-8 + AD-11).
//
// Deliberadamente NO usa React Context: el atributo data-theme en <html> ya
// se fija de forma síncrona por el script inline en index.html <head>, antes
// de que React monte, para evitar parpadeo (FOUC). Este hook solo lee ese
// estado ya aplicado y expone una forma de cambiarlo; cualquier componente
// que necesite el tema actual llama useTheme() directamente.
// ==========================================================================

export type Theme = "dark" | "light";

const STORAGE_KEY = "traccar-monitor:theme";

function readCurrentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Almacenamiento no disponible (modo privado, etc.) — no es crítico. */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readCurrentTheme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
