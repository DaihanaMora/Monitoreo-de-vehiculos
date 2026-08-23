import { useCallback, useMemo, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, type TraccarUser } from "../lib/traccarClient";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TraccarUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await apiLogin(email, password); // lanza TraccarError si falla
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
