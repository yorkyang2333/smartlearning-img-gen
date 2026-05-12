<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const assignments = ref<any[]>([])
const loading = ref(true)

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

const handleToggleActive = async (id: string, currentStatus: boolean) => {
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/assignments/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ isActive: !currentStatus })
    })
    if (res.ok) {
      fetchAssignments()
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchAssignments()
})
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto; padding-bottom: 64px;">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">教学任务</h1>
        <p class="editorial-subtitle">发布和管理班级的学习任务与创作挑战。</p>
      </div>
      <button @click="router.push('/teacher/assignments/new')" class="btn btn-primary">
        + 发布新任务
      </button>
    </div>

    <div v-if="loading" style="padding: 48px; color: var(--muted);">加载中...</div>

    <div v-else style="display: flex; flex-direction: column; gap: 16px;">
      <div v-for="assignment in assignments" :key="assignment.id" class="glass-panel" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; padding-right: 24px;">
            <h3 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--ink); cursor: pointer;" @click="router.push(`/teacher/assignments/${assignment.id}`)">
                {{ assignment.title }}
              </span>
              <span v-if="assignment.type === 'CHALLENGE'" style="font-size: 12px; background: var(--accent-amber); color: #fff; padding: 2px 6px; border-radius: 4px;">限时挑战</span>
            </h3>
            <p style="color: var(--muted); margin-top: 8px; font-size: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              {{ assignment.description }}
            </p>
            <div style="margin-top: 16px; display: flex; gap: 16px; font-size: 13px; color: var(--muted);">
               <span style="font-weight: 500; color: var(--primary);">已提交: {{ assignment._count?.submissions || 0 }} 份</span>
               <span>状态: {{ assignment.isActive ? '🟢 进行中' : '⚪ 已结束' }}</span>
               <span>发布于: {{ new Date(assignment.createdAt).toLocaleDateString() }}</span>
               <span v-if="assignment.type === 'CHALLENGE' && assignment.durationMin">时长: {{ assignment.durationMin }} 分钟</span>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px; width: 120px;">
             <a v-if="assignment.type === 'CHALLENGE' && assignment.isActive" :href="`/teacher/assignments/${assignment.id}/live`" target="_blank" class="btn btn-primary" style="width: 100%; background: var(--accent-amber); border: none; color: #fff;">
                进入大屏
             </a>
             <button v-else @click="router.push(`/teacher/assignments/${assignment.id}`)" class="btn btn-primary" style="width: 100%;">
                查看评阅
             </button>
             <button 
                class="btn btn-secondary"
                style="width: 100%;"
                @click="handleToggleActive(assignment.id, assignment.isActive)"
             >
                {{ assignment.isActive ? '结束任务' : '重新开启' }}
             </button>
          </div>
        </div>
      </div>

      <div v-if="assignments.length === 0" class="glass-panel" style="text-align: center; padding: 64px; color: var(--muted);">
         暂无任务，请点击右上角按钮发布新任务。
      </div>
    </div>
  </div>
</template>
