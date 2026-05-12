<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    
    if (!res.ok) {
      throw new Error('Invalid credentials')
    }
    
    const data = await res.json()
    authStore.setAuth(data.token, data.user)
    
    if (authStore.isTeacher) {
      router.push('/teacher/dashboard')
    } else {
      router.push('/student/workspace')
    }
  } catch (e: any) {
    error.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
    <div class="w-full max-w-md">
      <!-- Welcome Heading -->
      <div class="mb-12 text-center">
        <h1 class="font-display text-display-md text-ink tracking-tight mb-4">Welcome back</h1>
        <p class="text-body-md text-muted font-body">Sign in to your SmartCanvas account to continue.</p>
      </div>

      <!-- Login Card -->
      <div class="bg-surface-card rounded-lg p-xl">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div v-if="error" class="bg-error/10 text-error p-3 rounded-md text-sm font-medium">
            {{ error }}
          </div>

          <div>
            <label class="block text-title-sm text-ink mb-2">Username</label>
            <input 
              v-model="username"
              type="text" 
              required
              class="w-full bg-canvas text-ink rounded-md border border-hairline px-4 py-2.5 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-body-md"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label class="block text-title-sm text-ink mb-2">Password</label>
            <input 
              v-model="password"
              type="password" 
              required
              class="w-full bg-canvas text-ink rounded-md border border-hairline px-4 py-2.5 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-body-md"
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-primary hover:bg-primary-active text-on-primary font-medium rounded-md h-10 px-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
