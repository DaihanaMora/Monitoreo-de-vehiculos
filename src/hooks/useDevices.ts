import { useCallback, useEffect, useState } from "react";
import { getDevices, TraccarError, type Device } from "../lib/traccarClient";
import type { AsyncState } from "./asyncState";

/** Fase 4 — lista de dispositivos. Devuelve la forma canónica AD-13. */
export function useDevices() {
  const [state, setState] = useState<AsyncState<Device[]>>({ status: "idle" });

  const fetchDevices = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await getDevices();
      setState({ status: "success", data });
    } catch (err) {
      const error =
        err instanceof TraccarError ? err : new TraccarError("unknown", "Ocurrió un error inesperado.");
      setState({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    // Sincronización legítima con un sistema externo (red), no un valor
    // derivable durante el render — el patrón de fetch-en-efecto que React
    // mismo documenta. oxlint no puede distinguir esto de un efecto
    // redundante, de ahí el disable puntual.
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchDevices();
  }, [fetchDevices]);

  return { ...state, refetch: fetchDevices };
}
