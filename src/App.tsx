import { useState } from "react";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { useDevices } from "./hooks/useDevices";
import { useAllPositions, selectPosition, latestFixTime } from "./hooks/useAllPositions";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useNow } from "./hooks/useNow";
import { formatRelativeTime } from "./lib/relativeTime";
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
import { LoginForm } from "./components/LoginForm/LoginForm";
import { DeviceListSkeleton } from "./components/DeviceList/DeviceList";
import { DeviceListPanel } from "./components/DeviceList/DeviceListPanel";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel";
import { MapView } from "./components/MapView/MapView";
import { StatusCard } from "./components/StatusCard/StatusCard";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { Logo } from "./components/Logo/Logo";

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      Sin conexión a Internet — reconectando automáticamente en cuanto vuelva.
    </div>
  );
}

function ControlRoom() {
  const { user, logout } = useAuth();
  const devices = useDevices();
  const [explicitSelection, setExplicitSelection] = useState<number | null>(null); // spine AD-12: owned here, no Context

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
          <Logo height="2.25rem" />
          <span className="app-brand__divider" aria-hidden="true" />
          <span className="app-brand__session">
            Central de operaciones · {user?.name ?? user?.email}
          </span>
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
          <button type="button" className="btn btn--secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main id="main-content" className="app-main">
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
              onSelectDevice={setExplicitSelection}
            />
          )}
        </section>

        <section className="panel panel--map" aria-labelledby="map-heading">
          <h2 id="map-heading" className="visually-hidden">
            Mapa del vehículo
          </h2>
          {selectedDevice ? (
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
