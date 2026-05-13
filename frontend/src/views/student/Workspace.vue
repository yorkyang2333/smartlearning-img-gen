<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import PromptBuilder from '../../components/PromptBuilder.vue'
import PromptHelper from '../../components/PromptHelper.vue'
import TutorDrawer from '../../components/TutorDrawer.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const chatId = computed(() => route.params.id as string || null)

type Message = {
  id: string
  role: 'user' | 'agent'
  generationId?: string
  content?: string
  image?: string
  progress?: number
  loadingText?: string
  timeMs?: number
  analysis?: {
    optimized?: string
    tips?: Array<{ dimension: string; explanation: string }>
    reviews?: Record<string, any>
  }
}

const messages = ref<Message[]>([])
const promptText = ref('')
const modelId = ref('')
const size = ref('1024x1024')
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const isGenerating = ref(false)
const activeMsgId = ref<string | null>(null)
const modelMenuOpen = ref(false)
const sizeMenuOpen = ref(false)
const isBuilderOpen = ref(false)
const isHelperOpen = ref(false)
const isParamsCollapsed = ref(false)

// Learning step: 1=构思 2=优化 3=生成 4=点评
const learningStep = computed(() => {
  if (activeMsg.value?.image) return 4
  if (isGenerating.value) return 3
  if (promptText.value.trim()) return 2
  return 1
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)

const models = ref<any[]>([])

// Fetch models
const fetchModels = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/student/models', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      models.value = data.data
    }
  } catch (err) {}
}

