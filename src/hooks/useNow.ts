import { useEffect, useState } from "react";

/**
 * Reloj de UI puro: fuerza un re-render periódico para que textos como
 * "Hace 8 segundos" sigan avanzando entre sondeos de datos (cada 5s, spine
 * AD-7). NO es una fuente de datos ni compite con AD-7 -- no hace fetch,
 * solo re-renderiza con la hora actual.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
