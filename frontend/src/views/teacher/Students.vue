<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

interface Student {
  id: string
  username: string
  displayName: string
  isActive: boolean
  tokenQuota: number
  createdAt: string
  _count?: { generations: number }
}

const students = ref<Student[]>([])
const loading = ref(false)

const isAdding = ref(false)
const formData = ref({ username: '', password: '', displayName: '' })

const editingId = ref<string | null>(null)
const editData = ref({ displayName: '', password: '', isActive: true })
const isDeleting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

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

const handleAdd = async (e: Event) => {
  e.preventDefault()
  const res = await fetch('http://localhost:8080/api/teacher/students', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    },
    body: JSON.stringify(formData.value)
  })
  if (res.ok) {
    isAdding.value = false
    formData.value = { username: '', password: '', displayName: '' }
    fetchStudents()
  } else {
    const data = await res.json()
    alert(data.error || '添加失败')
  }
}

const triggerCsvUpload = () => {
  fileInput.value?.click()
}

const handleCsvUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const text = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  const studentsList = lines.map(l => {
    const [username, displayName, password] = l.split(',').map(s => s.trim())
    return { username, displayName, password }
  }).filter(s => s.username && s.displayName && s.password)

  if (studentsList.length === 0) {
    alert('CSV 格式错误或为空。请提供包含账号,姓名,密码三列的 CSV 文件。')
    return
  }

  if (!confirm(`准备导入 ${studentsList.length} 名学生，确定吗？`)) return

  const res = await fetch('http://localhost:8080/api/teacher/students/batch', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    },
    body: JSON.stringify({ students: studentsList })
  })
  
  if (res.ok) {
    alert('导入成功')
    fetchStudents()
    isAdding.value = false
  } else {
    const data = await res.json()
    alert(data.error || '导入失败')
  }
  if (fileInput.value) fileInput.value.value = ''
}

const handleEdit = (student: Student) => {
  editingId.value = student.id
  editData.value = { displayName: student.displayName, password: '', isActive: student.isActive ?? true }
}

const handleSaveEdit = async (id: string) => {
  const res = await fetch(`http://localhost:8080/api/teacher/students/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    },
    body: JSON.stringify(editData.value)
  })
  if (res.ok) {
    editingId.value = null
    fetchStudents()
  } else {
    const data = await res.json()
    alert(data.error || '修改失败')
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('警告：您即将删除该学生。这将同时硬删除其所有生图记录和历史对话！此操作不可恢复。确定要删除吗？')) return
  isDeleting.value = true
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/students/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      fetchStudents()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchStudents()
})
</script>

<template>
  <div style="max-width: 1200px; margin: 0 auto;">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">学生管理</h1>
        <p class="editorial-subtitle">查看班级成员及学习数据统计。</p>
      </div>
      <button class="btn btn-primary" @click="isAdding = !isAdding">
        {{ isAdding ? '取消' : '添加学生' }}
      </button>
    </div>

    <div v-if="isAdding" class="glass-panel" style="padding: 1.5rem; margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1.2rem; margin: 0;">添加新学生</h2>
        <div>
          <input type="file" accept=".csv" ref="fileInput" style="display: none;" @change="handleCsvUpload" />
          <button class="btn btn-secondary" @click="triggerCsvUpload">
            批量导入 (CSV)
          </button>
        </div>
      </div>
      <form @submit="handleAdd" style="display: flex; gap: 1rem; align-items: flex-end;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">学号/账号</label>
          <input required v-model="formData.username" style="width: 100%;" />
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">姓名</label>
          <input required v-model="formData.displayName" style="width: 100%;" />
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">密码</label>
          <input required type="password" v-model="formData.password" style="width: 100%;" />
        </div>
        <button type="submit" class="btn btn-primary" style="height: 42px;">保存单个</button>
      </form>
    </div>

    <div class="glass-panel">
      <div v-if="loading" style="padding: 2rem; text-align: center;">加载中...</div>
      <div v-else-if="students.length === 0" style="padding: 2rem; text-align: center; color: var(--muted);">暂无学生，请先添加</div>
      <table v-else style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--hairline);">
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">账号</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">姓名</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">状态</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">加入时间</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">生成次数</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500; text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in students" :key="student.id" :style="{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: editingId === student.id ? 'var(--surface-cream-strong)' : 'transparent' }">
            <td style="padding: 1rem;">{{ student.username }}</td>
            <td style="padding: 1rem;">
              <input v-if="editingId === student.id" v-model="editData.displayName" style="padding: 0.4rem; width: 120px;" />
              <span v-else>{{ student.displayName }}</span>
            </td>
            <td style="padding: 1rem;">
              <select v-if="editingId === student.id" v-model="editData.isActive" style="padding: 0.4rem;">
                <option :value="true">正常</option>
                <option :value="false">已停用</option>
              </select>
              <span v-else :style="{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: student.isActive !== false ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: student.isActive !== false ? '#15803d' : '#b91c1c' }">
                {{ student.isActive !== false ? '正常' : '已停用' }}
              </span>
            </td>
            <td style="padding: 1rem; color: var(--muted);">{{ new Date(student.createdAt).toLocaleDateString('zh-CN') }}</td>
            <td style="padding: 1rem;">{{ student._count?.generations || 0 }}</td>
            <td style="padding: 1rem; text-align: right;">
              <div v-if="editingId === student.id" style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                <input type="password" placeholder="留空不改密码" v-model="editData.password" style="padding: 0.4rem; width: 120px; font-size: 0.8rem;" />
                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem;" @click="handleSaveEdit(student.id)">保存</button>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem;" @click="editingId = null">取消</button>
              </div>
              <div v-else style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem;" @click="handleEdit(student)">编辑</button>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; color: var(--error);" @click="handleDelete(student.id)" :disabled="isDeleting">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
