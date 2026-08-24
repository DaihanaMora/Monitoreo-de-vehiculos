#  Monitor de Vehículo en Tiempo Real — Control Room

> **Prueba técnica · Design Engineer (UX/UI)**

Aplicación web SPA para el monitoreo de vehículos en tiempo real, desarrollada sobre **React + TypeScript + Vite** y conectada a la API de **Traccar**.

La experiencia está diseñada bajo el concepto de **Control Room**, priorizando la visualización rápida del estado del vehículo, su ubicación y la información necesaria para tomar decisiones sin sobrecargar la interfaz.

##  Demo y repositorio

**Demo:** https://monitoreo-de-vehiculos.vercel.app/

**Repositorio:** https://github.com/DaihanaMora/Monitoreo-de-vehiculos

**Video demo:** https://youtu.be/sSf-wZ1JGck 

---

## Objetivo

Diseñar y desarrollar una interfaz de monitoreo que permita a un operador:

* Autenticarse en la plataforma.
* Consultar los vehículos disponibles.
* Buscar y seleccionar un vehículo.
* Visualizar su ubicación actual en un mapa.
* Consultar velocidad y estado de conexión.
* Identificar cuándo fue recibida la última posición.
* Monitorear actualizaciones periódicas de la información.
* Identificar estados sin datos o errores de conexión.
* Recuperarse de errores mediante acciones claras.
* Utilizar la aplicación en desktop, tablet y mobile.
* Alternar entre modo claro y oscuro.

La interfaz fue pensada para un contexto de **monitoreo prolongado**, donde la información debe ser fácil de escanear, mantener una jerarquía clara y generar la menor carga cognitiva posible.

---

## Funcionalidades principales

### Explorador de vehículos

* Listado de dispositivos disponibles desde Traccar.
* Selección de vehículo para iniciar el monitoreo.
* Selección automática del primer vehículo disponible.
* Búsqueda de vehículos.
* Filtro por estado de conexión.
* Ordenamiento de resultados.
* Indicadores visuales de estado Online / Offline.
* Estados de loading, vacío y error.

###  Monitoreo en tiempo real

* Consulta periódica de la posición del vehículo seleccionado.
* Actualización cada **5 segundos**.
* Visualización de velocidad actual.
* Conversión de velocidad de nudos a **km/h**.
* Visualización de la última actualización.
* Formato de tiempo relativo para facilitar la lectura.
* Manejo explícito de vehículos sin datos de posición.

### Mapa interactivo

* **Leaflet + OpenStreetMap**.
* Centrado automático sobre el vehículo seleccionado.
* Marcador vectorial SVG personalizado.
* Rotación del marcador según el rumbo (`course`) recibido desde Traccar.
* Animación suave del marcador para evitar movimientos bruscos.
* Indicador visual del estado de conexión.

### Estados y recuperación

La interfaz contempla diferentes estados durante el ciclo de vida de la aplicación:

* Loading / Skeleton.
* Error de autenticación.
* Error al obtener vehículos.
* Error al obtener posición.
* Vehículo sin datos de posición.
* Sin conexión a Internet.
* Error global de renderizado.
* Acciones de **Retry / Reintentar**.

Los errores se presentan de forma contextual para que el usuario pueda entender qué ocurrió y qué acción puede realizar.

### Modo claro y oscuro

* Light Mode.
* Dark Mode.
* Design Tokens mediante CSS Custom Properties.
* Jerarquía y contraste adaptados a ambos temas.
* Soporte para `prefers-reduced-motion`.

### Responsive

La interfaz se adapta a:

* Desktop.
* Tablet.
* Mobile.

La distribución cambia según el espacio disponible, manteniendo como prioridad la información operacional y el contexto geográfico.

---

# Decisiones UX/UI

## Map-first

El mapa funciona como el área principal de la experiencia porque la tarea principal del operador es **localizar y monitorear el vehículo**.

La interfaz sigue una jerarquía sencilla:

**Encontrar → Seleccionar → Localizar → Interpretar**

El explorador permite encontrar rápidamente un vehículo, mientras que el mapa y la tarjeta de estado proporcionan el contexto necesario para interpretar su situación.

---

## Jerarquía de información

La información se organiza según su relevancia para la operación:

1. Identificación del vehículo.
2. Estado de conexión.
3. Ubicación.
4. Velocidad.
5. Última actualización.
6. Información secundaria.

Esto permite realizar un escaneo rápido sin obligar al operador a recorrer diferentes secciones de la interfaz.

---

## Enfoque Control Room

La interfaz evita convertirse en un dashboard cargado de métricas que no aportan directamente a la tarea.

En lugar de mostrar grandes cantidades de información secundaria, se priorizan:

* Estado actual.
* Ubicación.
* Velocidad.
* Recencia de los datos.
* Disponibilidad de conexión.
* Recuperación ante errores.

El objetivo es mantener una experiencia **clara, calmada y operacional**, especialmente útil para escenarios de monitoreo prolongado.

---

## Reconocimiento antes que memoria

La información importante permanece visible y contextual.

El operador no necesita recordar:

* Cuándo se recibió la última posición.
* Si el vehículo está conectado.
* Qué vehículo está seleccionado.
* Qué velocidad registra.

Estos datos se presentan directamente en la interfaz.

---

# Accesibilidad

La accesibilidad fue considerada como parte del diseño y no como una etapa posterior.

