// ==========================================================================
// Cliente de la API de Traccar (vía el proxy same-origin /api/traccar/*)
// ==========================================================================
//
// Autenticación: HTTP Basic Auth en cada petición (en vez de depender de la
// cookie de sesión). Es más simple y robusto a través de una función
// serverless sin estado: no hay que reenviar/parsear Set-Cookie entre el
// navegador y Traccar. Aun así, seguimos el flujo pedido por el enunciado:
// primero POST /api/session (valida credenciales y trae el usuario), y
// luego el resto de llamadas usan las mismas credenciales vía Basic Auth.
//
// Las credenciales viven solo en memoria (variable de módulo), nunca en
// localStorage/sessionStorage: si se recarga la página, se pide login de nuevo.

const PROXY_BASE = "/api/traccar";

/** Error tipado para que la UI (Fase 3) pueda distinguir el estado exacto. */
export class TraccarError extends Error {
  /**
   * @param {"invalid_credentials"|"upstream_unreachable"|"upstream_timeout"|"network_error"|"unknown"} kind
   * @param {string} message
   * @param {number} [status]
   */
  constructor(kind, message, status) {
    super(message);
    this.name = "TraccarError";
    this.kind = kind;
    this.status = status;
  }
}

let credentials = null; // { email, password } — en memoria únicamente

function authHeader() {
  if (!credentials) return {};
  const token = btoa(`${credentials.email}:${credentials.password}`);
  return { Authorization: `Basic ${token}` };
}

/**
 * Ejecuta una petición contra el proxy y normaliza los errores posibles
 * (credenciales inválidas, servidor Traccar caído/lento, sin red local).
 */
async function request(path, { method = "GET", body, formEncoded = false } = {}) {
  let response;
  try {
    response = await fetch(`${PROXY_BASE}/${path}`, {
      method,
      headers: {
        ...authHeader(),
        ...(body ? { "Content-Type": formEncoded ? "application/x-www-form-urlencoded" : "application/json" } : {}),
      },
      body: body ? (formEncoded ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    // fetch rechaza por falta de red del propio navegador (no llegó ni a Vercel)
    throw new TraccarError("network_error", "No hay conexión de red. Revisa tu internet e inténtalo de nuevo.");
  }

  if (response.status === 502) {
    const payload = await response.json().catch(() => ({}));
    throw new TraccarError(
      payload.error === "upstream_timeout" ? "upstream_timeout" : "upstream_unreachable",
      payload.message || "El servidor de Traccar no está disponible en este momento."
    );
  }

  if (response.status === 401) {
    throw new TraccarError("invalid_credentials", "Correo o contraseña incorrectos.", 401);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TraccarError("unknown", text || `Error inesperado (HTTP ${response.status}).`, response.status);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

/**
 * Paso 1 del flujo: autenticar contra POST /api/session.
 * Guarda las credenciales en memoria para las siguientes llamadas.
 * @returns {Promise<object>} el objeto de usuario que devuelve Traccar
 */
export async function login(email, password) {
  credentials = { email, password };
  try {
    const user = await request("session", {
      method: "POST",
      formEncoded: true,
      body: new URLSearchParams({ email, password }).toString(),
    });
    return user;
  } catch (err) {
    credentials = null; // no dejamos credenciales inválidas "pegadas" en memoria
    throw err;
  }
}

export function logout() {
  credentials = null;
}

export function isAuthenticated() {
  return credentials !== null;
}

/** Paso 2: lista de dispositivos visibles para el usuario autenticado. */
export function getDevices() {
  return request("devices");
}

/**
 * Paso 3: posición actual de un dispositivo.
 * Traccar devuelve un arreglo (normalmente con la última posición conocida).
 * @param {number} deviceId
 * @returns {Promise<object|null>} la posición más reciente, o null si no hay ninguna
 */
export async function getLatestPosition(deviceId) {
  const positions = await request(`positions?deviceId=${encodeURIComponent(deviceId)}`);
  if (!Array.isArray(positions) || positions.length === 0) return null;
  return positions[positions.length - 1];
}
