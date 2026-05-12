<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const user = authStore.user

// Mock data for the dashboard stats
const stats = ref({
  activeStudents: 42,
  generationsToday: 128,
  pendingAssignments: 5
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-ink pb-24">
    
    <!-- Header -->
    <header class="border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <!-- Logo -->
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink">
            <path d="M12 2L12 22M2 12L22 12M5 5L19 19M5 19L19 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span class="font-display text-2xl font-medium tracking-tight">智绘控制台</span>
        </div>
        
        <div class="flex items-center gap-6">
          <div class="text-body-sm font-medium text-muted">
            欢迎回来, <span class="text-ink">{{ user?.displayName || '王老师' }}</span>
          </div>
          <button @click="handleLogout" class="text-body-sm font-medium text-muted hover:text-error transition-colors">
            退出登录
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 mt-16 space-y-16">
      
      <!-- Stats Overview Section -->
      <section>
        <h2 class="font-display text-3xl mb-8">数据概览</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div class="border border-hairline bg-transparent rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div class="text-muted text-body-sm font-medium mb-2">活跃学生 (本周)</div>
            <div class="font-display text-5xl text-ink">{{ stats.activeStudents }}</div>
            <div class="mt-4 text-xs text-success font-medium flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              较上周增长 12%
            </div>
          </div>
          
          <div class="border border-hairline bg-transparent rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div class="text-muted text-body-sm font-medium mb-2">今日生成次数</div>
            <div class="font-display text-5xl text-ink">{{ stats.generationsToday }}</div>
            <div class="mt-4 text-xs text-muted font-medium">总消耗约 3.2w Tokens</div>
          </div>
          
          <div class="border border-hairline bg-transparent rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div class="text-muted text-body-sm font-medium mb-2">待批改作业</div>
            <div class="font-display text-5xl text-error">{{ stats.pendingAssignments }}</div>
            <div class="mt-4 text-xs text-error font-medium cursor-pointer hover:underline">去批改 &rarr;</div>
            <div class="absolute -right-4 -bottom-4 bg-error/5 w-32 h-32 rounded-full blur-2xl pointer-events-none"></div>
          </div>
          
        </div>
      </section>

      <!-- Quick Actions / Bento Grid -->
      <section>
        <h2 class="font-display text-3xl mb-8">功能管理</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- Card 1: Models -->
          <router-link to="/teacher/models" class="group border border-hairline bg-surface-card rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
            <div class="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
            </div>
            <h3 class="font-display text-2xl text-ink mb-3">模型与接口配置</h3>
            <p class="text-body-sm text-muted mb-8 flex-grow">管理大语言模型与绘画 API 接口，为不同年级分配最适合的底层模型权限。</p>
            <div class="text-primary font-medium text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              进入管理 <span class="text-lg">&rarr;</span>
            </div>
          </router-link>
          
          <!-- Card 2: Assignments -->
          <router-link to="/teacher/assignments" class="group border border-hairline bg-surface-card rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg hover:border-accent-amber/30 transition-all duration-300 flex flex-col h-full">
            <div class="w-12 h-12 rounded-lg bg-accent-amber/10 text-accent-amber flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </div>
            <h3 class="font-display text-2xl text-ink mb-3">班级作业批改</h3>
            <p class="text-body-sm text-muted mb-8 flex-grow">发布新作业，查看学生生成的艺术作品，并结合 AI 辅导建议进行批改与评分。</p>
            <div class="text-accent-amber font-medium text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              进入管理 <span class="text-lg">&rarr;</span>
            </div>
          </router-link>

          <!-- Card 3: Students & Quotas -->
          <router-link to="/teacher/students" class="group border border-hairline bg-surface-card rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg hover:border-accent-teal/30 transition-all duration-300 flex flex-col h-full">
            <div class="w-12 h-12 rounded-lg bg-accent-teal/10 text-accent-teal flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
            <h3 class="font-display text-2xl text-ink mb-3">学生额度管理</h3>
            <p class="text-body-sm text-muted mb-8 flex-grow">管理班级名单，查看每位学生的 Tokens 消耗情况，并设置每日/每月的生成限额。</p>
            <div class="text-accent-teal font-medium text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              进入管理 <span class="text-lg">&rarr;</span>
            </div>
          </router-link>

          <!-- Card 4: Templates -->
          <router-link to="/teacher/templates" class="group border border-hairline bg-surface-card rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg hover:border-accent-purple/30 transition-all duration-300 flex flex-col h-full">
            <div class="w-12 h-12 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <h3 class="font-display text-2xl text-ink mb-3">提示词模板库</h3>
            <p class="text-body-sm text-muted mb-8 flex-grow">创建包含变量的填空框架，降低学生提示词编写门槛。</p>
            <div class="text-accent-purple font-medium text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              进入管理 <span class="text-lg">&rarr;</span>
            </div>
          </router-link>

          <!-- Card 5: Live Screen -->
          <router-link to="/teacher/live" class="group border border-hairline bg-surface-card rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg hover:border-error/30 transition-all duration-300 flex flex-col h-full">
            <div class="w-12 h-12 rounded-lg bg-error/10 text-error flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative">
              <div class="absolute inset-0 rounded-lg bg-error/20 animate-ping"></div>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 class="font-display text-2xl text-ink mb-3">课堂大屏直播</h3>
            <p class="text-body-sm text-muted mb-8 flex-grow">专为教室投屏设计，实时滚动展示全班学生生成的艺术作品。</p>
            <div class="text-error font-medium text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              打开大屏 <span class="text-lg">&rarr;</span>
            </div>
          </router-link>

        </div>
      </section>

    </main>
  </div>
</template>
