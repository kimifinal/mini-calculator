<script setup lang="ts">
import Calculator from './components/Calculator.vue';
</script>

<template>
  <Calculator />
</template>

<style>
/* Material Design 3 — dark baseline tokens (frozen SSOT; see DESIGN.md).
   Sourced from m3.material.io baseline dark scheme. */
:root {
  color-scheme: dark;
  --md-primary: #d0bcff;
  --md-on-primary: #381e72;
  --md-primary-container: #4f378b;
  --md-on-primary-container: #eaddff;
  --md-secondary: #ccc2dc;
  --md-on-secondary: #332d41;
  --md-secondary-container: #4a4458;
  --md-on-secondary-container: #e8def8;
  --md-tertiary: #efb8c8;
  --md-on-tertiary: #492532;
  --md-error: #f2b8b5;
  --md-on-error: #601410;
  --md-error-container: #8c1d18;
  --md-on-error-container: #f9dedc;
  --md-surface: #141218;
  --md-on-surface: #e6e0e9;
  --md-surface-variant: #49454f;
  --md-on-surface-variant: #cac4d0;
  --md-outline: #938f99;
  --md-outline-variant: #49454f;
  --md-sc-lowest: #0f0d13;
  --md-sc-low: #1d1b20;
  --md-sc: #211f26;
  --md-sc-high: #2b2930;
  --md-sc-highest: #36343b;
  --md-sc-bright: #3b383e;
  --md-font: 'Roboto', 'Google Sans', system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  font-family: var(--md-font);
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  /* MD3 surface-container-lowest backdrop for the elevated shell. */
  background: var(--md-sc-lowest);
}
</style>
