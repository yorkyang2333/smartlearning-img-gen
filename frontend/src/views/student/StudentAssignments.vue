<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Assignment {
  id: string
  title: string
  description: string
  type: string
  deadline: string
}

const assignments = ref<Assignment[]>([])
const loading = ref(false)

const fetchAssignments = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/student/assignments', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const json = await res.json()
      assignments.value = json.data
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
  <div class="p-12 max-w-5xl mx-auto">
    <div class="mb-12">
      <h1 class="font-display text-4xl mb-2 text-ink">教学任务</h1>
      <p class="text-body-md text-muted">查看并完成老师布置的练习作业。</p>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-24 bg-surface-card rounded-xl w-full" v-for="i in 2" :key="i"></div>
    </div>
    
    <div v-else-if="assignments.length === 0" class="text-center py-24 bg-surface-card rounded-2xl border border-hairline">
      <h2 class="font-display text-2xl text-ink mb-4">暂无作业</h2>
      <p class="text-muted">老师目前尚未发布任何任务，去自由生成区玩耍吧！</p>
    </div>

    <div v-else class="space-y-6">
      <div 
        v-for="assignment in assignments" 
        :key="assignment.id"
        class="bg-surface-card rounded-xl border border-hairline p-8 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex justify-between items-center group"
      >
        <div>
          <div class="flex items-center gap-3 mb-3">
            <h3 class="font-display text-xl text-ink">{{ assignment.title }}</h3>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {{ assignment.type === 'FREE_GEN' ? '自由创作' : '指定任务' }}
            </span>
          </div>
          <p class="text-body-sm text-muted max-w-2xl">{{ assignment.description }}</p>
        </div>
        
        <div class="text-right">
          <div class="text-sm font-medium text-muted mb-2">
            截止时间: {{ new Date(assignment.deadline).toLocaleDateString() }}
          </div>
          <button class="text-primary font-medium text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            去完成 &rarr;
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
