import { useEffect, useRef, useState } from "react";
import type { TraccarUser } from "../../lib/traccarClient";

// Reemplaza el texto "Central de operaciones · {nombre}" + botón "Cerrar
// sesión" sueltos en el header (pedido explícito de Daihana: quitar el
// nombre visible, usar un avatar con desplegable). El nombre/correo no se
// pierden -- se mudan adentro del desplegable, que es donde tiene sentido
// mirarlos (identidad de la cuenta activa), no ocupando espacio fijo en el
// header todo el tiempo. Mismo patrón de interacción que AdvancedFilters
// (popover con Escape para cerrar), más click-afuera porque un menú de
// cuenta sí lo amerita (no tiene un botón "×" propio como los filtros).

interface UserMenuProps {
  user: TraccarUser | null;
  onLogout: () => void;
}

function initialsFor(user: TraccarUser | null): string {
  if (!user) return "?";
  const source = user.name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const displayName = user?.name || user?.email || "Cuenta";

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${displayName}`}
        onClick={() => setOpen((v) => !v)}
      >
        {initialsFor(user)}
      </button>

      {open && (
        <div className="user-menu__popover" role="menu" aria-label="Menú de cuenta">
          <div className="user-menu__identity">
            <span className="user-menu__name">{user?.name}</span>
            <span className="user-menu__email">{user?.email}</span>
          </div>
          <div className="user-menu__divider" role="none" />
          <button
            type="button"
            role="menuitem"
            className="user-menu__logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
