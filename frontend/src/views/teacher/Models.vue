<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const config = ref({
  enabled: true,
  modelName: 'gemini-3.1-flash-lite-preview',
  systemPrompt: ''
})
const loading = ref(false)
const saving = ref(false)
const message = ref('')

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/config', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      config.value = await res.json()
    }
  } catch (e) {
    console.error("Failed to fetch config", e)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  message.value = ''
  try {
    const res = await fetch('http://localhost:8080/api/teacher/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(config.value)
    })
    if (res.ok) {
      message.value = '配置已保存成功。'
    } else {
      message.value = '保存失败，请重试。'
    }
  } catch (e) {
    message.value = '网络错误，保存失败。'
  } finally {
    saving.value = false
    setTimeout(() => { message.value = '' }, 3000)
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <div class="min-h-screen bg-canvas font-body text-ink pb-24">
    <header class="border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button @click="router.push('/teacher/dashboard')" class="text-muted hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
          <span>&larr;</span> 返回控制台
        </button>
        <button @click="saveConfig" :disabled="saving" class="bg-primary hover:bg-primary-active text-white px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-6 mt-12">
      <h1 class="font-display text-4xl mb-2">模型与接口配置</h1>
      <p class="text-body-md text-muted mb-12">配置学生使用的底层 AI 大模型，设定默认的引导 Prompt。</p>
      
      <div v-if="message" class="mb-8 p-4 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/20">
        {{ message }}
      </div>

      <div v-if="loading" class="animate-pulse space-y-8">
        <div class="h-24 bg-surface-card rounded-xl"></div>
        <div class="h-64 bg-surface-card rounded-xl"></div>
      </div>

      <div v-else class="space-y-8">
        <!-- Status Toggle -->
        <div class="border border-hairline bg-surface-card rounded-xl p-8 flex items-center justify-between">
          <div>
            <h3 class="font-display text-xl mb-1">全局 AI 助手状态</h3>
            <p class="text-body-sm text-muted">开启后，学生方可使用 AI 绘画和辅导功能。</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="config.enabled" class="sr-only peer">
            <div class="w-14 h-7 bg-surface-dark/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
          </label>
        </div>

        <!-- Model Selection -->
        <div class="border border-hairline bg-surface-card rounded-xl p-8">
          <h3 class="font-display text-xl mb-6">核心模型引擎</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="border border-hairline rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors" :class="{'border-primary bg-primary/5': config.modelName === 'gemini-3.1-flash-lite-preview'}">
              <div class="flex items-center gap-3">
                <input type="radio" v-model="config.modelName" value="gemini-3.1-flash-lite-preview" class="text-primary focus:ring-primary h-4 w-4">
                <div>
                  <div class="font-medium">Gemini 3.1 Flash Lite</div>
                  <div class="text-xs text-muted">极速生成，适合高频绘画</div>
                </div>
              </div>
            </label>
            <label class="border border-hairline rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors" :class="{'border-primary bg-primary/5': config.modelName === 'gemini-3.1-pro-preview'}">
              <div class="flex items-center gap-3">
                <input type="radio" v-model="config.modelName" value="gemini-3.1-pro-preview" class="text-primary focus:ring-primary h-4 w-4">
                <div>
                  <div class="font-medium">Gemini 3.1 Pro</div>
                  <div class="text-xs text-muted">高质量分析，适合深度辅导</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- System Prompt -->
        <div class="border border-hairline bg-surface-card rounded-xl p-8">
          <h3 class="font-display text-xl mb-2">AI 辅导人设 (System Prompt)</h3>
          <p class="text-body-sm text-muted mb-6">设定 AI 的沟通语气与教学目标，该 Prompt 将会被附加到每个学生的会话中。</p>
          <textarea 
            v-model="config.systemPrompt" 
            rows="6"
            class="w-full bg-canvas border border-hairline rounded-lg p-4 focus:outline-none focus:border-primary transition-colors text-body-sm font-mono"
            placeholder="例如：你是一位充满耐心的艺术指导老师，请用鼓励的语气指导学生进行色彩搭配..."
          ></textarea>
        </div>
      </div>
    </main>
  </div>
</template>
