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

/*
 * Light theme (M3 baseline light scheme). Two layers, in this priority order:
 *
 * 1. FOLLOW THE OS — when the OS prefers light, override :root with the light
 *    values. A media query does not change specificity, so this :root (0,0,1)
 *    still ties the dark default; source order wins, so it applies after the
 *    dark block. When the OS prefers dark (or is unset), this media block never
 *    matches and the dark :root above stays in effect.
 *
 * 2. FORCED OVERRIDE (the JS toggle) — `[data-theme="light"]` /
 *    `[data-theme="dark"]` attribute selectors on <html> have specificity
 *    0,1,0, which OUT-SPECIFIES both the bare :root and the @media :root
 *    (both 0,0,1), so a stored or user-chosen theme always beats the OS
 *    preference. 'system' is represented by the ABSENCE of the attribute, so
 *    control falls through to the layers above. Each forced layer carries the
 *    FULL token set so a forced choice is complete regardless of OS.
 *
 * --md-* names follow the legacy MD3 naming (see DESIGN.md); the light values
 * map each token to its M3 baseline *light* role.
 */
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --md-primary: #6750a4;
    --md-on-primary: #ffffff;
    --md-primary-container: #eaddff;
    --md-on-primary-container: #21005d;
    --md-secondary: #625b71;
    --md-on-secondary: #ffffff;
    --md-secondary-container: #e8def8;
    --md-on-secondary-container: #1d192b;
    --md-tertiary: #7d5260;
    --md-on-tertiary: #ffffff;
    --md-error: #b3261e;
    --md-on-error: #ffffff;
    --md-error-container: #f9dedc;
    --md-on-error-container: #410e0b;
    --md-surface: #fef7ff;
    --md-on-surface: #1d1b20;
    --md-surface-variant: #e7e0ec;
    --md-on-surface-variant: #49454f;
    --md-outline: #79747e;
    --md-outline-variant: #cac4d0;
    --md-sc-lowest: #ffffff;
    --md-sc-low: #f7f2fa;
    --md-sc: #f3edf7;
    --md-sc-high: #ece6f0;
    --md-sc-highest: #e6e0e9;
    --md-sc-bright: #fef7ff;
  }
}

/* Forced: light scheme wins over the OS even when the OS prefers dark. */
[data-theme="light"] {
  color-scheme: light;
  --md-primary: #6750a4;
  --md-on-primary: #ffffff;
  --md-primary-container: #eaddff;
  --md-on-primary-container: #21005d;
  --md-secondary: #625b71;
  --md-on-secondary: #ffffff;
  --md-secondary-container: #e8def8;
  --md-on-secondary-container: #1d192b;
  --md-tertiary: #7d5260;
  --md-on-tertiary: #ffffff;
  --md-error: #b3261e;
  --md-on-error: #ffffff;
  --md-error-container: #f9dedc;
  --md-on-error-container: #410e0b;
  --md-surface: #fef7ff;
  --md-on-surface: #1d1b20;
  --md-surface-variant: #e7e0ec;
  --md-on-surface-variant: #49454f;
  --md-outline: #79747e;
  --md-outline-variant: #cac4d0;
  --md-sc-lowest: #ffffff;
  --md-sc-low: #f7f2fa;
  --md-sc: #f3edf7;
  --md-sc-high: #ece6f0;
  --md-sc-highest: #e6e0e9;
  --md-sc-bright: #fef7ff;
}

/* Forced: dark scheme wins over the OS even when the OS prefers light. */
[data-theme="dark"] {
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
