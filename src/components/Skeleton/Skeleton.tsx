// Primitivo reutilizable de "cargando" (spine — README Fase 3: "estado de
// carga (skeleton)"). Fase 3 lo usa en el formulario de login; Fases 4-6 lo
// reutilizan para la lista de dispositivos, el mapa y la tarjeta de estado
// en vez de que cada una invente su propio shimmer.

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}

export function Skeleton({ width = "100%", height = "1rem", radius = "var(--radius-md)", className }: SkeletonProps) {
  return (
    <span
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
