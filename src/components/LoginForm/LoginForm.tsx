import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { TraccarError } from "../../lib/traccarClient";
import { ErrorPanel } from "../ErrorPanel/ErrorPanel";
import { Logo } from "../Logo/Logo";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<TraccarError | null>(null);

  async function attemptLogin() {
    setStatus("loading");
    setError(null);
    try {
      await login(email, password);
      // éxito: AuthProvider actualiza `user`, App.tsx re-renderiza fuera del login
    } catch (err) {
      setStatus("error");
      setError(err instanceof TraccarError ? err : new TraccarError("unknown", "Ocurrió un error inesperado."));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void attemptLogin();
  }

  const isLoading = status === "loading";

  return (
    <div className="login-screen">
      <Logo className="login-screen__logo" height="3rem" />

      <form className="login-form" onSubmit={handleSubmit} aria-busy={isLoading}>
        <h1 className="login-form__title">Iniciar sesión</h1>
        <p className="login-form__subtitle">Accede a la sala de monitoreo de tu flota.</p>

        <label className="field">
          <span className="field__label">Correo</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Contraseña</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {/* Antes el botón se reemplazaba por un Skeleton genérico al
            enviar -- perdía la forma/color del botón y no comunicaba QUÉ
            estaba pasando, solo "algo carga". Ahora el botón se queda,
            se deshabilita, y muestra un spinner + texto de estado --
            pedido explícito de Daihana ("loading al iniciar sesión en
            el botón"). */}
        <button type="submit" className="btn btn--primary" disabled={isLoading} aria-busy={isLoading}>
          {isLoading && <span className="spinner" aria-hidden="true" />}
          {isLoading ? "Iniciando sesión…" : "Entrar"}
        </button>
        <span className="visually-hidden" aria-live="polite">
          {isLoading ? "Verificando credenciales…" : ""}
        </span>

        {status === "error" && error && (
          <ErrorPanel
            error={error}
            title="No se pudo iniciar sesión"
            onRetry={error.kind !== "invalid_credentials" ? () => void attemptLogin() : undefined}
          />
        )}
      </form>
    </div>
  );
}
