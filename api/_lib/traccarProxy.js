// ==========================================================================
// Lógica del proxy hacia Traccar — ÚNICA implementación, agnóstica de
// transporte (spine: nueva AD sobre "una sola fuente de verdad para el
// proxy"). Dos adaptadores delgados la consumen:
//   - api/traccar/[...path].js  → función serverless de Vercel (producción)
//   - server/index.js           → servidor Express dentro del contenedor
//                                  Docker (portabilidad/desarrollo local)
// Ninguno de los dos reimplementa el manejo de timeout/errores por su
// cuenta; ambos llaman a proxyTraccarRequest() y solo traducen su propio
// req/res nativo hacia/desde esta forma neutral.
// ==========================================================================

const DEFAULT_SERVER = "https://demo4.traccar.org";
const REQUEST_TIMEOUT_MS = 10000;

/**
 * @param {object} input
 * @param {string} input.method
 * @param {string[]} input.pathSegments  ej. ["devices"] o ["positions"]
 * @param {string} input.search          query string crudo, incluye "?" o ""
 * @param {Record<string,string|string[]|undefined>} input.headers  headers entrantes (claves en minúscula)
 * @param {Buffer|string|undefined} input.body
 * @returns {Promise<{status:number, headers:Record<string,string>, body:string}>}
 */
export async function proxyTraccarRequest({ method, pathSegments, search, headers, body }) {
  const serverUrl = (process.env.TRACCAR_SERVER_URL || DEFAULT_SERVER).replace(/\/+$/, "");
  const upstreamPath = pathSegments.join("/");
  const targetUrl = `${serverUrl}/api/${upstreamPath}${search}`;

  const outHeaders = { Accept: "application/json" };
  if (headers.authorization) outHeaders.Authorization = headers.authorization;
  if (headers["content-type"]) outHeaders["Content-Type"] = headers["content-type"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: outHeaders,
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    return {
      status: upstream.status,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
      body: text,
    };
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err && err.name === "AbortError";
    return {
      status: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        error: isTimeout ? "upstream_timeout" : "upstream_unreachable",
        message: isTimeout
          ? "El servidor de Traccar no respondió a tiempo."
          : "No se pudo contactar al servidor de Traccar (posible caída del servicio o bloqueo de red).",
      }),
    };
  }
}
