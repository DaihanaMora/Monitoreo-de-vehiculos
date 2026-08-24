import { useState } from "react";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { useDevices } from "./hooks/useDevices";
import { useAllPositions, selectPosition, latestFixTime } from "./hooks/useAllPositions";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useNow } from "./hooks/useNow";
import { formatRelativeTime } from "./lib/relativeTime";
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
import { UserMenu } from "./components/UserMenu/UserMenu";
import { LoginForm } from "./components/LoginForm/LoginForm";
import { DeviceListSkeleton } from "./components/DeviceList/DeviceList";
import { DeviceListPanel } from "./components/DeviceList/DeviceListPanel";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel";
import { MapView } from "./components/MapView/MapView";
import { StatusCard } from "./components/StatusCard/StatusCard";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { Logo } from "./components/Logo/Logo";
import { Skeleton } from "./components/Skeleton/Skeleton";

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      Sin conexión a Internet — reconectando automáticamente en cuanto vuelva.
    </div>
  );
}

/** Fantasma del panel de mapa mientras useDevices está en "loading" -- antes
 * este panel no mostraba nada coherente en ese momento (el texto estático
 * "Selecciona un vehículo" aparecía antes de que hubiera datos, lo cual no
 * tiene sentido), mientras que la lista sí tenía su propio skeleton. Ahora
 * todo el tablero se lee como "cargando" de forma consistente (pedido
 * explícito de Daihana: "skeleton al cargar la plataforma"). */
function MapAreaSkeleton() {
  return (
    <div className="map-area-skeleton" aria-hidden="true">
      <Skeleton className="map-area-skeleton__canvas" width="100%" height="100%" radius="0" />
      <div className="map-area-skeleton__card">
        <Skeleton width="60%" height="1.1rem" />
        <Skeleton width="40%" height="2rem" />
        <Skeleton width="80%" height="0.9rem" />
      </div>
    </div>
  );
}

function ControlRoom() {
  const { user, logout } = useAuth();
  const devices = useDevices();
  const [explicitSelection, setExplicitSelection] = useState<number | null>(null); // spine AD-12: owned here, no Context

  // Vista activa en móvil (<900px, ver layout.css): 'list' o 'details'.
  // Bug real reportado por Daihana (imgs/movil.png): la tarjeta de estado
  // flotante (position:fixed, hasta 60vh) tapaba permanentemente parte de
  // la lista de vehículos -- hacer scroll no la movía porque está fija a
  // la ventana, no al documento. En vez de competir por espacio, ahora
  // móvil muestra UNA vista a la vez, como ya proponía el mockup original
  // (Assets/.../FleetMonitor.dc.html, mobileSheet 'list'/'details') que
  // se había simplificado de más en el rediseño. Sin efecto en escritorio
  // -- ese layout sigue mostrando ambos paneles siempre (ver media query).
  const [mobileView, setMobileView] = useState<"list" | "details">("list");

  function selectDevice(id: number) {
    setExplicitSelection(id);
    setMobileView("details"); // no-op visual en escritorio, relevante solo <900px
  }

  // Selección efectiva derivada durante el render (no vía efecto+setState):
  // si el usuario ya eligió algo, se respeta; si no, el primer dispositivo
  // de la lista actúa como default en cuanto llega, sin un round-trip de
  // render extra ni useEffect (spine AD-12 sigue siendo la única fuente:
  // App.tsx, sin Context — esto solo cambia CÓMO se calcula el valor).
  const selectedDeviceId =
    explicitSelection ?? (devices.status === "success" ? (devices.data[0]?.id ?? null) : null);

  const selectedDevice =
    devices.status === "success" ? (devices.data.find((d) => d.id === selectedDeviceId) ?? null) : null;

  const allPositions = useAllPositions();
  const positionState = selectPosition(allPositions, selectedDeviceId);
  const now = useNow();
  const lastLiveUpdate = latestFixTime(allPositions);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>

      <header className="app-header">
        <div className="app-brand">
          {/* Solo visible <900px (ver layout.css) -- alterna entre ver la
              lista completa y ver el detalle del vehículo seleccionado,
              en vez de que compitan por la misma pantalla. */}
          <button
            type="button"
            className="hamburger-toggle"
            aria-label={mobileView === "list" ? "Ver detalles del vehículo" : "Ver lista de vehículos"}
            onClick={() => setMobileView((v) => (v === "list" ? "details" : "list"))}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Logo height="2.25rem" />
        </div>

        <div className="live-indicator" aria-live="polite">
          <span
            className={`live-indicator__dot${allPositions.status === "success" ? " live-indicator__dot--live" : ""}`}
            aria-hidden="true"
          />
          <span className="live-indicator__label">LIVE</span>
          <span className="live-indicator__updated">
            {lastLiveUpdate ? `Actualizado ${formatRelativeTime(lastLiveUpdate, now)}` : "Conectando…"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <ThemeToggle />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </header>

      <main id="main-content" className={`app-main app-main--mobile-${mobileView}`}>
        <section className="panel panel--list" aria-labelledby="devices-heading">
          {/* Visualmente oculto a propósito: Assets/desktop1.png no muestra un
              título "Vehículos" sobre la barra lateral, arranca directo en el
              buscador -- pero la sección sigue necesitando un nombre accesible
              real (aria-labelledby), no decorativo. */}
          <h2 id="devices-heading" className="visually-hidden">
            Vehículos
          </h2>

          {devices.status === "loading" || devices.status === "idle" ? (
            <DeviceListSkeleton />
          ) : devices.status === "error" ? (
            <ErrorPanel error={devices.error} title="No pudimos cargar los dispositivos" onRetry={devices.refetch} />
          ) : (
            <DeviceListPanel
              devices={devices.data}
              positions={allPositions}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={selectDevice}
            />
          )}
        </section>

        <section className="panel panel--map" aria-labelledby="map-heading">
          <h2 id="map-heading" className="visually-hidden">
            Mapa del vehículo
          </h2>
          {devices.status === "loading" || devices.status === "idle" ? (
            <MapAreaSkeleton />
          ) : selectedDevice ? (
            <>
              <MapView
                positionState={positionState}
                deviceName={selectedDevice.name}
                online={selectedDevice.status === "online"}
              />
              <StatusCard floating device={selectedDevice} positionState={positionState} />
            </>
          ) : (
            <p className="placeholder-note">Selecciona un vehículo para ver su ubicación.</p>
          )}
        </section>
      </main>
    </>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <OfflineBanner />
      {isAuthenticated ? <ControlRoom /> : <LoginForm />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
