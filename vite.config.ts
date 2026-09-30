/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Pfad, unter dem die App ausgeliefert wird. Für GitHub Pages z. B. BASE_PATH=/idle-politics/
const base = process.env.BASE_PATH ?? '/';
// Entwickler-Version (unendliche Ressourcen) als eigene App unter <base>dev/
const devEdition = process.env.VITE_DEV_EDITION === '1';
// Name auf dem Home-Bildschirm und im Tab (in index.html als %VITE_APP_TITLE%)
process.env.VITE_APP_TITLE = devEdition ? 'IP Dev' : 'Idle Politics';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: devEdition ? 'Idle Politics Dev' : 'Idle Politics',
        short_name: devEdition ? 'IP Dev' : 'Idle Politics',
        description: 'Vom Arbeiter an die Spitze des Staates.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f2ed',
        theme_color: devEdition ? '#6a3d9a' : '#2b2f36',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        // Die Entwickler-Version unter dev/ hat ihren eigenen Service Worker
        navigateFallbackDenylist: devEdition ? [] : [/\/dev\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    // Keine Warnung für normale Bundle-Größen eines Spiels
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterStub.ts', import.meta.url),
      ),
    },
  },
});
