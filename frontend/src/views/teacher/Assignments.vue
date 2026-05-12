<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Assignment {
  id: string
  title: string
  description: string
  type: string
  status: string
  createdAt: string
  deadline: string
}

const assignments = ref<Assignment[]>([])
const loading = ref(false)

const fetchAssignments = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/assignments', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      assignments.value = await res.json()
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAssignments()
})
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-ink pb-24">
    <header class="border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button @click="router.push('/teacher/dashboard')" class="text-muted hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
          <span>&larr;</span> 返回控制台
        </button>
        <button class="bg-primary hover:bg-primary-active text-white px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm hover:shadow-md">
          发布新作业
        </button>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 mt-12">
      <div class="flex justify-between items-end mb-12">
        <div>
          <h1 class="font-display text-4xl mb-2">班级作业管理</h1>
          <p class="text-body-md text-muted">发布绘画与辅导作业，查看学生提交的艺术作品并进行评价。</p>
        </div>
      </div>

      <div v-if="loading" class="animate-pulse space-y-4">
        <div class="h-32 bg-surface-card rounded-xl w-full" v-for="i in 2" :key="i"></div>
      </div>

      <div v-else class="space-y-6">
        <div 
          v-for="assignment in assignments" 
          :key="assignment.id"
          class="bg-surface-card rounded-xl border border-hairline p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer flex justify-between items-center group"
        >
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-display text-xl text-ink">{{ assignment.title }}</h3>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-dark/10 text-muted">
                {{ assignment.type === 'FREE_GEN' ? '自由创作' : 'AI 辅导作业' }}
              </span>
            </div>
            <p class="text-body-sm text-muted max-w-2xl truncate">{{ assignment.description }}</p>
          </div>
          
          <div class="text-right">
            <div class="text-sm font-medium text-muted mb-1">
              截止时间: {{ new Date(assignment.deadline).toLocaleDateString() }}
            </div>
            <div class="text-primary font-medium text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              查看提交 &rarr;
            </div>
          </div>
        </div>

        <div v-if="assignments.length === 0" class="text-center py-24 bg-surface-card rounded-xl border border-hairline">
          <div class="w-16 h-16 rounded-full bg-accent-amber/10 flex items-center justify-center text-accent-amber mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          </div>
          <h3 class="font-display text-xl text-ink mb-2">暂无已发布的作业</h3>
          <p class="text-muted text-sm">点击右上角的按钮发布您的第一份艺术作业。</p>
        </div>
      </div>
    </main>
  </div>
</template>
