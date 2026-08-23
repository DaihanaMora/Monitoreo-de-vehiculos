import type { Plugin, Connect } from "vite";
import { proxyTraccarRequest } from "./api/_lib/traccarProxy.js";

// ==========================================================================
// Tercer adaptador delgado sobre la ÚNICA lógica de proxy (spine AD-14),
// esta vez para `npm run dev` (Vite plano). Sin este plugin, `vite dev` no
// sabe nada de `api/traccar/[...path].js` — esa carpeta solo la ejecuta el
// runtime de Vercel (o `vercel dev`) — así que cualquier login contra
// localhost:5174 devolvía 404 en silencio. Bug real, encontrado por la
// usuaria al intentar loguearse de verdad (no detectado antes porque solo
// se había probado la carga del HTML estático en `vite dev`, y el flujo de
// login completo solo contra Docker/prod y contra fetch mockeado en tests).
// ==========================================================================

export function traccarDevProxyPlugin(): Plugin {
  return {
    name: "traccar-dev-proxy",
    configureServer(server) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        if (!req.url) return next();

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          void (async () => {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            // req.url aquí ya viene RELATIVO al punto de montaje ("/session",
            // no "/api/traccar/session") — mismo shape que espera el resto
            // del proxy compartido.
            const url = new URL(req.url!, "http://localhost");
            const pathSegments = url.pathname.split("/").filter(Boolean);
            const method = req.method || "GET";

            const result = await proxyTraccarRequest({
              method,
              pathSegments,
              search: url.search,
              headers: req.headers as Record<string, string>,
              body: ["GET", "HEAD"].includes(method) ? undefined : body,
            });

            res.statusCode = result.status;
            for (const [key, value] of Object.entries(result.headers)) {
              res.setHeader(key, value);
            }
            res.end(result.body);
          })();
        });
      };

      server.middlewares.use("/api/traccar", handler);
    },
  };
}
