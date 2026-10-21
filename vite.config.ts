/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// Vite + Vitest share one config. Vitest runs in the "node" environment
// (the calculator logic is pure) and the Vue component tests run in jsdom.
export default defineConfig({
  // Base must be relative so the built page resolves its own assets under the
  // GitHub Pages sub-path (/user/repo/). With the default '/', the page emits
  // src="/assets/..." which 404s at /<repo>/assets/... on Pages -> blank screen.
  base: './',
  plugins: [
    vue(),
    // PWA (issue #15): installable + works offline.
    //
    // injectRegister: 'auto' lets the plugin inject the <link rel="manifest">
    // and the service-worker registration script into index.html for us, so we
    // do NOT hand-add them (a hand-added absolute /sw.js would 404 under the
    // GitHub Pages sub-path).
    //
    // workbox.relative: true + a relative start_url keep every emitted URL
    // (manifest, sw.js, icons, cached assets) relative, which is what base:'./'
    // requires on a /<user>/<repo>/ sub-path. scope stays relative so the SW
    // controls exactly the deployed root, never a stray leading "/".
    VitePWA({
      injectRegister: 'auto',
      manifest: {
        name: 'Mini Calculator',
        short_name: 'Calculator',
        description:
          'A cinematic glass calculator — Vue 3 + Vite + TypeScript.',
        lang: 'zh-TW',
        // Relative so it resolves under the GitHub Pages sub-path.
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0f0d13',
        theme_color: '#141218',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell so a reload with no network still boots.
        globPatterns: ['index.html', 'assets/**/*'],
        // SPA: any navigation falls back to the app shell.
        navigateFallback: 'index.html',
        // base:'./' makes workbox emit all cached URLs relative, which is what
        // the GitHub Pages sub-path needs. scope is set in the manifest above.
      },
      // SW only builds for production previews (dist/), which is what
      // Playwright's webServer previews — the existing 20 e2e cases run there.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.ts'],
  },
});
