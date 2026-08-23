import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relativeTime";

const NOW = new Date("2026-08-20T12:00:00Z");

function secondsAgo(s: number): string {
  return new Date(NOW.getTime() - s * 1000).toISOString();
}

describe("formatRelativeTime", () => {
  it("menos de 5 segundos: 'Hace instantes'", () => {
    expect(formatRelativeTime(secondsAgo(2), NOW)).toBe("Hace instantes");
  });

  it("segundos: singular/plural correcto", () => {
    expect(formatRelativeTime(secondsAgo(8), NOW)).toBe("Hace 8 segundos");
  });

  it("minutos: 1 es singular, 2+ es plural", () => {
    expect(formatRelativeTime(secondsAgo(60), NOW)).toBe("Hace 1 minuto");
    expect(formatRelativeTime(secondsAgo(180), NOW)).toBe("Hace 3 minutos");
  });

  it("horas y días", () => {
    expect(formatRelativeTime(secondsAgo(3600), NOW)).toBe("Hace 1 hora");
    expect(formatRelativeTime(secondsAgo(3600 * 26), NOW)).toBe("Hace 1 día");
  });

  it("un timestamp inválido no revienta -- cae a un mensaje neutro", () => {
    expect(formatRelativeTime("no-es-una-fecha", NOW)).toBe("Hace un momento");
  });

  it("un timestamp 'futuro' (reloj del cliente adelantado) no muestra negativos", () => {
    const future = new Date(NOW.getTime() + 5000).toISOString();
    expect(formatRelativeTime(future, NOW)).toBe("Hace un momento");
  });
});
