/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Generates the service worker (dist/sw.js) at build time. The web app
    // manifest is a plain file, public/manifest.json.
    VitePWA({
      // A new version waits until the person reloads (src/app/serviceWorker.ts),
      // so the code never changes under someone in the middle of an edit.
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        // Everything runs in the browser, so the whole app is precached to work
        // offline: the editor, pdf.js for uploads, react-pdf for downloads, and
        // the Latin font files that the sheet (.woff2) and the PDF (.woff) use.
        globPatterns: ['**/*.{html,js,mjs,css,svg,png,json}', 'assets/*-latin-*.{woff,woff2}'],
        // Only shown in the browser's install dialog.
        globIgnores: ['screenshots/**'],
        // The pdf.js worker and react-pdf are over 1 MB each.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Other scripts (Cyrillic, Greek, Vietnamese) are fetched the first
            // time a resume uses them, then kept. Their file names are hashed.
            urlPattern: /\/assets\/[^/]+\.woff2?$/,
            handler: 'CacheFirst',
            options: { cacheName: 'resumy-fonts', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
  build: {
    // The PDF engines (react-pdf, pdf.js) are split into lazy chunks that are
    // only fetched on download/upload; they are large by nature.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
