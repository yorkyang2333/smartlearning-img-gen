<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const API = 'http://localhost:8080'

interface ClassGroup {
  id: string
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
}

interface Student {
  id: string
  username: string
  displayName: string
  isActive: boolean
  tokenQuota: number
  classGroupId: string | null
  createdAt: string
  _count?: { generations: number }
}

const classes = ref<ClassGroup[]>([])
const students = ref<Student[]>([])
const loading = ref(false)
const activeTab = ref<string>('all')

const isAdding = ref(false)
const formData = ref({ username: '', password: '', displayName: '', classGroupId: '' })

const editingId = ref<string | null>(null)
const editData = ref({ displayName: '', password: '', isActive: true, classGroupId: '' })
const isDeleting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const isAddingClass = ref(false)
const classFormData = ref({ name: '', description: '' })
const editingClassId = ref<string | null>(null)
const editClassData = ref({ name: '', description: '' })

const selectedStudents = ref<Set<string>>(new Set())
const batchMoveTarget = ref('')

// --- Computed ---
const filteredStudents = computed(() => {
  if (activeTab.value === 'all') return students.value
  if (activeTab.value === 'unassigned') return students.value.filter(s => !s.classGroupId)
  return students.value.filter(s => s.classGroupId === activeTab.value)
})

const activeClass = computed(() => {
  if (activeTab.value === 'all' || activeTab.value === 'unassigned') return null
  return classes.value.find(c => c.id === activeTab.value) || null
})

const classStudentCount = (classId: string) => students.value.filter(s => s.classGroupId === classId).length
const unassignedCount = computed(() => students.value.filter(s => !s.classGroupId).length)

const classNameById = (id: string | null) => {
  if (!id) return '未分班'
  return classes.value.find(c => c.id === id)?.name || '未分班'
}

// --- API helpers ---
const headers = () => ({ 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' })
const authHeaders = () => ({ 'Authorization': `Bearer ${authStore.token}` })

// --- Fetch ---
const fetchClasses = async () => {
  const res = await fetch(`${API}/api/teacher/classes`, { headers: authHeaders() })
  if (res.ok) classes.value = await res.json()
}

const fetchStudents = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API}/api/teacher/students`, { headers: authHeaders() })
    if (res.ok) students.value = await res.json()
  } finally {
    loading.value = false
  }
}

// --- Class CRUD ---
const handleAddClass = async () => {
  if (!classFormData.value.name.trim()) return
  const res = await fetch(`${API}/api/teacher/classes`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify(classFormData.value)
  })
  if (res.ok) {
    isAddingClass.value = false
    classFormData.value = { name: '', description: '' }
    fetchClasses()
  } else {
    const data = await res.json()
    alert(data.error || '创建失败')
  }
}

const startEditClass = (c: ClassGroup) => {
  editingClassId.value = c.id
  editClassData.value = { name: c.name, description: c.description || '' }
}

const handleSaveClass = async () => {
  if (!editingClassId.value) return
  const res = await fetch(`${API}/api/teacher/classes/${editingClassId.value}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(editClassData.value)
  })
  if (res.ok) {
    editingClassId.value = null
    fetchClasses()
  }
}

const handleDeleteClass = async (id: string) => {
  const name = classes.value.find(c => c.id === id)?.name || ''
  if (!confirm(`确定删除班级「${name}」吗？班级内的学生将变为未分班状态，不会被删除。`)) return
  const res = await fetch(`${API}/api/teacher/classes/${id}`, {
    method: 'DELETE', headers: authHeaders()
  })
  if (res.ok) {
    if (activeTab.value === id) activeTab.value = 'all'
    fetchClasses()
    fetchStudents()
  }
}

// --- Student CRUD ---
const handleAdd = async (e: Event) => {
  e.preventDefault()
  const payload: Record<string, string> = {
    username: formData.value.username,
    displayName: formData.value.displayName,
    password: formData.value.password
  }
  if (formData.value.classGroupId) payload.classGroupId = formData.value.classGroupId
  const res = await fetch(`${API}/api/teacher/students`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify(payload)
  })
  if (res.ok) {
    isAdding.value = false
    formData.value = { username: '', password: '', displayName: '', classGroupId: '' }
    fetchStudents()
  } else {
    const data = await res.json()
    alert(data.error || '添加失败')
  }
}

