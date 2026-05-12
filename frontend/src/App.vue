<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-body">
    <!-- Top Nav could go here -->
    <header class="bg-canvas text-ink h-16 flex items-center px-6 border-b border-hairline">
      <div class="font-display text-xl tracking-tight font-medium">SmartCanvas</div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
