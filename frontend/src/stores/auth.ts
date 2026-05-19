import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<any>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null)
  const systemInitialized = ref<boolean | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isTeacher = computed(() => user.value?.role === 'TEACHER')
  const isStudent = computed(() => user.value?.role === 'STUDENT')

  async function checkSystemStatus(): Promise<boolean> {
    if (systemInitialized.value !== null) return systemInitialized.value
    try {
      const res = await fetch('http://localhost:8080/api/auth/system-status')
      const data = await res.json()
      systemInitialized.value = data.initialized
      return data.initialized
    } catch {
      return true
    }
  }

  function setAuth(newToken: string, newUser: any) {
    token.value = newToken
    user.value = newUser
    systemInitialized.value = true
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, systemInitialized, isAuthenticated, isTeacher, isStudent, checkSystemStatus, setAuth, logout }
})
