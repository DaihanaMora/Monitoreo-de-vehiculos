import { useEffect, useState } from "react";

/**
 * Fase 8 — distingue "tu propia conexión a Internet cayó" (proactivo, vía
 * los eventos online/offline del navegador) de "Traccar no responde"
 * (reactivo, vía TraccarError -- AD-4). Son dos problemas distintos y el
 * operador necesita saber cuál es cuál.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
