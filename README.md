# Monitor de Vehículo en Tiempo Real — Control Room

Prueba técnica — Design Engineer (UX/UI). SPA que se conecta a la API pública
de [Traccar](https://www.traccar.org/) para autenticarse, listar dispositivos,
seleccionarlos y visualizar su posición en tiempo real sobre un mapa
interactivo, junto a una tarjeta de estado accesible y pulida.

> Reinicio de stack: el proyecto se reescribió desde cero sobre React + Vite
> + TypeScript (ver decisión y trade-offs en la spine de arquitectura). El
> proxy serverless hacia Traccar se conservó tal cual, por ser Node puro,
> independiente del framework del frontend.

## Estado del desarrollo

- [x] **Fase 1 — Scaffold + sistema de diseño**: proyecto Vite + React 19 +
      TypeScript, tokens de diseño (color, tipografía, espaciado, sombras,
      movimiento) para modo claro/oscuro ya con la dirección visual final
      ("Calma Operativa" — superficies suavizadas, tipografía Manrope), shell
      de la app con toggle de tema funcional.
- [x] **Fase 2 — Proxy serverless (CORS-safe)**: lógica del proxy extraída a
      `api/_lib/traccarProxy.js` (única implementación); `api/traccar/[...path].js`
      es el adaptador delgado para Vercel.
- [x] **Fase 2.5 — Portabilidad (Docker) + IaC**: `Dockerfile` multi-stage
      (dev/build/prod) + `docker-compose.yml`, con `server/index.js`
      (Express) como segundo adaptador delgado sobre la misma lógica de
      proxy — verificado de extremo a extremo contra el servidor real de
      Traccar. `infra/` declara el proyecto de Vercel como código
      (Terraform, provider `vercel/vercel`). Vercel Hobby (gratis, sin
      tarjeta) sigue siendo el único destino de producción — Docker es
      solo para portabilidad/desarrollo local.
- [x] **Fase 3 — Cliente de API tipado + autenticación + estado de carga**:
      `src/lib/traccarClient.ts` (errores tipados, conversión de nudos a
      km/h, formas de `Device`/`Position`), `useAuth` + `AuthProvider`
      (spine AD-3), pantalla de login con estado de carga (`Skeleton`) y
      error accesible (`ErrorPanel`). Efecto colateral: se fijó Vitest +
      Testing Library como herramienta de testing (9 pruebas reales,
      incluida una regresión directa del hallazgo del cuerpo 401 en texto
      plano de Traccar).
- [x] **Fase 4 — Lista y selector de dispositivos**: `useDevices` (estado
      canónico `AsyncState<T>`, spine AD-13), `DeviceList` con indicador
      en línea/fuera de línea, selección automática del primer vehículo
      (derivada durante el render, no vía `useEffect`), estado de carga y
      de error (con "Reintentar") reales.
- [x] **Fase 5 — Mapa interactivo + marcador vectorial personalizado**:
      `MapView` (Leaflet, tiles de OpenStreetMap) + marcador SVG propio con
      rotación por rumbo (`vehicleMarkerIcon.ts`, animada por CSS sobre un
      nodo separado del que mueve Leaflet — spine AD-6), anillo de estado
      en línea/fuera de línea. Se adelantó `useVehiclePosition` de la Fase
      7 porque el mapa necesitaba datos reales de posición para tener
      sentido.
- [x] **Fase 6 — Tarjeta de estado**: `StatusCard` con `<dl>/<dt>/<dd>` real,
      `aria-live="polite"` en el contenedor (velocidad y última
      actualización cambian solas cada 5s). Velocidad siempre en km/h
      (nunca nudos crudos), última actualización humanizada
      ("Hace 8 segundos", `relativeTime.ts`), fila explícita "Sin datos de
      posición" cuando corresponde (spine AD-13) en vez de un `<dd>` vacío.
- [x] ~~Fase 7 — Polling en vivo~~ ya cubierta por Fase 5 (sondeo cada 5s);
      quedan pendientes solo las micro-interacciones adicionales.
- [x] **Fase 8 — Estado de error resiliente**: `ErrorBoundary` (React,
      atrapa cualquier crash de render de la app entera, con recuperación
      vía "Reintentar") + aviso global de "sin conexión a Internet"
      (`useOnlineStatus`, distinto de un error de Traccar — uno es tu red,
      el otro es su servidor). Los estados de error por sección (login,
      dispositivos, mapa, tarjeta de estado) ya existían desde las fases
      anteriores.
- [ ] Fase 9 — Auditoría de accesibilidad (foco, teclado, contraste).
- [ ] Fase 10 — Pulido responsivo (móvil/escritorio).
- [ ] Fase 11 — Despliegue final (Vercel) + variables de entorno.

Ver la columna vertebral de arquitectura (invariantes, contrato de errores,
formas de datos, convenciones) en
`_bmad-output/planning-artifacts/architecture/architecture-Prueba tecnica-2026-08-19/ARCHITECTURE-SPINE.md`
del repo raíz de la prueba técnica.

## Stack técnico

- **React 19** + **Vite 8** + **TypeScript** (línea estable pre-7.0, ver
  spine — TS 7.0 es demasiado reciente para las dependencias de tooling que
  usa este proyecto).
- **Leaflet** para el mapa interactivo.
- **CSS Custom Properties** como *design tokens* (`src/styles/tokens.css`) —
  sin CSS-in-JS, sin Tailwind.
- Backend: una única función serverless en Vercel
  (`api/traccar/[...path].js`) que actúa como proxy hacia Traccar para
  evitar problemas de CORS.
- Sin librería de estado externa (Redux/Zustand/React Query) por decisión
  explícita — ver spine, revisable si la complejidad lo justifica.

## Cómo correrlo localmente

```bash
npm install
npm run dev
```

Abre la URL que indique Vite (por defecto `http://localhost:5173`).

Para producción:

```bash
npm run build
npm run preview
```

Pruebas (Vitest + Testing Library):

```bash
npm run test          # una corrida
npm run test:watch    # modo watch
```

## Variables de entorno / endpoints

| Variable              | Obligatoria | Por defecto                  | Descripción                                   |
|-----------------------|:-----------:|-------------------------------|------------------------------------------------|
| `TRACCAR_SERVER_URL`  | No          | `https://demo4.traccar.org`   | Servidor Traccar al que apunta el proxy serverless. |

Ver `.env.example`. El frontend nunca llama a Traccar directamente: siempre
pasa por `/api/traccar/*` (mismo origen, sin CORS). Endpoints usados:
`POST /api/session`, `GET /api/devices`, `GET /api/positions?deviceId=`.

Autenticación: HTTP Basic por petición. Las credenciales viven solo en
memoria durante la sesión — nunca se persisten en `localStorage`.

## Cómo correrlo con Docker (portabilidad, no es el destino de producción)

```bash
docker compose up               # modo dev, hot-reload en http://localhost:5173
docker compose --profile prod up prod   # build de producción local, http://localhost:8080
```

Ambos targets del `Dockerfile` sirven el mismo proxy hacia Traccar
(`api/_lib/traccarProxy.js`) que la función de Vercel — verificado
corriendo el contenedor y probando `GET /api/traccar/devices` contra el
servidor real.

## Cómo desplegarlo

**Opción manual:**
1. `git push` a la rama principal.
2. En [vercel.com](https://vercel.com), **Add New Project** → importa este
   repositorio → **Deploy** (el framework preset "Vite" se detecta solo;
   `vercel.json` ya define la función serverless).
3. Cada `git push` posterior vuelve a desplegar automáticamente.

**Opción como código (IaC):** ver `infra/README.md` — declara el mismo
proyecto de Vercel (nombre, framework, runtime de Node, variables de
entorno) con Terraform en vez de configurarlo a mano.

## Sistema de diseño — paleta y accesibilidad de color

Paleta de marca (Simón Movilidad): negro `#050505` + acento menta `#75FBC6`,
con la dirección visual final "Calma Operativa" suavizando las superficies
grandes para reducir fatiga visual en turnos de 24h: `#0E1210` (oscuro) /
`#F7FAF9` (claro) en vez de negro/blanco puro a pantalla completa. Todas las
combinaciones texto/fondo usadas fueron verificadas contra WCAG 2.1 AA
(≥ 4.5:1 texto normal, ≥ 3:1 componentes UI / foco).

## Accesibilidad

- `outline: none` está prohibido sin reemplazo — ver `:focus-visible` en
  `src/styles/base.css`, con anillo de foco de alto contraste en ambos temas.
- Enlace "saltar al contenido" como primer elemento enfocable.
- HTML semántico desde el primer commit; la Tarjeta de Estado usará
  `<dl>/<dt>/<dd>` (Fase 6).
- `prefers-reduced-motion` respetado: las duraciones de transición se anulan
  para usuarios que lo solicitan.

## Uso de IA como copiloto

Este proyecto usa IA (Claude) como copiloto de desarrollo, tal como permite
el enunciado de la prueba. En el video de presentación se detalla qué
prompts se usaron y qué tuvo que corregirse manualmente para cumplir los
estándares de UX, estética y accesibilidad exigidos.