La implementación toma **WCAG 2.1 AA** como referencia.

### HTML semántico

La información de estado utiliza una estructura semántica mediante `<dl>`, `<dt>` y `<dd>`:

```html
<dl>
  <dt>Status</dt>
  <dd>Online</dd>

  <dt>Speed</dt>
  <dd>38 km/h</dd>

  <dt>Last update</dt>
  <dd>Hace 3 segundos</dd>
</dl>
```

### Otras consideraciones

* Estados de foco visibles mediante `:focus-visible`.
* Navegación mediante teclado.
* Enlace de **Skip to content**.
* Mensajes de error comprensibles.
* Estados dinámicos anunciables mediante `aria-live`.
* Contraste de color considerado para texto y componentes.
* Soporte para `prefers-reduced-motion`.
* Uso de HTML semántico.
* Estados de loading y error comunicados visualmente.

---

#  Arquitectura

La aplicación utiliza una arquitectura sencilla, orientada a mantener una separación clara entre interfaz, lógica de negocio y comunicación con la API.

```text
┌──────────────────────────────┐
│          React UI            │
│                              │
│  Login                       │
│  Vehicle Explorer            │
│  Map                         │
│  Status Card                 │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Traccar Client         │
│                              │
│  Authentication              │
│  Devices                     │
│  Positions                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Serverless Proxy         │
│          Vercel              │
│                              │
│       /api/traccar/*         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Traccar API           │
└──────────────────────────────┘
```

El frontend no consume directamente el servidor de Traccar. Las solicitudes pasan por un **proxy serverless**, evitando problemas de CORS y manteniendo la comunicación centralizada.

---

#  Stack tecnológico

| Tecnología            | Uso                         |
| --------------------- | --------------------------- |
| React 19              | Construcción de la interfaz |
| TypeScript            | Tipado estático             |
| Vite                  | Desarrollo y build          |
| Leaflet               | Mapa interactivo            |
| OpenStreetMap         | Cartografía                 |
| CSS Custom Properties | Design Tokens               |
| Vitest                | Testing                     |
| Testing Library       | Pruebas de componentes      |
| Vercel                | Deployment                  |
| Traccar               | Fuente de datos GPS         |
| Node.js               | Proxy / backend             |

No se utiliza una librería externa de estado como Redux, Zustand o React Query. El estado se mantiene mediante las herramientas nativas de React, manteniendo la arquitectura proporcional al alcance de la aplicación.

---

# Autenticación y datos

La autenticación se realiza contra Traccar utilizando HTTP Basic Authentication.

Las credenciales:

* Se mantienen únicamente en memoria durante la sesión.
* No se almacenan en `localStorage`.
* No son expuestas directamente al frontend como configuración permanente.

El frontend utiliza los siguientes endpoints internos:

```text
POST /api/traccar/session
GET  /api/traccar/devices
GET  /api/traccar/positions?deviceId={id}
```

El proxy utiliza como servidor Traccar por defecto:

```text
https://demo4.traccar.org
```

Este valor puede configurarse mediante la variable de entorno:

```env
TRACCAR_SERVER_URL=https://demo4.traccar.org
```

---

# Instalación y ejecución local

## Requisitos

* Node.js
* npm

## Instalación

```bash
git clone https://github.com/DaihanaMora/Monitoreo-de-vehiculos.git

cd Monitoreo-de-vehiculos

npm install
```

## Variables de entorno

Crear un archivo `.env` tomando como referencia:

```bash
.env.example
```

Variable disponible:

```env
TRACCAR_SERVER_URL=https://demo4.traccar.org
```

## Desarrollo

```bash
npm run dev
```

Luego abrir la URL indicada por Vite, normalmente:

```text
http://localhost:5173
```

---

# Testing

El proyecto utiliza **Vitest + Testing Library**.

Ejecutar las pruebas:

```bash
npm run test
```

Modo watch:

```bash
npm run test:watch
```

Las pruebas cubren, entre otros aspectos:

* Autenticación.
* Manejo de respuestas de la API.
* Estados de error.
* Conversión de velocidad.
* Comportamiento de componentes.

---

# Docker

El proyecto también incluye configuración para ejecutar la aplicación mediante Docker.

### Desarrollo

```bash
docker compose up
```

Disponible normalmente en:

```text
http://localhost:5173
```

### Producción local

```bash
docker compose --profile prod up prod
```

Disponible normalmente en:

```text
http://localhost:8080
```

Docker se incluye como alternativa de portabilidad y desarrollo local. El deployment principal de producción se realiza mediante Vercel.

---

# Deployment

La aplicación está desplegada actualmente en Vercel:

**Demo:** https://monitoreo-de-vehiculos.vercel.app/

El proyecto utiliza una función serverless como proxy para comunicarse con Traccar.

El deployment puede realizarse conectando el repositorio de GitHub con Vercel. Los nuevos cambios enviados a la rama principal pueden generar automáticamente un nuevo deployment.

---

#  Alcance de la solución

La aplicación se enfoca deliberadamente en la tarea principal de monitoreo:

> **Encontrar → seleccionar → localizar → interpretar**

Por esta razón, no se incorporaron dashboards, métricas históricas o funcionalidades adicionales que no fueran necesarias para resolver el objetivo principal de la prueba.

La intención es demostrar cómo una interfaz puede manejar información operacional en tiempo real manteniendo una experiencia **simple, accesible, responsive y orientada a la tarea**.

---

