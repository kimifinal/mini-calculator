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
      // injectRegister: 'auto' — inject <link rel="manifest"> + the SW
      // registration script into index.html (a hand-added absolute /sw.js
      // would 404 under the GitHub Pages sub-path).
      injectRegister: 'auto',
      //
      // registerType: 'autoUpdate' (was the default 'prompt') — when a new SW is
      // deployed, the plugin injects a registration that fetches + activates the
      // new SW in the background and reloads the page once, so users silently get
      // the latest build on their next open. With 'prompt' the new SW is queued
      // BEHIND an in-app update prompt users frequently miss, leaving them on the
      // STALE build — the exact "user sees old UI / old copy-toast after a deploy"
      // problem seen this session.
      registerType: 'autoUpdate',
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
    // C7 / #49: test-coverage visibility (c8 / v8). The point is to make
    // "which src/lib/ path a test never reached" visible, not to set a gate —
    // so thresholds are OFF (a report-only run can't break the build). The
    // coverage-v8 provider is aligned to the same vitest major (2.x), checked
    // at install time.
    coverage: {
      provider: 'v8',
      // Report to the console AND a json/html tree for later CI upload.
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // Focus on the logic SSOT (calculator.ts / expression.ts) + composables
      // — that is what "untested path" most matters for.
      include: [
        'src/lib/**',
        'src/composables/**',
        'src/components/Calculator.vue',
      ],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      // No threshold: report-only (a gate is a C8+ decision, needs the first
      // real numbers anyway and would otherwise turn the build red).
    },
  },
});
