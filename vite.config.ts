/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { traccarDevProxyPlugin } from './vite-plugin-traccar-proxy.ts'
import { gpsSimulatorPlugin } from './vite-plugin-gps-simulator.ts'

// https://vite.dev/config/
export default defineConfig({
  // gpsSimulatorPlugin() declara apply:'serve' -- por eso es seguro tenerlo
  // aquí mismo junto al proxy real: Vite lo excluye por completo de
  // `vite build`, así que nunca llega a producción (ni a Vercel ni a
  // Docker con NODE_ENV=production).
  plugins: [react(), traccarDevProxyPlugin(), gpsSimulatorPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // 'forks' (Vitest's default pool) hangs/times out spawning workers in
    // this project's path (OneDrive-synced, contains spaces) — verified by
    // reproducing the failure and confirming 'threads' runs the exact same
    // suite cleanly. Pinned explicitly so CI/other machines don't silently
    // fall back to the broken default.
    pool: 'threads',
  },
})
