// ==========================================================================
// Theme toggle — modo claro / oscuro con persistencia
// Se ejecuta antes del render visual (ver <script> inline en <head> del
// index.html) para fijar el atributo data-theme y evitar parpadeo (FOUC).
// Este módulo solo conecta el botón una vez el DOM está listo.
// ==========================================================================

const STORAGE_KEY = "traccar-monitor:theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Almacenamiento no disponible (modo privado, etc.) — no es crítico. */
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    const isLight = theme === "light";
    toggle.setAttribute("aria-pressed", String(isLight));
    const label = toggle.querySelector("[data-theme-label]");
    if (label) label.textContent = isLight ? "Modo claro" : "Modo oscuro";
  }
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    setStoredTheme(next);
  });

  // Sincroniza el estado inicial del botón con el tema ya aplicado
  // (fijado de forma síncrona por el script inline en <head>).
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  applyTheme(current);
}

document.addEventListener("DOMContentLoaded", initThemeToggle);
