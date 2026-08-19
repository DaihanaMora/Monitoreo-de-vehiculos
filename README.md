# Monitor de Vehículo en Tiempo Real — Control Room

Prueba técnica — Design Engineer (UX/UI). SPA que se conecta a la API pública
de [Traccar](https://www.traccar.org/) para autenticarse, listar dispositivos,
seleccionarlos y visualizar su posición en tiempo real sobre un mapa
interactivo, junto a una tarjeta de estado accesible y pulida.

> Este README se va actualizando a medida que avanza el desarrollo, en
> commits pequeños y descriptivos (ver historial de Git).

## Estado del desarrollo

- [x] **Fase 1 — Scaffold + sistema de diseño**: estructura de carpetas, tokens
      (color, tipografía, espaciado, sombras, movimiento) para modo claro/oscuro,
      shell de la app con toggle de tema funcional.
- [x] **Fase 2 — Proxy serverless (CORS-safe)**: función Vercel en
      `api/traccar/[...path].js` que reenvía las peticiones a Traccar
      servidor-a-servidor; cliente `js/api.js` con autenticación HTTP Basic
      por petición y errores tipados (`invalid_credentials`,
      `upstream_unreachable`, `upstream_timeout`, `network_error`).
- [ ] Fase 3 — Autenticación + estado de carga (skeleton).
- [ ] Fase 4 — Lista y selector de dispositivos.
- [ ] Fase 5 — Mapa interactivo + marcador vectorial personalizado.
- [ ] Fase 6 — Tarjeta de estado (HTML semántico, `aria-live`).
- [ ] Fase 7 — Polling en vivo + suavizado del marcador + micro-interacciones.
- [ ] Fase 8 — Estado de error resiliente + reintento.
- [ ] Fase 9 — Auditoría de accesibilidad (foco, teclado, contraste).
- [ ] Fase 10 — Pulido responsivo (móvil/escritorio).
- [ ] Fase 11 — Despliegue (Vercel) + variables de entorno finales.

## Stack técnico

Vanilla HTML / CSS / JavaScript (ES modules), **sin build step ni
dependencias de npm** — decisión deliberada para mantener el proyecto
100% portable y con cero fricción de instalación. La única pieza de
backend será una función serverless (Vercel) que actúa como proxy hacia
Traccar para evitar problemas de CORS (se documenta en la Fase 2).

- Mapa: [Leaflet](https://leafletjs.com/) (vía CDN).
- Estilos: CSS Custom Properties como *design tokens* (`css/tokens.css`).

## Cómo correrlo localmente

Al no requerir build, basta con servir la carpeta como archivos estáticos
(abrir `index.html` directo con `file://` puede bloquear los módulos ES y
las llamadas fetch, así que se recomienda un servidor estático simple):

```bash
# Opción 1
npx serve .

# Opción 2
python3 -m http.server 5173
```

Luego abre `http://localhost:5173` (o el puerto que indique la herramienta).

## Variables de entorno / endpoints

| Variable              | Obligatoria | Por defecto                  | Descripción                                   |
|-----------------------|:-----------:|-------------------------------|------------------------------------------------|
| `TRACCAR_SERVER_URL`  | No          | `https://demo4.traccar.org`   | Servidor Traccar al que apunta el proxy serverless. |

Ver `.env.example`. El frontend nunca llama a Traccar directamente: siempre
pasa por `/api/traccar/*` (mismo origen, sin CORS). Endpoints usados:
`POST /api/session`, `GET /api/devices`, `GET /api/positions?deviceId=`.

Autenticación: HTTP Basic por petición (no se usa cookie de sesión, para
mantener el proxy sin estado). Las credenciales viven solo en memoria del
navegador durante la sesión — nunca se persisten en `localStorage`.

## Cómo ver la app funcionando (sin instalar nada)

Como `api/traccar/[...path].js` es una función serverless, **no corre**
abriendo `index.html` ni con un servidor estático simple — necesita el
runtime de Vercel. Configuración única (2 minutos):

1. Desde tu propia terminal (no dentro de este chat — el puente a tu
   compu no tiene acceso a internet), en la carpeta del proyecto:
   ```bash
   git push -u origin main
   ```
2. Entra a [vercel.com](https://vercel.com), inicia sesión con tu cuenta
   de GitHub, **Add New Project** → importa este repositorio → **Deploy**
   (no requiere configuración adicional; `vercel.json` ya define la
   función serverless).
3. Listo: cada `git push` posterior vuelve a desplegar automáticamente y
   obtienes una URL en vivo para probar cada fase nueva.

_Verificación propia antes de entregar cada fase: como el sandbox donde
yo trabajo tampoco tiene salida de red hacia `demo4.traccar.org`, probé el
proxy y el cliente end-to-end contra un servidor Traccar simulado
localmente (mismas rutas, mismas respuestas, mismos códigos de error) —
login válido/ inválido, listado de dispositivos, posición y caída del
servidor upstream. La verificación 100% real contra el servidor demo
público ocurre en el primer despliegue de Vercel, que si tiene salida a
internet sin restricciones._

## Sistema de diseño — paleta y accesibilidad de color

La paleta parte del color de marca de referencia (negro `#050505` +
acento menta `#75FBC6`). Todas las combinaciones texto/fondo usadas en la
UI fueron verificadas contra WCAG 2.1 AA:

| Uso                                   | Combinación                  | Contraste |
|----------------------------------------|-------------------------------|-----------|
| Texto primario (oscuro)               | `#F2FBF7` sobre `#050505`     | 19.3:1    |
| Texto secundario (oscuro)             | `#9FB3AC` sobre `#050505`     | 9.2:1     |
| Texto primario (claro)                | `#0A0F0C` sobre `#F7FAF9`     | 18.4:1    |
| Texto secundario (claro)              | `#4B5D56` sobre `#F7FAF9`     | 6.7:1     |
| Texto de acento (oscuro)              | `#75FBC6` sobre `#050505`     | 15.9:1    |
| Texto de acento (claro)               | `#03633D` sobre `#F7FAF9`     | 7.0:1     |
| Botón de acento, texto (oscuro)       | `#050505` sobre `#75FBC6`     | 15.9:1    |
| Botón de acento, texto (claro)        | `#FFFFFF` sobre `#03633D`     | 7.4:1     |
| Estado error (oscuro / claro)         | `#FF6B6B` / `#C4291C`         | 7.3:1 / 5.4:1 |
| Estado offline (oscuro / claro)       | `#8A9A94` / `#5D6E67`         | 6.9:1 / 5.1:1 |
| Anillo de foco (oscuro / claro)       | `#75FBC6` / `#03633D`         | 15.9:1 / 7.0:1 |

Todas superan el mínimo AA de 4.5:1 para texto normal (y 3:1 para
componentes UI / foco), con margen amplio.

## Accesibilidad

- `outline: none` está prohibido sin reemplazo — ver `:focus-visible` en
  `css/base.css`, con anillo de foco de alto contraste en ambos temas.
- Enlace "saltar al contenido" como primer elemento enfocable.
- HTML semántico (`<header>`, `<main>`, `<section aria-labelledby>`) desde
  el primer commit; la Tarjeta de Estado usará `<dl>/<dt>/<dd>` (Fase 6).
- `prefers-reduced-motion` respetado: las duraciones de transición se
  anulan para usuarios que lo solicitan.

## Uso de IA como copiloto

Este proyecto usa IA (Claude) como copiloto de desarrollo, tal como
permite el enunciado de la prueba. En el video de presentación se detalla
qué prompts se usaron y qué tuvo que corregirse manualmente para cumplir
los estándares de UX, estética y accesibilidad exigidos.
