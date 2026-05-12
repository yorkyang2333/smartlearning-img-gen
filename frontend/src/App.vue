<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-body antialiased">
    <RouterView />
  </div>
</template>

<style>
/* Add smooth font rendering globally */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
