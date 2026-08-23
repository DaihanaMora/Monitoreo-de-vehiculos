// ==========================================================================
// Adaptador Vercel — función serverless (Node runtime, pinneado a 22.x en
// infra/main.tf y vercel.json). Es un traductor delgado: extrae el request
// nativo de Vercel y llama a la única lógica de proxy compartida en
// api/_lib/traccarProxy.js. No reimplementa timeout ni normalización de
// errores aquí (ver esa lógica ahí).
// ==========================================================================

import { proxyTraccarRequest } from "../_lib/traccarProxy.js";

// Prefijo fijo del punto de montaje de esta función (coincide con la
// carpeta real: api/traccar/[...path].js sirve todo bajo /api/traccar/).
const MOUNT_PREFIX = "/api/traccar/";

/**
 * Deriva los segmentos de la ruta dinámica directamente de `req.url` en vez
 * de `req.query.path` -- bug real encontrado en producción (Vercel, en este
 * proyecto, nombra el parámetro de ruta dinámica como "...path" -- con los
 * tres puntos incluidos -- en vez de "path", así que req.query.path siempre
 * llegaba `undefined` y la ruta enviada a Traccar quedaba vacía, causando
 * 404 en TODO login/consulta ya desplegado. Confirmado con un endpoint de
 * diagnóstico temporal que expuso el req.url crudo. Parsear el propio
 * req.url es inmune a cómo cada entorno nombre el parámetro -- mismo
 * enfoque que ya usa vite-plugin-traccar-proxy.ts para el adaptador de
 * desarrollo local (spine AD-14: misma forma de resolver la ruta en los
 * tres adaptadores, no una lógica distinta por entorno).
 */
function pathSegmentsFromUrl(url) {
  const queryIndex = url.indexOf("?");
  const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  const afterMount = pathname.startsWith(MOUNT_PREFIX) ? pathname.slice(MOUNT_PREFIX.length) : "";
  return afterMount.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
}

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const segments = pathSegmentsFromUrl(req.url);
  const queryIndex = req.url.indexOf("?");
  const search = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

  const result = await proxyTraccarRequest({
    method: req.method,
    pathSegments: segments,
    search,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : serializeBody(req),
  });

  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  res.status(result.status).send(result.body);
}
