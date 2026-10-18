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
  background: #000000;
}
</style>
