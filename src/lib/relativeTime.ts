// Formateador puro de tiempo relativo en español — sin dependencias de
// Leaflet/React, fácil de probar. "hace 1 minuto" (singular) vs "hace 2
// minutos" (plural) importa para que no suene mal en la tarjeta de estado.

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return "Hace un momento";

  const diffMs = now.getTime() - then;
  if (diffMs < 0) return "Hace un momento"; // reloj del cliente ligeramente adelantado

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "Hace instantes";
  if (seconds < 60) return `Hace ${seconds} ${plural(seconds, "segundo", "segundos")}`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} ${plural(minutes, "minuto", "minutos")}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${plural(hours, "hora", "horas")}`;

  const days = Math.floor(hours / 24);
  return `Hace ${days} ${plural(days, "día", "días")}`;
}
