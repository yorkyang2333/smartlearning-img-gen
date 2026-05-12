<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const user = authStore.user

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="p-xl max-w-7xl mx-auto space-y-12">
    <div class="flex justify-between items-center bg-surface-dark rounded-xl p-8">
      <div>
        <h1 class="font-display text-display-sm text-on-dark mb-2">Teacher Dashboard</h1>
        <p class="text-on-dark-soft">Welcome, {{ user?.displayName || 'Teacher' }}</p>
      </div>
      <button @click="handleLogout" class="bg-surface-dark-elevated text-on-dark rounded-md px-5 py-2.5 font-medium hover:bg-white/10 transition">
        Sign out
      </button>
    </div>

    <!-- Feature Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface-card rounded-lg p-xl">
        <h3 class="text-title-md text-ink mb-4">Model Management</h3>
        <p class="text-body-md text-muted mb-6">Configure AI models and assign permissions to students.</p>
        <button class="text-primary font-medium hover:text-primary-active transition">Manage Models &rarr;</button>
      </div>
      
      <div class="bg-surface-card rounded-lg p-xl">
        <h3 class="text-title-md text-ink mb-4">Assignments</h3>
        <p class="text-body-md text-muted mb-6">Create and grade image generation assignments.</p>
        <button class="text-primary font-medium hover:text-primary-active transition">View Assignments &rarr;</button>
      </div>

      <div class="bg-surface-card rounded-lg p-xl">
        <h3 class="text-title-md text-ink mb-4">Quota System</h3>
        <p class="text-body-md text-muted mb-6">Manage student token limits and API usage.</p>
        <button class="text-primary font-medium hover:text-primary-active transition">Configure Quotas &rarr;</button>
      </div>
    </div>
  </div>
</template>