const triggerCsvUpload = () => { fileInput.value?.click() }

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
  const payload: Record<string, unknown> = { students: studentsList }
  if (formData.value.classGroupId) payload.classGroupId = formData.value.classGroupId
  const res = await fetch(`${API}/api/teacher/students/batch`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify(payload)
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
  editData.value = {
    displayName: student.displayName,
    password: '',
    isActive: student.isActive ?? true,
    classGroupId: student.classGroupId || ''
  }
}

const handleSaveEdit = async (id: string) => {
  const payload: Record<string, unknown> = {
    displayName: editData.value.displayName,
    isActive: editData.value.isActive
  }
  if (editData.value.password) payload.password = editData.value.password
  payload.classGroupId = editData.value.classGroupId || null
  const res = await fetch(`${API}/api/teacher/students/${id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(payload)
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
    const res = await fetch(`${API}/api/teacher/students/${id}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (res.ok) fetchStudents()
    else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  } finally {
    isDeleting.value = false
  }
}

// --- Batch move ---
const toggleSelect = (id: string) => {
  const s = new Set(selectedStudents.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedStudents.value = s
}

const toggleSelectAll = () => {
  if (selectedStudents.value.size === filteredStudents.value.length) {
    selectedStudents.value = new Set()
  } else {
    selectedStudents.value = new Set(filteredStudents.value.map(s => s.id))
  }
}

const handleBatchMove = async () => {
  if (selectedStudents.value.size === 0) return
  const res = await fetch(`${API}/api/teacher/students/batch-move`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({
      studentIds: Array.from(selectedStudents.value),
      classGroupId: batchMoveTarget.value || null
    })
  })
  if (res.ok) {
    selectedStudents.value = new Set()
    batchMoveTarget.value = ''
    fetchStudents()
  }
}

onMounted(() => {
  fetchClasses()
  fetchStudents()
})
</script>

