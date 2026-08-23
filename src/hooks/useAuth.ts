import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

// Spine AD-3: único punto de lectura/escritura de credenciales para el
// resto de la app. Ningún componente debe leer AuthContext directamente.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