const fetchHistory = async () => {
  if (chatId.value) {
    try {
      const res = await fetch(`http://localhost:8080/api/student/conversations/${chatId.value}`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      const data = await res.json()
      if (data.success && data.data && data.data.messages) {
        messages.value = data.data.messages
      }
    } catch (e) {}
  } else {
    messages.value = []
  }
}

onMounted(() => {
  fetchModels()
  fetchHistory()
  
  const draftKey = `draft_prompt_${chatId.value || 'new'}`
  const savedDraft = sessionStorage.getItem(draftKey)
  if (savedDraft) {
    promptText.value = savedDraft
  }
  
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(chatId, () => {
  fetchHistory()
  const draftKey = `draft_prompt_${chatId.value || 'new'}`
  const savedDraft = sessionStorage.getItem(draftKey)
  if (savedDraft) {
    promptText.value = savedDraft
  } else {
    promptText.value = ''
  }
})

watch([promptText, chatId], () => {
  const draftKey = `draft_prompt_${chatId.value || 'new'}`
  if (promptText.value) {
    sessionStorage.setItem(draftKey, promptText.value)
  } else {
    sessionStorage.removeItem(draftKey)
  }
})

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    modelMenuOpen.value = false
    sizeMenuOpen.value = false
  }
}

const currentMode = computed(() => imageFile.value ? 'i2i' : 't2i')

const availableModels = computed(() => {
  return models.value.filter((m: any) => {
    if (currentMode.value === 't2i') return m.type === 'TEXT_TO_IMAGE' || m.type === 'BOTH'
    if (currentMode.value === 'i2i') return m.type === 'IMAGE_TO_IMAGE' || m.type === 'BOTH'
    return false
  })
})

const isPreferredGptImage2 = (model: any) => {
  const name = model.name?.toLowerCase() || ''
  return model.modelId === 'gpt-image-2' || name.includes('gpt image 2')
}

const getModelBrand = (model: any) => {
  const name = model.name?.toLowerCase() || ''
  if (name.includes('gpt') || name.includes('dall')) return 'OpenAI 系列'
  if (name.includes('gemini') || name.includes('google')) return 'Google 系列'
  return '其他生态'
}

const getDefaultModel = () => {
  if (currentMode.value === 't2i') {
    return availableModels.value.find((m: any) => isPreferredGptImage2(m))
      || availableModels.value[0]
  }

  return availableModels.value[0]
}

watch([availableModels, currentMode], () => {
  if (availableModels.value.length > 0 && !availableModels.value.find((m: any) => m.modelId === modelId.value)) {
    modelId.value = getDefaultModel()?.modelId || ''
  }
}, { immediate: true })

const selectedModel = computed(() => availableModels.value.find((m: any) => m.modelId === modelId.value))
const config = computed(() => selectedModel.value ? JSON.parse(selectedModel.value.config) : {})
const availableSizes = computed(() => Array.isArray(config.value?.sizes) ? config.value.sizes : [])

watch(availableSizes, (sizes) => {
  if (sizes.length === 0) return
  if (!sizes.includes(size.value)) {
    size.value = sizes[0]
  }
}, { immediate: true })

const groupedModels = computed(() => {
  const acc: any = {}
  const brandPriority: Record<string, number> = {
    'OpenAI 系列': 0,
    'Google 系列': 1,
    '其他生态': 2
  }

  const sortedModels = [...availableModels.value].sort((a: any, b: any) => {
    const preferredDiff = Number(isPreferredGptImage2(b)) - Number(isPreferredGptImage2(a))
    if (preferredDiff !== 0) return preferredDiff

    const brandDiff = (brandPriority[getModelBrand(a)] ?? 99) - (brandPriority[getModelBrand(b)] ?? 99)
    if (brandDiff !== 0) return brandDiff

    return (a.name || '').localeCompare(b.name || '', 'zh-CN')
  })

  sortedModels.forEach((model: any) => {
    const brand = getModelBrand(model)
    if (!acc[brand]) acc[brand] = []
    acc[brand].push(model)
  })
  return acc
})

const getModelMeta = (name: string) => {
  if (!name) return { icon: '📦', desc: '标准创作引擎' }
  const n = name.toLowerCase()
  if (n.includes('dall-e 3')) return { icon: '✨', desc: '顶级语义理解，细节丰富' }
  if (n.includes('dall-e 2')) return { icon: '🎨', desc: '经典画质，适合抽象风格' }
  if (n.includes('gpt image 2')) return { icon: '⚡', desc: '快速生成，构图优秀' }
  if (n.includes('gemini 3 pro')) return { icon: '🧠', desc: '多模态强，光影自然' }
  if (n.includes('gemini 3.1')) return { icon: '🚀', desc: '极速出图，强劲性能' }
  if (n.includes('gemini')) return { icon: '💎', desc: '高性价比，清晰锐利' }
  return { icon: '📦', desc: '标准创作引擎' }
}

const canonicalRatios = [
  { key: '1:1', value: 1, label: '正方形' },
  { key: '2:3', value: 2 / 3, label: '海报竖版' },
  { key: '3:2', value: 3 / 2, label: '经典横版' },
  { key: '3:4', value: 3 / 4, label: '经典竖版' },
  { key: '4:3', value: 4 / 3, label: '经典横版' },
  { key: '4:5', value: 4 / 5, label: '社媒竖版' },
  { key: '5:4', value: 5 / 4, label: '方形横版' },
  { key: '9:16', value: 9 / 16, label: '手机竖屏' },
  { key: '16:9', value: 16 / 9, label: '宽画幅' },
  { key: '21:9', value: 21 / 9, label: '电影宽屏' }
]

const getSizeMeta = (sizeStr: string) => {
  const parts = sizeStr.split('x').map(v => Number(v))
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1]) || parts[0] <= 0 || parts[1] <= 0) {
    return { label: sizeStr, shape: { width: '14px', height: '14px' } }
  }

  const [width, height] = parts
  const ratio = width / height

  const matchedRatio = canonicalRatios.reduce((best, candidate) => {
    const diff = Math.abs(candidate.value - ratio)
    return diff < best.diff ? { candidate, diff } : best
  }, { candidate: canonicalRatios[0], diff: Number.POSITIVE_INFINITY }).candidate

  const scale = 16
  const normalizedWidth = Math.max(6, Math.round((width / Math.max(width, height)) * scale))
  const normalizedHeight = Math.max(6, Math.round((height / Math.max(width, height)) * scale))

  return {
    label: `${matchedRatio.key} ${matchedRatio.label}`,
    shape: { width: `${normalizedWidth}px`, height: `${normalizedHeight}px` }
  }
}

const handleImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    imageFile.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

const removeImage = () => {
  imageFile.value = null
  imagePreview.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleSend = async () => {
  if (!promptText.value.trim() && !imageFile.value) return

  const currentPrompt = promptText.value
  
  // Add User Message
  const userMsgId = Date.now().toString()
  messages.value.push({
    id: userMsgId,
    role: 'user',
    content: currentPrompt,
    image: imagePreview.value || undefined
  })
  
  imageFile.value = null
  imagePreview.value = null
  isGenerating.value = true
  isParamsCollapsed.value = true
  
  // Add Agent Loading Message
  const agentMsgId = (Date.now() + 1).toString()
  messages.value.push({
    id: agentMsgId,
    role: 'agent',
    progress: 0,
    loadingText: '正在构思视觉元素...'
  })
  
  activeMsgId.value = agentMsgId

  try {
    const endpoint = currentMode.value === 't2i' 
      ? 'http://localhost:8080/api/generate/text-to-image' 
      : 'http://localhost:8080/api/generate/image-to-image'
    
    let body: any
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${authStore.token}`
    }

    if (currentMode.value === 't2i') {
      const bodyObj: any = { prompt: currentPrompt, modelId: modelId.value, size: size.value, n: 1 }
      if (chatId.value) bodyObj.conversationId = chatId.value
      body = JSON.stringify(bodyObj)
      headers['Content-Type'] = 'application/json'
    } else {
      if (!imageFile.value) {
        throw new Error('请先上传参考图片')
      }

      body = new FormData()
      body.append('prompt', currentPrompt)
      body.append('modelId', modelId.value)
      body.append('size', size.value)
      body.append('image', imageFile.value)
      if (chatId.value) body.append('conversationId', chatId.value)
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error || '生成失败')
    }

    // Update agent message
    const msgIndex = messages.value.findIndex(m => m.id === agentMsgId)
    if (msgIndex !== -1) {
      if (!data.rawUrl) {
        messages.value[msgIndex] = { 
          ...messages.value[msgIndex], 
          progress: 100, 
          loadingText: undefined,
          content: '图片生成成功，但无法解析出画面。请检查模型是否支持生图或后端日志。'
        }
      } else {
        messages.value[msgIndex] = { 
          ...messages.value[msgIndex], 
          generationId: data.generationId,
          progress: 100, 
          loadingText: undefined,
          image: data.rawUrl,
          timeMs: data.data?.durationMs,
          analysis: data.apiResponse ? data.apiResponse : undefined
        }
        // Auto-open tutor drawer after generation success
      }
    }

    if (!chatId.value && data.conversationId) {
      router.push(`/student/generate/${data.conversationId}`)
    }

  } catch (err: any) {
    const msgIndex = messages.value.findIndex(m => m.id === agentMsgId)
    if (msgIndex !== -1) {
      messages.value[msgIndex] = { 
        ...messages.value[msgIndex], 
        progress: undefined,
        loadingText: undefined,
        content: `生成出错: ${err.message}`
      }
    }
  } finally {
    isGenerating.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (!isGenerating.value) handleSend()
  }
}

const agentMessages = computed(() => {
  return messages.value.filter(m => m.role === 'agent' && (m.image || m.progress !== undefined || m.content))
})

const activeMsg = computed(() => {
  const am = agentMessages.value
  return am.find(m => m.id === activeMsgId.value) || am[am.length - 1]
})
</script>

<template>
  <div class="workspace-layout">
    <!-- 中间画布区（最宽） -->
    <div class="canvas-area">
      <button v-if="isParamsCollapsed" class="expand-params-btn" @click="isParamsCollapsed = false" title="展开参数面板">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      </button>
      <div class="canvas-main">
        <template v-if="activeMsg">
          <div class="canvas-content">
            <template v-if="activeMsg.progress !== undefined && activeMsg.progress < 100">
              <div class="generating-overlay">
                <div class="ai-loader">
                  <div class="ai-loader-ring"></div>
                  <div class="ai-loader-core"></div>
                </div>
                <div class="loading-text">正在通过 {{ selectedModel?.name || 'AI' }} 构思视觉元素...</div>
              </div>
            </template>
            <template v-else-if="activeMsg.image">
              <div class="image-wrapper">
                <img :src="activeMsg.image" alt="Generated" class="main-image" />
                <div class="image-actions">
                  <a :href="activeMsg.image" download="creation.png" target="_blank" rel="noreferrer" class="btn btn-secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    下载大图
                  </a>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="error-state">
                <div class="error-visual">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 class="serif-display">无法显示画面</h3>
                <p>{{ activeMsg.content || '生成响应解析异常，请检查网络或模型配置。' }}</p>
                <button class="btn btn-secondary" @click="handleSend">重试生成</button>
              </div>
            </template>
          </div>
        </template>
        <template v-else>
          <div class="empty-state">
            <span class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </span>
            <h2 class="serif-display">开启智慧创作之旅</h2>
            <p>输入提示词，体验 AI 导师辅助的学习过程</p>
            <div class="quick-prompts">
              <button class="quick-chip" @click="promptText = 'A beautiful sunset over the ocean, watercolor painting style'">🌅 海上日落</button>
              <button class="quick-chip" @click="promptText = 'A girl in a cyberpunk city, neon lighting, cinematic'">🌆 赛博少女</button>
              <button class="quick-chip" @click="promptText = 'An astronaut on a snowy mountain, realistic photography'">👨‍🚀 雪山宇航员</button>
            </div>
          </div>
        </template>
      </div>

      <!-- 历史记录缩略图 -->
      <div v-if="agentMessages.length > 0" class="history-rail">
        <div 
          v-for="msg in agentMessages" 
          :key="msg.id" 
          @click="activeMsgId = msg.id"
          class="history-item"
          :class="{ active: activeMsgId === msg.id || (!activeMsgId && msg === agentMessages[agentMessages.length-1]) }"
        >
          <div v-if="msg.progress !== undefined && msg.progress < 100" class="history-loading">
            <div class="pulse-dot"></div>
          </div>
          <img v-else-if="msg.image" :src="msg.image" alt="history" />
          <div v-else class="history-error">!</div>
        </div>
      </div>
    </div>



    <!-- 左侧参数控制台 -->
    <div class="workspace-sidebar" :class="{ 'collapsed': isParamsCollapsed }">
      <div class="sidebar-inner">
        <div class="panel prompt-panel">
          <div class="prompt-header">
            <h3 class="panel-title serif-display">创作参数</h3>
            <div style="display: flex; gap: 8px;">
              <button class="open-helper-btn" @click="isHelperOpen = true" style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                使用模板
              </button>
              <button v-if="!isBuilderOpen" class="open-builder-btn" @click="isBuilderOpen = true" style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                知识图谱构建
              </button>
              <button class="collapse-trigger-btn" @click="isParamsCollapsed = true" title="收起参数面板" style="background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
              </button>
            </div>
          </div>
          
          <PromptHelper 
            v-if="isHelperOpen"
            @selectTemplate="t => promptText = t" 
            @close="isHelperOpen = false" 
          />
          
          <div v-if="imagePreview" class="image-preview-box">
            <img :src="imagePreview" alt="preview" />
            <button class="remove-btn" @click="removeImage">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <PromptBuilder 
            v-if="isBuilderOpen"
            :currentPrompt="promptText" 
            @updatePrompt="p => promptText = p" 
            @close="isBuilderOpen = false" 
          />

          <textarea
            v-if="!isBuilderOpen"
            class="prompt-textarea"
            placeholder="描述您想要的画面细节..."
            v-model="promptText"
            @keydown="handleKeyDown"
            rows="4"
          ></textarea>

          <div class="controls-grid" ref="dropdownRef">
            <div class="control-group">
              <label>生成模型</label>
              <div class="custom-dropdown-container">
                <div 
                  class="custom-dropdown-trigger" 
                  :class="{ active: modelMenuOpen }"
                  @click="modelMenuOpen = !modelMenuOpen; sizeMenuOpen = false"
                >
                  <div class="trigger-content">
                    <span class="trigger-icon" style="font-size: 14px;">{{ getModelMeta(selectedModel?.name || '').icon }}</span>
                    <span class="trigger-text">{{ selectedModel?.name || '选择模型' }}</span>
                  </div>
                  <span class="caret">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>
                
                <div v-if="modelMenuOpen" class="custom-dropdown-menu models-menu">
                  <div v-for="(modelsInBrand, brand) in groupedModels" :key="brand" class="menu-group">
                    <div class="menu-group-title">{{ brand }}</div>
                    <div 
                      v-for="m in modelsInBrand" 
                      :key="m.modelId" 
                      class="menu-item"
                      :class="{ selected: m.modelId === modelId }"
                      @click="modelId = m.modelId; modelMenuOpen = false"
                    >
                      <div class="menu-item-icon" style="font-size: 14px;">{{ getModelMeta(m.name).icon }}</div>
                      <div class="menu-item-info">
                        <div class="menu-item-name">
                          {{ m.name }} <span v-if="m.modelId === modelId" class="check-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </span>
                        </div>
                        <div class="menu-item-desc">{{ getModelMeta(m.name).desc }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="availableSizes.length > 0" class="control-group">
              <label>画面比例</label>
              <div class="custom-dropdown-container">
                <div 
                  class="custom-dropdown-trigger" 
                  :class="{ active: sizeMenuOpen }"
                  @click="sizeMenuOpen = !sizeMenuOpen; modelMenuOpen = false"
                >
                  <div class="trigger-content">
                     <div class="size-shape-icon" :style="getSizeMeta(size).shape"></div>
                     <span class="trigger-text">{{ getSizeMeta(size).label }}</span>
                  </div>
                  <span class="caret">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </div>

                  <div v-if="sizeMenuOpen" class="custom-dropdown-menu sizes-menu">
                    <div 
                    v-for="s in availableSizes" 
                    :key="s" 
                    class="menu-item size-item"
                    :class="{ selected: size === s }"
                    @click="size = s; sizeMenuOpen = false"
                  >
                    <div class="menu-item-icon">
                      <div class="size-shape-icon" :style="getSizeMeta(s).shape"></div>
                    </div>
                    <div class="menu-item-info">
                      <div class="menu-item-name">
                        {{ getSizeMeta(s).label }} <span v-if="size === s" class="check-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </span>
                      </div>
                      <div class="menu-item-desc">{{ s }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="action-row">
            <input type="file" accept="image/*" @change="handleImageChange" ref="fileInputRef" class="hidden-input" />
            <button class="btn btn-secondary icon-btn" @click="fileInputRef?.click()" title="上传参考图">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </button>
            <button class="btn btn-primary generate-btn" @click="handleSend" :disabled="isGenerating || (!promptText.trim() && !imageFile)">
              <span v-if="isGenerating">正在生成...</span>
              <span v-else style="display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                开始生成 (⌘+Enter)
              </span>
            </button>
          </div>
        </div>

        <!-- Learning Steps -->
        <div class="learning-steps">
          <div class="step" :class="{ active: learningStep >= 1, current: learningStep === 1 }"><span class="step-num">1</span><span class="step-label">构思</span></div>
          <div class="step-line" :class="{ done: learningStep >= 2 }"></div>
          <div class="step" :class="{ active: learningStep >= 2, current: learningStep === 2 }"><span class="step-num">2</span><span class="step-label">优化</span></div>
          <div class="step-line" :class="{ done: learningStep >= 3 }"></div>
          <div class="step" :class="{ active: learningStep >= 3, current: learningStep === 3 }"><span class="step-num">3</span><span class="step-label">生成</span></div>
          <div class="step-line" :class="{ done: learningStep >= 4 }"></div>
          <div class="step" :class="{ active: learningStep >= 4, current: learningStep === 4 }"><span class="step-num">4</span><span class="step-label">点评</span></div>
        </div>
      </div>
    </div>

    <!-- 右侧 AI 导师区 -->
    <div class="tutor-column">
      <TutorDrawer
        :generationId="activeMsg?.generationId || activeMsg?.id"
        :prompt="promptText"
        :hasImage="!!activeMsg?.image"
        :initialReviews="activeMsg?.analysis?.reviews"
        @applySuggestion="s => promptText = s"
        @applyOptimized="p => promptText = p"
      />
    </div>
  </div>
</template>

<style scoped>
.workspace-layout {
  display: flex;
  height: 100vh;
  margin: -48px;
  background: var(--surface-cream);
  overflow: hidden;
}

/* Left Params Panel */
.workspace-sidebar {
  order: 1;
  width: 380px;
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 0 24px 24px;
  overflow-y: hidden;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.workspace-sidebar.collapsed {
  width: 0;
  padding: 0;
  margin: 0;
  opacity: 0;
}

/* Center Canvas (widest) */
.canvas-area {
  order: 2;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  max-width: 100%;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
}

.expand-params-btn {
  position: absolute;
  top: 32px;
  left: 24px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--hairline);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.2s;
}
.expand-params-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(204,120,92,0.15);
}





.canvas-main {
  flex: 1;
  background: var(--canvas);
  border-radius: 16px;
  border: 1px solid var(--hairline);
  box-shadow: 0 4px 24px rgba(0,0,0,0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.canvas-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 32px;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.main-image {
  max-width: 100%;
  max-height: calc(100% - 60px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); filter: blur(4px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}

.generating-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.ai-loader {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-loader-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: var(--primary);
  border-right-color: rgba(204, 120, 92, 0.3);
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

.ai-loader-core {
  width: 20px;
  height: 20px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(204, 120, 92, 0.6);
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

@keyframes spin { 100% { transform: rotate(360deg); } }

.loading-text {
  font-family: var(--font-mono);
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 0.5px;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--muted);
  height: 100%;
  gap: 8px;
  padding: 40px 20px;
}

.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; opacity: 0.5; }

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  max-width: 320px;
}

.error-visual {
  width: 80px;
  height: 80px;
  background: rgba(220, 38, 38, 0.05);
  color: var(--error);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.error-state h3 {
  margin: 0;
  font-size: 20px;
  color: var(--ink);
}

.error-state p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
}

/* History Rail */
.history-rail {
  height: 80px;
  margin-top: 16px;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.history-item {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: all 0.2s;
  background: var(--canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-item:hover { opacity: 1; }
.history-item.active {
  border-color: var(--primary);
  opacity: 1;
}

.history-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}



.sidebar-inner {
  background: var(--canvas);
  border-radius: 16px;
  border: 1px solid var(--hairline);
  box-shadow: 0 4px 24px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.panel {
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.prompt-panel {
  border-bottom: 1px solid var(--hairline);
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.open-builder-btn, .open-helper-btn {
  background: rgba(204, 120, 92, 0.1);
  color: var(--primary);
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.open-helper-btn {
  background: rgba(79, 70, 229, 0.1);
  color: rgb(79, 70, 229);
}

.open-builder-btn:hover, .open-helper-btn:hover {
  transform: translateY(-1px);
  opacity: 0.8;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-textarea {
  width: 100%;
  background: var(--surface-cream);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 12px;
  font-family: var(--font-inter);
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(204, 120, 92, 0.1);
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.custom-dropdown-container {
  position: relative;
}

.custom-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
}

.custom-dropdown-trigger:hover {
  border-color: rgba(204,120,92,0.4);
}

.custom-dropdown-trigger.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(204, 120, 92, 0.1);
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trigger-icon { font-size: 16px; }

.trigger-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.caret {
  color: var(--muted);
  font-size: 12px;
  transition: transform 0.2s;
}

.custom-dropdown-trigger.active .caret { transform: rotate(180deg); }

.custom-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 280px;
  background: white;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  z-index: 100;
  overflow: hidden;
  animation: menuSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  max-height: 250px;
  overflow-y: auto;
}

.sizes-menu { 
  width: 200px; 
}

@keyframes menuSlideDown {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.menu-group {
  padding: 8px 0;
  border-bottom: 1px solid var(--surface-card);
}

.menu-group:last-child { border-bottom: none; }

.menu-group-title {
  padding: 4px 16px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover { background: var(--surface-cream-strong); }
.menu-item.selected { background: rgba(204,120,92,0.06); }

.menu-item-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.size-shape-icon {
  border: 1.5px solid currentColor;
  border-radius: 2px;
  color: var(--muted);
  opacity: 0.8;
  transition: all 0.2s;
}

.menu-item:hover .size-shape-icon, .custom-dropdown-trigger .size-shape-icon {
  color: var(--primary);
  opacity: 1;
}

.menu-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.menu-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
}

.menu-item-desc {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.check-icon {
  color: var(--primary);
  font-weight: bold;
}

.action-row {
  display: flex;
  gap: 12px;
}

.icon-btn { padding: 0 16px; }
.generate-btn { flex: 1; }

.optimized-box {
  background: white;
  border: 1px solid var(--primary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(204,120,92,0.1);
}

.box-header {
  font-weight: 600;
  font-size: 13px;
  color: var(--primary);
  margin-bottom: 8px;
}

.optimized-text {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  color: var(--ink);
}

.apply-btn {
  background: var(--surface-soft);
  border: none;
  color: var(--ink);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.apply-btn:hover { background: var(--hairline); }

.tips-box {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--hairline);
}

.tip-item {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.tip-item:last-child { margin-bottom: 0; }

.tip-badge {
  display: inline-block;
  background: var(--surface-cream);
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 6px;
  border: 1px solid var(--hairline);
}

.hidden-input { display: none; }

/* Learning Steps */
.learning-steps {
  display: flex; align-items: center; gap: 0;
  padding: 16px 24px; border-top: 1px solid var(--hairline);
  margin-top: auto;
}
.step {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.step-num {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
  background: var(--hairline); color: var(--muted);
  transition: all 0.3s;
}
.step.active .step-num {
  background: var(--surface-cream-strong); color: var(--ink);
}
.step.current .step-num {
  background: var(--primary); color: white;
  box-shadow: 0 0 0 4px rgba(204,120,92,0.15);
}
.step-label {
  font-size: 11px; color: var(--muted); font-weight: 500;
}
.step.current .step-label { color: var(--primary); font-weight: 600; }
.step-line {
  flex: 1; height: 2px; background: var(--hairline); margin: 0 4px;
  margin-bottom: 18px; transition: background 0.3s;
}
.step-line.done { background: var(--primary); }

/* Tutor Column (Third Column) */
.tutor-column {
  order: 3;
  width: 380px;
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 24px 24px 0;
}
.tutor-column > * {
  flex: 1;
  background: var(--canvas);
  border-radius: 16px;
  border: 1px solid var(--hairline);
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* Quick Prompts */
.quick-prompts {
  display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;
  justify-content: center;
}
.quick-chip {
  padding: 8px 14px; border-radius: 20px;
  border: 1px solid var(--hairline); background: white;
  font-size: 13px; color: var(--muted); cursor: pointer;
  transition: all 0.2s;
}
.quick-chip:hover {
  border-color: var(--primary); color: var(--primary);
  background: rgba(204,120,92,0.05);
  transform: translateY(-1px);
}

.image-preview-box {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.image-preview-box img {
  height: 80px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ink);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