<template>
  <div style="max-width: 1200px; margin: 0 auto;">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">班级及学生管理</h1>
        <p class="editorial-subtitle">管理班级分组与学生账号。</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" @click="isAddingClass = !isAddingClass">
          {{ isAddingClass ? '取消' : '+ 添加班级' }}
        </button>
        <button class="btn btn-primary" @click="isAdding = !isAdding">
          {{ isAdding ? '取消' : '+ 添加学生' }}
        </button>
      </div>
    </div>

    <!-- Add class form -->
    <div v-if="isAddingClass" class="glass-panel" style="padding: 1.5rem; margin-bottom: 1.5rem;">
      <h2 style="font-size: 1.1rem; margin: 0 0 1rem 0;">新建班级</h2>
      <div style="display: flex; gap: 1rem; align-items: flex-end;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">班级名称</label>
          <input required v-model="classFormData.name" placeholder="如：高一(3)班" style="width: 100%;" />
        </div>
        <div style="flex: 2;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">备注（可选）</label>
          <input v-model="classFormData.description" placeholder="如：美术特长班" style="width: 100%;" />
        </div>
        <button class="btn btn-primary" style="height: 42px;" @click="handleAddClass">创建</button>
      </div>
    </div>

    <!-- Add student form -->
    <div v-if="isAdding" class="glass-panel" style="padding: 1.5rem; margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1.1rem; margin: 0;">添加新学生</h2>
        <div>
          <input type="file" accept=".csv" ref="fileInput" style="display: none;" @change="handleCsvUpload" />
          <button class="btn btn-secondary" @click="triggerCsvUpload">批量导入 (CSV)</button>
        </div>
      </div>
      <form @submit="handleAdd" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 120px;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">学号/账号</label>
          <input required v-model="formData.username" style="width: 100%;" />
        </div>
        <div style="flex: 1; min-width: 120px;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">姓名</label>
          <input required v-model="formData.displayName" style="width: 100%;" />
        </div>
        <div style="flex: 1; min-width: 120px;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">密码</label>
          <input required type="password" v-model="formData.password" style="width: 100%;" />
        </div>
        <div style="flex: 1; min-width: 120px;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted);">班级</label>
          <select v-model="formData.classGroupId" style="width: 100%; height: 42px;">
            <option value="">未分班</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="height: 42px;">保存</button>
      </form>
    </div>

    <!-- Class tabs -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
      <button
        :class="['tab-btn', activeTab === 'all' ? 'tab-active' : '']"
        @click="activeTab = 'all'; selectedStudents = new Set()"
      >全部 ({{ students.length }})</button>
      <button
        v-for="c in classes" :key="c.id"
        :class="['tab-btn', activeTab === c.id ? 'tab-active' : '']"
        @click="activeTab = c.id; selectedStudents = new Set()"
      >{{ c.name }} ({{ classStudentCount(c.id) }})</button>
      <button
        :class="['tab-btn', activeTab === 'unassigned' ? 'tab-active' : '']"
        @click="activeTab = 'unassigned'; selectedStudents = new Set()"
      >未分班 ({{ unassignedCount }})</button>
    </div>

    <!-- Class info bar (when a specific class is selected) -->
    <div v-if="activeClass" class="glass-panel" style="padding: 1rem 1.5rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
      <div v-if="editingClassId === activeClass.id" style="display: flex; gap: 0.75rem; align-items: center; flex: 1;">
        <input v-model="editClassData.name" style="padding: 0.4rem; width: 150px;" />
        <input v-model="editClassData.description" placeholder="备注" style="padding: 0.4rem; width: 200px;" />
        <button class="btn btn-primary" style="padding: 0.4rem 0.8rem;" @click="handleSaveClass">保存</button>
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem;" @click="editingClassId = null">取消</button>
      </div>
      <div v-else style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-weight: 500;">{{ activeClass.name }}</span>
        <span v-if="activeClass.description" style="color: var(--muted); font-size: 0.9rem;">{{ activeClass.description }}</span>
        <span style="color: var(--muted); font-size: 0.9rem;">{{ classStudentCount(activeClass.id) }} 人</span>
      </div>
      <div v-if="editingClassId !== activeClass.id" style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem;" @click="startEditClass(activeClass)">编辑</button>
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; color: var(--error);" @click="handleDeleteClass(activeClass.id)">删除</button>
      </div>
    </div>

    <!-- Batch move bar -->
    <div v-if="selectedStudents.size > 0" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.75rem 1rem; background: var(--surface-cream-strong); border-radius: 8px;">
      <span style="font-size: 0.9rem;">已选 {{ selectedStudents.size }} 人</span>
      <select v-model="batchMoveTarget" style="padding: 0.4rem; font-size: 0.9rem;">
        <option value="">移动到：未分班</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">移动到：{{ c.name }}</option>
      </select>
      <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" @click="handleBatchMove">确认移动</button>
      <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" @click="selectedStudents = new Set()">取消选择</button>
    </div>

    <!-- Student table -->
    <div class="glass-panel">
      <div v-if="loading" style="padding: 2rem; text-align: center;">加载中...</div>
      <div v-else-if="filteredStudents.length === 0" style="padding: 2rem; text-align: center; color: var(--muted);">暂无学生</div>
      <table v-else style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--hairline);">
            <th style="padding: 1rem; width: 40px;">
              <input type="checkbox" :checked="selectedStudents.size === filteredStudents.length && filteredStudents.length > 0" @change="toggleSelectAll" />
            </th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">账号</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">姓名</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">班级</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">状态</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500;">加入时间</th>
            <th style="padding: 1rem; color: var(--muted); font-weight: 500; text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in filteredStudents" :key="student.id" :style="{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: editingId === student.id ? 'var(--surface-cream-strong)' : 'transparent' }">
            <td style="padding: 1rem;">
              <input type="checkbox" :checked="selectedStudents.has(student.id)" @change="toggleSelect(student.id)" />
            </td>
            <td style="padding: 1rem;">{{ student.username }}</td>
            <td style="padding: 1rem;">
              <input v-if="editingId === student.id" v-model="editData.displayName" style="padding: 0.4rem; width: 100px;" />
              <span v-else>{{ student.displayName }}</span>
            </td>
            <td style="padding: 1rem;">
              <select v-if="editingId === student.id" v-model="editData.classGroupId" style="padding: 0.4rem; font-size: 0.85rem;">
                <option value="">未分班</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <span v-else style="font-size: 0.9rem; color: var(--muted);">{{ classNameById(student.classGroupId) }}</span>
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
            <td style="padding: 1rem; text-align: right;">
              <div v-if="editingId === student.id" style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                <input type="password" placeholder="留空不改密码" v-model="editData.password" style="padding: 0.4rem; width: 100px; font-size: 0.8rem;" />
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

<style scoped>
.tab-btn {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid var(--hairline);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--muted);
  transition: all 0.15s;
}
.tab-btn:hover { color: var(--ink); border-color: var(--ink); }
.tab-active {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.tab-active:hover { color: #fff; }
</style>
