<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Student {
  id: string
  username: string
  displayName: string
  isActive: boolean
  tokenQuota: number
  createdAt: string
}

const students = ref<Student[]>([])
const loading = ref(false)

const fetchStudents = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/students', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      students.value = await res.json()
    }
  } finally {
    loading.value = false
  }
}

const updateQuota = async (student: Student, newQuota: number) => {
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/students/${student.id}/quota`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ quota: newQuota })
    })
    if (res.ok) {
      student.tokenQuota = newQuota
    }
  } catch (e) {
    alert("更新额度失败")
  }
}

const updateStatus = async (student: Student, isActive: boolean) => {
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/students/${student.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ isActive })
    })
    if (res.ok) {
      student.isActive = isActive
    }
  } catch (e) {
    alert("更新状态失败")
  }
}

onMounted(() => {
  fetchStudents()
})
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-ink pb-24">
    <header class="border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button @click="router.push('/teacher/dashboard')" class="text-muted hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
          <span>&larr;</span> 返回控制台
        </button>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 mt-12">
      <div class="flex justify-between items-end mb-12">
        <div>
          <h1 class="font-display text-4xl mb-2">学生名单与额度</h1>
          <p class="text-body-md text-muted">管理班级名单与每个学生的 Tokens 消耗限额。</p>
        </div>
      </div>

      <div v-if="loading" class="animate-pulse space-y-4">
        <div class="h-16 bg-surface-card rounded-lg w-full" v-for="i in 3" :key="i"></div>
      </div>

      <div v-else class="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-hairline bg-canvas/50">
              <th class="py-4 px-6 font-medium text-muted text-sm w-1/4">姓名</th>
              <th class="py-4 px-6 font-medium text-muted text-sm w-1/4">账号</th>
              <th class="py-4 px-6 font-medium text-muted text-sm w-1/4">额度 (Tokens)</th>
              <th class="py-4 px-6 font-medium text-muted text-sm w-1/4">状态操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in students" :key="student.id" class="border-b border-hairline last:border-0 hover:bg-canvas/50 transition-colors">
              <td class="py-4 px-6 font-medium">{{ student.displayName }}</td>
              <td class="py-4 px-6 text-muted text-sm font-mono">{{ student.username }}</td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-2">
                  <input 
                    type="number" 
                    :value="student.tokenQuota"
                    @change="(e) => updateQuota(student, parseInt((e.target as HTMLInputElement).value))"
                    class="w-24 bg-canvas border border-hairline rounded px-3 py-1 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </td>
              <td class="py-4 px-6">
                <button 
                  @click="updateStatus(student, !student.isActive)"
                  class="text-xs font-medium px-3 py-1.5 rounded-full transition-colors border"
                  :class="student.isActive ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' : 'bg-error/10 text-error border-error/20 hover:bg-error/20'"
                >
                  {{ student.isActive ? '正常 (点击禁用)' : '已禁用 (点击恢复)' }}
                </button>
              </td>
            </tr>
            <tr v-if="students.length === 0">
              <td colspan="4" class="py-12 text-center text-muted">
                暂无学生数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
