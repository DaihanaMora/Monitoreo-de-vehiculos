// ==========================================================================
// Adaptador Docker/Express — sirve el build estático de Vite (dist/) y la
// misma ruta de proxy que la función de Vercel, reusando la única
// implementación en api/_lib/traccarProxy.js. Este servidor existe por
// PORTABILIDAD (correr el proyecto sin depender de la plataforma de
// Vercel), NO reemplaza a Vercel como destino de producción — ese sigue
// siendo Vercel Hobby (spine: decisión de plataforma sin costo).
// ==========================================================================

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proxyTraccarRequest } from "../api/_lib/traccarProxy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Captura el cuerpo crudo tal cual llegó (sin parseo/reencodeo) para
// cualquier content-type — el proxy solo reenvía bytes, nunca los
// reinterpreta.
app.use("/api/traccar", express.raw({ type: () => true, limit: "1mb" }));

app.all("/api/traccar/*path", async (req, res) => {
  const pathSegments = Array.isArray(req.params.path) ? req.params.path : [];
  const queryIndex = req.url.indexOf("?");
  const search = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  const rawBody = Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body : undefined;

  const result = await proxyTraccarRequest({
    method: req.method,
    pathSegments,
    search,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : rawBody,
  });

  res.status(result.status);
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  res.send(result.body);
});

app.use(express.static(distDir));

// Fallback SPA: cualquier ruta que no sea /api/* ni un archivo estático
// existente devuelve index.html (relevante si más adelante se agrega
// enrutamiento del lado del cliente).
app.get("*path", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Servidor listo en http://localhost:${port}`);
});
