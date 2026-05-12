<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const prompt = ref('')
const modelId = ref('gemini-3.1-flash-lite-preview')
const size = ref('1:1')

const messages = ref<{role: string, content: string}[]>([
  { role: 'assistant', content: '你好！我是你的 AI 绘画辅导员。你可以告诉我你想画什么，或者让我帮你优化提示词。' }
])
const chatInput = ref('')
const isGenerating = ref(false)
const generationOutput = ref<{url: string, time: string} | null>(null)

const chatId = route.query.chatId as string

const sendChat = async () => {
  if (!chatInput.value.trim()) return
  messages.value.push({ role: 'user', content: chatInput.value })
  const userMsg = chatInput.value
  chatInput.value = ''
  
  try {
    const res = await fetch('http://localhost:8080/api/student/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ message: userMsg, chatId })
    })
    if (res.ok) {
      const data = await res.json()
      messages.value.push(data)
    }
  } catch (e) {
    console.error(e)
  }
}

const generateImage = async () => {
  if (!prompt.value.trim()) return
  isGenerating.value = true
  generationOutput.value = null
  
  try {
    const res = await fetch('http://localhost:8080/api/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ 
        prompt: prompt.value, 
        modelId: modelId.value, 
        size: size.value,
        conversationId: chatId 
      })
    })
    
    if (res.ok) {
      // Mock successful response output since the backend uses a mock too
      generationOutput.value = {
        url: 'https://images.unsplash.com/photo-1698047525287-25e24a4131df?auto=format&fit=crop&q=80&w=1024',
        time: new Date().toLocaleTimeString()
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    isGenerating.value = false
  }
}

onMounted(() => {
  // If we had history for this chatId, we would fetch it here.
})
</script>

<template>
  <div class="h-full flex">
    <!-- Chat / Setup Column -->
    <div class="w-1/3 min-w-[360px] border-r border-hairline flex flex-col bg-surface-card">
      
      <!-- AI Tutor Chat Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span class="text-sm font-medium text-ink">AI Tutor 辅导</span>
        </div>
        
        <div v-for="(msg, i) in messages" :key="i" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed" :class="msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-canvas border border-hairline text-ink rounded-bl-none'">
            {{ msg.content }}
          </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="p-4 border-t border-hairline bg-canvas">
        <div class="relative">
          <input 
            v-model="chatInput" 
            @keyup.enter="sendChat"
            type="text" 
            class="w-full bg-surface-card border border-hairline rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            placeholder="询问修改建议..."
          >
          <button @click="sendChat" class="absolute right-2 top-1.5 bottom-1.5 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Generation Workspace Column -->
    <div class="flex-1 flex flex-col bg-canvas">
      <div class="h-16 border-b border-hairline flex items-center px-8 justify-between bg-surface-card/50 backdrop-blur">
        <div class="flex gap-4">
          <select v-model="size" class="bg-surface-card border border-hairline rounded-md px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:border-primary">
            <option value="1:1">1:1 方形</option>
            <option value="16:9">16:9 宽屏</option>
            <option value="9:16">9:16 竖屏</option>
          </select>
          <select v-model="modelId" class="bg-surface-card border border-hairline rounded-md px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:border-primary">
            <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
          </select>
        </div>
        <button @click="generateImage" :disabled="isGenerating || !prompt.trim()" class="bg-primary hover:bg-primary-active disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium text-sm transition-all shadow-sm">
          {{ isGenerating ? '生成中...' : '开始生成' }}
        </button>
      </div>

      <!-- Main Canvas Area -->
      <div class="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
        
        <!-- Prompt Box -->
        <div class="bg-surface-card border border-hairline rounded-xl p-6 shadow-sm relative">
          <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-3">提示词 (Prompt)</label>
          <textarea 
            v-model="prompt"
            rows="3"
            class="w-full bg-transparent text-ink text-body-md focus:outline-none resize-none font-serif leading-relaxed"
            placeholder="描述您想要生成的画面细节..."
          ></textarea>
        </div>

        <!-- Output Canvas -->
        <div class="flex-1 min-h-[400px] border border-hairline rounded-xl bg-surface-dark/5 flex items-center justify-center overflow-hidden relative group">
          
          <div v-if="isGenerating" class="flex flex-col items-center gap-4 text-primary">
            <svg class="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm font-medium">AI 正在绘制...</span>
          </div>

          <img v-else-if="generationOutput" :src="generationOutput.url" class="w-full h-full object-contain" alt="Generated" />
          
          <div v-else class="text-muted text-sm font-medium">
            等待生成
          </div>

          <div v-if="generationOutput" class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="bg-black/60 backdrop-blur-md text-white/90 text-xs px-3 py-1.5 rounded-full font-mono">
              {{ generationOutput.time }}
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>
