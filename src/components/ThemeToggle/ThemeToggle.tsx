import { useTheme } from "../../hooks/useTheme";

/**
 * Toggle de modo claro/oscuro. Anillo de foco de alto contraste heredado de
 * :focus-visible en base.css (spine AD-10) — sin outline:none.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={isLight}
      aria-label="Cambiar entre modo claro y modo oscuro"
      onClick={toggleTheme}
    >
      <svg
        className="theme-toggle__icon theme-toggle__icon--sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M17.99 17.99l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M17.99 6.01l1.06-1.06"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4.5" />
      </svg>
      <svg
        className="theme-toggle__icon theme-toggle__icon--moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path
          d="M20.5 14.5a8.5 8.5 0 1 1-9-11 7 7 0 0 0 9 11Z"
          strokeLinejoin="round"
        />
      </svg>
      <span>{isLight ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
