import type { Plugin, Connect } from "vite";

// ==========================================================================
// Simulador de posición GPS -- SOLO PARA DESARROLLO LOCAL, nunca producción.
//
// Por qué existe fuera de api/_lib/traccarProxy.js (AD-14): ese archivo es
// la ÚNICA lógica de proxy hacia la API REST/autenticada de Traccar, y debe
// seguir siéndolo -- mezclar aquí un generador de datos falsos diluiría esa
// garantía. Este plugin habla un protocolo COMPLETAMENTE distinto (OsmAnd,
// puerto 5055, sin autenticación) que ni siquiera pasa por
// `api/traccar/[...path].js` ni por `server/index.js`.
//
// Por qué es dev-only (`apply: 'serve'`, nunca corre en `vite build`): un
// panel de monitoreo de flota real NUNCA debe tener, en producción, un
// endpoint que le permita a cualquiera inyectar posiciones falsas en un
// sistema de tracking real -- eso sería un problema de integridad de datos,
// no una conveniencia. Aquí es aceptable porque es exclusivamente para
// demostrar/probar la app contra el servidor demo de Traccar en local.
//
// Qué hace: recibe { uniqueId, lat, lon, speed, bearing } por POST y arma la
// misma petición GET que ya usa scripts/simulate-gps.sh contra el puerto
// 5055 del servidor Traccar configurado (TRACCAR_SERVER_URL, mismo que usa
// el proxy real) -- un solo ping por llamada; la UI es quien decide repetir
// la llamada cada pocos segundos para simular movimiento continuo.
// ==========================================================================

const DEFAULT_SERVER = "https://demo4.traccar.org";
const OSMAND_PORT = 5055;

function osmandHost(): string {
  const raw = process.env.TRACCAR_SERVER_URL || DEFAULT_SERVER;
  return new URL(raw).hostname;
}

interface SimulatePayload {
  uniqueId: string;
  lat: number;
  lon: number;
  speed?: number;
  bearing?: number;
}

function isSimulatePayload(value: unknown): value is SimulatePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.uniqueId === "string" && typeof v.lat === "number" && typeof v.lon === "number";
}

export function gpsSimulatorPlugin(): Plugin {
  return {
    name: "gps-simulator-dev-only",
    apply: "serve", // NUNCA se registra en `vite build` -- no existe en el bundle de producción
    configureServer(server) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        if (req.method !== "POST") return next();

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf-8");
              const parsed: unknown = raw ? JSON.parse(raw) : null;
              if (!isSimulatePayload(parsed)) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "bad_request", message: "Se requieren uniqueId (string), lat y lon (number)." }));
                return;
              }

              const { uniqueId, lat, lon, speed = 12, bearing = 45 } = parsed;
              const url =
                `http://${osmandHost()}:${OSMAND_PORT}/?id=${encodeURIComponent(uniqueId)}` +
                `&lat=${lat}&lon=${lon}&speed=${speed}&bearing=${bearing}&timestamp=${Math.floor(Date.now() / 1000)}`;

              const upstream = await fetch(url);
              res.statusCode = upstream.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: upstream.ok, upstreamStatus: upstream.status }));
            } catch (err) {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "upstream_unreachable", message: String(err) }));
            }
          })();
        });
      };

      server.middlewares.use("/api/dev/simulate-position", handler);
    },
  };
}
