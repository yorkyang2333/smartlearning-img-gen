<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Template {
  id: string
  title: string
  description: string
  category: string
  templateContent: string
}

const templates = ref<Template[]>([])
const loading = ref(false)
const isModalOpen = ref(false)
const isSubmitting = ref(false)

const formData = ref({
  title: '',
  description: '',
  category: '',
  templateContent: ''
})

const fetchTemplates = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/templates', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      templates.value = await res.json()
    }
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
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
      await fetchTemplates()
      isModalOpen.value = false
      formData.value = { title: '', description: '', category: '', templateContent: '' }
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('确定删除此模板吗？')) return
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/templates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      await fetchTemplates()
    }
  } catch (e) {
    console.error(e)
  }
}

// Helper to highlight variables in braces {like_this}
const renderTemplateParts = (content: string) => {
  if (!content) return []
  return content.split(/(\{.*?\})/)
}

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-ink pb-24 relative">
    <header class="border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button @click="router.push('/teacher/dashboard')" class="text-muted hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
          <span>&larr;</span> 返回控制台
        </button>
        <button @click="isModalOpen = true" class="bg-primary hover:bg-primary-active text-white px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm hover:shadow-md">
          + 新增模板
        </button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 mt-12">
      <h1 class="font-display text-4xl mb-2">提示词模板库</h1>
      <p class="text-body-md text-muted mb-12">创建包含变量的填空框架，降低学生编写 Prompt 的门槛。</p>
      
      <div v-if="loading" class="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="h-48 bg-surface-card rounded-xl border border-hairline w-full" v-for="i in 3" :key="i"></div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="t in templates" 
          :key="t.id"
          class="bg-surface-card rounded-xl border border-hairline p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col group"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="font-display text-xl text-ink">{{ t.title }}</h3>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-dark/10 text-muted border border-hairline">
              {{ t.category || '通用' }}
            </span>
          </div>
          
          <p class="text-body-sm text-muted mb-6">{{ t.description }}</p>
          
          <div class="bg-canvas border border-hairline rounded-lg p-4 font-mono text-sm leading-relaxed flex-grow">
            <template v-for="(part, i) in renderTemplateParts(t.templateContent)" :key="i">
              <span v-if="part.startsWith('{') && part.endsWith('}')" class="text-primary bg-primary/10 px-1 py-0.5 rounded mx-0.5">
                {{ part }}
              </span>
              <span v-else class="text-ink/80">{{ part }}</span>
            </template>
          </div>

          <div class="mt-6 pt-4 border-t border-hairline flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="handleDelete(t.id)" class="text-sm text-error hover:text-error/80 font-medium">
              删除模板
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal overlay -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-surface-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div class="px-8 py-6 border-b border-hairline bg-canvas">
          <h2 class="font-display text-2xl">创建新模板</h2>
        </div>
        
        <form @submit.prevent="handleSubmit" class="p-8 space-y-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-2">模板名称</label>
            <input required v-model="formData.title" type="text" class="w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary transition-colors text-sm" placeholder="例如：电影级人像">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-ink mb-2">分类</label>
              <input v-model="formData.category" type="text" class="w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary transition-colors text-sm" placeholder="例如：人物">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink mb-2">功能描述</label>
            <input v-model="formData.description" type="text" class="w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary transition-colors text-sm" placeholder="一句话描述该模板的用途">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-ink mb-2">模板内容 <span class="text-muted font-normal">(使用 {变量名} 设置填空项)</span></label>
            <textarea required v-model="formData.templateContent" rows="4" class="w-full bg-canvas border border-hairline rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm font-mono" placeholder="例如: 一个{职业}在{场景}里，{光影}，8k分辨率"></textarea>
          </div>

          <div class="pt-4 flex gap-3">
            <button type="button" @click="isModalOpen = false" class="flex-1 px-4 py-2.5 border border-hairline rounded-lg text-ink font-medium hover:bg-surface-dark/5 transition-colors text-sm">
              取消
            </button>
            <button type="submit" :disabled="isSubmitting" class="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-active transition-colors text-sm disabled:opacity-50">
              {{ isSubmitting ? '保存中...' : '保存模板' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
