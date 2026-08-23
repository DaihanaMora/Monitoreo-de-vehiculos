// ==========================================================================
// Adaptador Vercel — función serverless (Node runtime, pinneado a 22.x en
// infra/main.tf y vercel.json). Es un traductor delgado: extrae el request
// nativo de Vercel y llama a la única lógica de proxy compartida en
// api/_lib/traccarProxy.js. No reimplementa timeout ni normalización de
// errores aquí (ver esa lógica ahí).
// ==========================================================================

import { proxyTraccarRequest } from "../_lib/traccarProxy.js";

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

  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const queryIndex = req.url.indexOf("?");
  const search = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

  // ---- DIAGNÓSTICO TEMPORAL (quitar en cuanto se confirme la causa del
  // 404 en producción) -- ?debug=1 devuelve lo que Vercel REALMENTE le
  // pasa a esta función en vez de reenviar a Traccar, para confirmar si
  // req.query.path llega poblado como se espera. ----
  if (req.query.debug === "1") {
    res.status(200).json({
      rawUrl: req.url,
      queryPath: req.query.path ?? null,
      derivedSegments: segments,
      derivedUpstreamPath: segments.join("/"),
      serverUrlEnv: process.env.TRACCAR_SERVER_URL ?? null,
    });
    return;
  }

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
