// ==========================================================================
// Proxy CORS-safe hacia la API de Traccar (Vercel Serverless Function)
// ==========================================================================
//
// El navegador NUNCA llama directamente a demo4.traccar.org (eso dispararía
// bloqueos de CORS, como advierte el enunciado de la prueba). En su lugar,
// llama a rutas propias same-origin: /api/traccar/session, /api/traccar/
// devices, /api/traccar/positions, etc. Esta función reenvía la petición
// servidor-a-servidor (sin restricción de CORS) y devuelve la respuesta de
// Traccar tal cual, agregando manejo de timeout y errores de red legibles.
//
// Variable de entorno opcional:
//   TRACCAR_SERVER_URL   Servidor Traccar de destino.
//                        Por defecto: https://demo4.traccar.org
//
// Nota: no hay credenciales aquí. La app usa HTTP Basic Auth por petición
// (ver js/api.js) — este proxy solo reenvía el header Authorization que ya
// trae la petición del navegador, nunca almacena ni conoce contraseñas.

const DEFAULT_SERVER = "https://demo4.traccar.org";
const REQUEST_TIMEOUT_MS = 10000;

function serializeBody(req) {
  const contentType = req.headers["content-type"] || "";
  if (req.body === undefined || req.body === null || req.body === "") return undefined;
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(req.body).toString();
  }
  return JSON.stringify(req.body);
}

module.exports = async (req, res) => {
  // CORS permisivo: útil si en algún momento se sirve el frontend desde un
  // origen distinto (p. ej. un servidor estático local mientras se prueba).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const serverUrl = (process.env.TRACCAR_SERVER_URL || DEFAULT_SERVER).replace(/\/+$/, "");
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const upstreamPath = segments.join("/");
  const queryIndex = req.url.indexOf("?");
  const search = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  const targetUrl = `${serverUrl}/api/${upstreamPath}${search}`;

  const headers = { Accept: "application/json" };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : serializeBody(req),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err && err.name === "AbortError";
    res.status(502).json({
      error: isTimeout ? "upstream_timeout" : "upstream_unreachable",
      message: isTimeout
        ? "El servidor de Traccar no respondió a tiempo."
        : "No se pudo contactar al servidor de Traccar (posible caída del servicio o bloqueo de red).",
    });
  }
};
