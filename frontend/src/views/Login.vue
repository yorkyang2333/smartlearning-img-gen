<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
      throw new Error('用户名或密码错误')
    }
    
    const data = await res.json()
    authStore.setAuth(data.token, data.user)
    
    if (authStore.isTeacher) {
      router.push('/teacher/dashboard')
    } else {
      router.push('/student/generate')
    }
  } catch (e: any) {
    error.value = e.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex w-full bg-canvas overflow-hidden">
    <!-- Left Side: Form (50%) -->
    <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10">
      
      <div class="w-full max-w-md mx-auto">
        <!-- Logo -->
        <div class="absolute top-12 left-8 sm:left-16 lg:left-24 font-display text-2xl font-medium tracking-tight text-ink flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-ink">
            <path d="M12 2L12 22M2 12L22 12M5 5L19 19M5 19L19 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          晋彩智绘
        </div>

        <div class="mb-16">
          <h1 class="font-display-force text-[54px] leading-[1.1] tracking-[0.02em] font-medium text-ink mb-4">
            遇见你的<br/>AI 创作伙伴
          </h1>
          <p class="text-body-md text-muted font-body">
            登录以开启智能艺术设计与学习之旅。
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-8">
          <div v-if="error" class="bg-error/10 text-error p-3 rounded-md text-sm font-medium">
            {{ error }}
          </div>

          <div class="group relative">
            <input 
              v-model="username"
              type="text" 
              required
              class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
              placeholder="用户名"
              id="username"
            />
            <label for="username" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
              用户名
            </label>
          </div>

          <div class="group relative">
            <input 
              v-model="password"
              type="password" 
              required
              class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
              placeholder="密码"
              id="password"
            />
            <label for="password" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
              密码
            </label>
          </div>

          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="loading"
              class="w-full bg-primary hover:bg-primary-active text-on-primary font-medium rounded-md h-[44px] px-5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {{ loading ? '正在登录...' : '登 录' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Right Side: Classic Art Background (50%) -->
    <div class="hidden lg:flex lg:w-1/2 relative bg-[#181715] items-center justify-center overflow-hidden">
      <!-- High-res classical painting image -->
      <img 
        src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2000&auto=format&fit=crop" 
        class="absolute inset-0 w-full h-full object-cover"
        alt="Classic Art Background"
      />
      
      <!-- Subtle dark gradient overlay to protect text readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#181715]/90 via-[#181715]/40 to-transparent z-10"></div>
      
      <!-- Inspirational Quote Overlay -->
      <div class="absolute bottom-24 z-20 text-center max-w-lg px-12">
        <h2 class="font-display-force text-4xl text-white mb-4 leading-relaxed font-medium tracking-wide">
          “创造力需要无所畏惧的勇气。”
        </h2>
        <p class="text-white/60 text-body-md font-body tracking-widest mt-6">亨利·马蒂斯 (Henri Matisse)</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-display-force {
  font-family: 'Noto Serif SC', 'Songti SC', 'STSong', serif !important;
}
</style>
