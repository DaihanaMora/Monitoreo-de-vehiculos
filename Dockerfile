# ==========================================================================
# Dockerfile — portabilidad, NO es el destino de producción (ese sigue
# siendo Vercel Hobby, gratis, sin tarjeta). Dos targets:
#   - dev  : servidor de Vite con hot-reload, para correr todo el proyecto
#            sin instalar Node localmente.
#   - prod : build estático + server/index.js (Express) sirviendo dist/ y
#            el mismo proxy que la función de Vercel — útil para probar
#            "producción" de forma reproducible en cualquier máquina.
# Node 22.x en todas las etapas, consistente con el runtime pinneado para
# las funciones de Vercel (spine — Node 20 deja de aceptar despliegues
# nuevos el 1 de octubre de 2026).
# ==========================================================================

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS deps
RUN npm ci

# ---- dev: hot-reload, monta el código como volumen (ver docker-compose.yml) ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build: compila el bundle estático ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod-deps: solo dependencias de producción (sin devDependencies) ----
FROM base AS prod-deps
RUN npm ci --omit=dev

# ---- prod: imagen final, mínima ----
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server
COPY api/_lib ./api/_lib
EXPOSE 8080
CMD ["node", "server/index.js"]
