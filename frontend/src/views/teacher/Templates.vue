<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const templates = ref<any[]>([])
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const formData = ref({ title: '', description: '', template: '', category: '' })

const fetchTemplates = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/templates', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      templates.value = data
    }
  } catch (e) {
    console.error(e)
  }
}

const handleSubmit = async (e: Event) => {
  e.preventDefault()
  isSubmitting.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/templates', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(formData.value)
    })
    if (res.ok) {
      fetchTemplates()
      isModalOpen.value = false
      formData.value = { title: '', description: '', template: '', category: '' }
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('确定删除此模板吗？')) return
  try {
    await fetch(`http://localhost:8080/api/teacher/templates/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    fetchTemplates()
  } catch (e) {}
}

const parseTemplateParts = (templateStr: string) => {
  return templateStr.split(/(\{.*?\})/)
}

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <div class="tmpl-container">
    <div class="tmpl-header">
      <div>
        <h1>提示词模板库</h1>
        <p class="tmpl-subtitle">创建可重用的提示词框架，引导学生填空创作</p>
      </div>
      <button @click="isModalOpen = true" class="btn btn-primary">
        + 新增模板
      </button>
    </div>

    <div class="tmpl-grid">
      <div v-for="t in templates" :key="t.id" class="glass-panel tmpl-card">
        <div class="tmpl-card-header">
          <h3 class="tmpl-card-title">{{ t.title }}</h3>
          <span class="tmpl-badge">{{ t.category || '通用' }}</span>
        </div>
        <p class="tmpl-desc">{{ t.description }}</p>
        <div class="tmpl-content">
          <template v-for="(part, i) in parseTemplateParts(t.template)" :key="i">
            <span v-if="part.startsWith('{') && part.endsWith('}')" class="tmpl-var">{{ part }}</span>
            <template v-else>{{ part }}</template>
          </template>
        </div>
        <div class="tmpl-card-actions">
          <button @click="handleDelete(t.id)" class="tmpl-btn-delete">删除模板</button>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="tmpl-modal-overlay">
      <div class="glass-panel tmpl-modal">
        <h2>创建新模板</h2>
        <form @submit="handleSubmit" class="tmpl-form">
          <div class="tmpl-form-group">
            <label>模板名称</label>
            <input required type="text" v-model="formData.title" placeholder="例如：电影级人像" />
          </div>
          <div class="tmpl-form-group">
            <label>分类</label>
            <input type="text" v-model="formData.category" placeholder="例如：人物" />
          </div>
          <div class="tmpl-form-group">
            <label>功能描述</label>
            <input type="text" v-model="formData.description" />
          </div>
          <div class="tmpl-form-group">
            <label>模板内容 (使用 {变量名} 作为填空项)</label>
            <textarea required rows="4" style="font-family: var(--font-mono)" v-model="formData.template" placeholder="例如: 一个{职业}在{场景}里，{光影}，8k分辨率"></textarea>
          </div>
          <div class="tmpl-modal-actions">
            <button type="button" @click="isModalOpen = false" class="btn btn-secondary tmpl-flex-1">取消</button>
            <button type="submit" :disabled="isSubmitting" class="btn btn-primary tmpl-flex-1">
              保存模板
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tmpl-container {
  max-width: 1000px;
  margin: 0 auto;
}

.tmpl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.tmpl-subtitle {
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.tmpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.tmpl-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.tmpl-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.tmpl-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.tmpl-badge {
  background: var(--surface-cream-strong);
  color: var(--text-muted);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: var(--radius-xs);
}

.tmpl-desc {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  min-height: 2.5rem;
}

.tmpl-content {
  background: var(--surface-soft);
  padding: 1rem;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-body);
  word-break: break-all;
  height: 6rem;
  overflow-y: auto;
  margin-bottom: 1rem;
  border: 1px solid var(--hairline);
}

.tmpl-var {
  background: rgba(93, 184, 166, 0.15);
  color: var(--accent-teal);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-xs);
  margin: 0 0.2rem;
}

.tmpl-card-actions {
  display: flex;
  justify-content: flex-end;
}

.tmpl-btn-delete {
  color: var(--error);
  font-size: 0.875rem;
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
}

.tmpl-btn-delete:hover {
  text-decoration: underline;
}

.tmpl-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.tmpl-modal {
  width: 100%;
  max-width: 450px;
  padding: 1.5rem;
  background: var(--canvas);
}

.tmpl-modal h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.tmpl-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tmpl-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tmpl-form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-body);
}

.tmpl-form-group input, .tmpl-form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
}

.tmpl-modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.tmpl-flex-1 {
  flex: 1;
}
</style>
