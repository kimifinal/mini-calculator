<script setup lang="ts">
import Calculator from './components/Calculator.vue';
</script>

<template>
  <Calculator />
</template>

<style>
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(
    135deg,
    oklch(45% 0.15 260),
    oklch(50% 0.18 300),
    oklch(65% 0.12 180)
  );
  background-size: 400% 400%;
  animation: bgGradient 15s ease infinite;
}

@keyframes bgGradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
