import { createContext } from "react";
import type { TraccarUser } from "../lib/traccarClient";

// Contexto puro (sin componente) — spine AD-3: azúcar delgado sobre la
// variable de módulo en lib/traccarClient.ts, que es la única fuente de
// verdad de las credenciales. Separado de AuthProvider.tsx para que
// oxlint's react-refresh/only-export-components no mezcle un componente
// con exports no-componente en el mismo archivo.
export interface AuthContextValue {
  user: TraccarUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
