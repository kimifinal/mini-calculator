/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Vite + Vitest share one config. Vitest runs in the "node" environment
// (the calculator logic is pure) and the Vue component tests run in jsdom.
export default defineConfig({
  // Base must be relative so the built page resolves its own assets under the
  // GitHub Pages sub-path (/user/repo/). With the default '/', the page emits
  // src="/assets/..." which 404s at /<repo>/assets/... on Pages -> blank screen.
  base: './',
  plugins: [vue()],
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
    include: ['tests/unit/**/*.{test,spec}.ts'],
  },
});
