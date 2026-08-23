// ==========================================================================
// Cliente tipado de la API de Traccar (vía el proxy same-origin
// /api/traccar/* — spine AD-2/AD-14, nunca directo a Traccar).
//
// Autenticación: HTTP Basic por petición (spine AD-3). Las credenciales
// viven SOLO en esta variable de módulo, que es la única fuente de verdad;
// useAuth() (src/hooks/useAuth.tsx) es el único punto de lectura/escritura
// para el resto de la app. Nunca se persisten en localStorage/sessionStorage
// — recargar la página siempre exige volver a iniciar sesión.
// ==========================================================================

const PROXY_BASE = "/api/traccar";
const KNOTS_TO_KMH = 1.852;

export type TraccarErrorKind =
  | "invalid_credentials"
  | "upstream_unreachable"
  | "upstream_timeout"
  | "network_error"
  | "unknown";

/** Error tipado (spine AD-4) — la UI conmuta sobre `kind`, nunca sobre el texto del mensaje. */
export class TraccarError extends Error {
  kind: TraccarErrorKind;
  status?: number;

  constructor(kind: TraccarErrorKind, message: string, status?: number) {
    super(message);
    this.name = "TraccarError";
    this.kind = kind;
    this.status = status;
  }
}

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
}

/** Forma fija que cruza el límite del adaptador — spine AD-5. */
export interface Device {
  id: number;
  name: string;
  /** Enum crudo de Traccar ("online"|"offline"|"unknown"), sin normalizar. */
  status: string;
  /**
   * Timestamp ISO 8601 del último contacto del dispositivo (campo real de
   * Traccar, verificado contra su OpenAPI — nullable). Se agrega para el
   * filtro de "frescura del dato" y el orden "Última actualización" del
   * rediseño; no requiere ningún cambio en getDevices(), Traccar ya lo
   * manda en la respuesta cruda.
   */
  lastUpdate: string | null;
  /**
   * Identificador único de hardware del dispositivo (campo real de
   * Traccar, camelCase confirmado contra su documentación — siempre
   * presente, es cómo el dispositivo se autentica). Se agrega para la
   * tarjeta flotante de detalles del rediseño ("DEVICE ID" en el mockup).
   */
  uniqueId: string;
}

/** Forma fija que cruza el límite del adaptador — spine AD-5. */
export interface Position {
  latitude: number;
  longitude: number;
  /** Rumbo en grados (0-359). */
  course: number;
  /** Ya convertida — nunca se expone el valor crudo en nudos. */
  speedKmh: number;
  fixTime: string;
}

interface RawPosition {
  latitude: number;
  longitude: number;
  course: number;
  speed: number; // nudos, crudo de Traccar
  fixTime: string;
}

interface RawPositionWithDevice extends RawPosition {
  deviceId: number;
}

let credentials: { email: string; password: string } | null = null;

function authHeader(): Record<string, string> {
  if (!credentials) return {};
  const token = btoa(`${credentials.email}:${credentials.password}`);
  return { Authorization: `Basic ${token}` };
}

interface RequestOptions {
  method?: string;
  body?: string;
  formEncoded?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formEncoded = false } = options;

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/${path}`, {
      method,
      headers: {
        ...authHeader(),
        ...(body ? { "Content-Type": formEncoded ? "application/x-www-form-urlencoded" : "application/json" } : {}),
      },
      body,
    });
  } catch {
    // fetch rechaza por falta de red del propio navegador (no llegó ni al proxy)
    throw new TraccarError("network_error", "No hay conexión de red. Revisa tu internet e inténtalo de nuevo.");
  }

  // IMPORTANTE: el status se revisa ANTES de intentar parsear el cuerpo como
  // JSON. El servidor demo de Traccar responde un 401 con un stack trace de
  // Java en texto plano, no JSON — un response.json() a ciegas aquí
  // reventaría justo en el caso que este bloque existe para atrapar
  // (hallazgo real, verificado corriendo el proxy en Docker contra
  // demo4.traccar.org — ver spine, sección Deferred).
  if (response.status === 401) {
    throw new TraccarError("invalid_credentials", "Correo o contraseña incorrectos.", 401);
  }

  if (response.status === 502) {
    const payload: { error?: string; message?: string } = await response.json().catch(() => ({}));
    throw new TraccarError(
      payload.error === "upstream_timeout" ? "upstream_timeout" : "upstream_unreachable",
      payload.message || "El servidor de Traccar no está disponible en este momento.",
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TraccarError("unknown", text || `Error inesperado (HTTP ${response.status}).`, response.status);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

/**
 * Paso 1 del flujo: autenticar contra POST /api/session.
 * Guarda las credenciales en memoria para las siguientes llamadas.
 */
export async function login(email: string, password: string): Promise<TraccarUser> {
  credentials = { email, password };
  try {
    return await request<TraccarUser>("session", {
      method: "POST",
      formEncoded: true,
      body: new URLSearchParams({ email, password }).toString(),
    });
  } catch (err) {
    credentials = null; // no dejamos credenciales inválidas "pegadas" en memoria
    throw err;
  }
}

export function logout(): void {
  credentials = null;
}

export function isAuthenticated(): boolean {
  return credentials !== null;
}

/** Lista de dispositivos visibles para el usuario autenticado. */
export function getDevices(): Promise<Device[]> {
  return request<Device[]>("devices");
}

/**
 * Posición más reciente de un dispositivo — convierte nudos a km/h aquí
 * (única vez, spine AD-5) y colapsa "sin posición reportada aún" a `null`,
 * un éxito válido, no un error (spine AD-13).
 */
export async function getLatestPosition(deviceId: number): Promise<Position | null> {
  const positions = await request<RawPosition[]>(`positions?deviceId=${encodeURIComponent(deviceId)}`);
  if (!Array.isArray(positions) || positions.length === 0) return null;

  const raw = positions[positions.length - 1];
  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    course: raw.course,
    speedKmh: raw.speed * KNOTS_TO_KMH,
    fixTime: raw.fixTime,
  };
}

/**
 * Última posición conocida de TODOS los dispositivos visibles, en una sola
 * llamada — Traccar sirve `GET /api/positions` sin `deviceId` desde caché
 * en el servidor y devuelve una posición por dispositivo (comportamiento
 * verificado contra la documentación oficial antes de construir esto, no
 * asumido). Alimenta el mapa, la tarjeta de estado Y las tarjetas de la
 * lista de dispositivos (velocidad, movimiento) desde el mismo sondeo —
 * spine AD-7 evolucionada: un solo dueño, un solo fetch, no uno por
 * dispositivo.
 */
export async function getAllPositions(): Promise<Map<number, Position>> {
  const raw = await request<RawPositionWithDevice[]>("positions");
  const positions = new Map<number, Position>();
  if (!Array.isArray(raw)) return positions;

  for (const item of raw) {
    positions.set(item.deviceId, {
      latitude: item.latitude,
      longitude: item.longitude,
      course: item.course,
      speedKmh: item.speed * KNOTS_TO_KMH,
      fixTime: item.fixTime,
    });
  }
  return positions;
}
