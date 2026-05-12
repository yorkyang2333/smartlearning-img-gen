<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const activeTab = ref<'MODELS' | 'ENDPOINTS' | 'SETTINGS' | 'TUTOR'>('MODELS')

const models = ref<any[]>([])
const endpoints = ref<any[]>([])
const modelsLoading = ref(true)
const endpointsLoading = ref(true)

const fetchModels = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/models', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      models.value = data
    }
  } finally {
    modelsLoading.value = false
  }
}

const fetchEndpoints = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/endpoints', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      endpoints.value = data
    }
  } finally {
    endpointsLoading.value = false
  }
}

const quotaFormData = ref({ dailyLimit: 50, blockedWords: '' })
const isSavingQuota = ref(false)
const quotaMessage = ref('')

// Tutor Form State
const tutorFormData = ref({
  enabled: true,
  modelName: 'gemini-3.1-flash-lite-preview',
  apiEndpointId: '',
  systemPrompt: ''
})
const isSavingTutor = ref(false)
const tutorMessage = ref('')

const fetchTutorConfig = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/config', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      tutorFormData.value = {
        enabled: data.enabled,
        modelName: data.modelName || 'gemini-3.1-flash-lite-preview',
        apiEndpointId: data.apiEndpointId || '',
        systemPrompt: data.systemPrompt || ''
      }
    }
  } catch (e) {}
}

const handleTutorSubmit = async (e: Event) => {
  e.preventDefault()
  isSavingTutor.value = true
  tutorMessage.value = ''
  try {
    const res = await fetch('http://localhost:8080/api/teacher/config', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(tutorFormData.value)
    })
    if (res.ok) tutorMessage.value = '设置保存成功'
    else tutorMessage.value = '设置保存失败'
  } catch (err) {
    tutorMessage.value = '发生错误'
  } finally {
    isSavingTutor.value = false
    setTimeout(() => tutorMessage.value = '', 3000)
  }
}

const handleQuotaSubmit = async (e: Event) => {
  e.preventDefault()
  // Mock save quota for now
  isSavingQuota.value = true
  setTimeout(() => {
    isSavingQuota.value = false
    quotaMessage.value = '设置保存成功'
    setTimeout(() => quotaMessage.value = '', 3000)
  }, 500)
}

// Modal States
const isModelModalOpen = ref(false)
const editingModel = ref<any>(null)
const modelFormData = ref({
  name: '',
  modelId: '',
  type: 'TEXT_TO_IMAGE',
  provider: 'openai',
  description: '',
  apiEndpointId: '',
  config: '{"sizes":["1024x1024"]}'
})

const isEndpointModalOpen = ref(false)
const editingEndpoint = ref<any>(null)
const endpointFormData = ref({
  name: '',
  baseUrl: '',
  apiKey: ''
})

const handleModelToggle = async (modelId: string, currentEnabled: boolean) => {
  // Mock for now
  const model = models.value.find(m => m.id === modelId)
  if (model) {
    model.isActive = !currentEnabled
    model.teacherEnabled = !currentEnabled
  }
}

const handleModelDelete = async (id: string) => {
  if (!confirm('确定要删除这个模型吗？')) return
  try {
    await fetch(`http://localhost:8080/api/teacher/models/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    fetchModels()
  } catch (e) {}
}

const openModelModal = (model?: any) => {
  if (model) {
    editingModel.value = model
    modelFormData.value = {
      name: model.name || '',
      modelId: model.modelId || '',
      type: model.type || 'TEXT_TO_IMAGE',
      provider: model.provider || 'openai',
      description: model.description || '',
      apiEndpointId: model.apiEndpoint?.id || '',
      config: model.config || '{"sizes":["1024x1024"]}'
    }
  } else {
    editingModel.value = null
    modelFormData.value = {
      name: '',
      modelId: '',
      type: 'TEXT_TO_IMAGE',
      provider: 'openai',
      description: '',
      apiEndpointId: endpoints.value.length > 0 ? endpoints.value[0].id : '',
      config: '{"sizes":["1024x1024"]}'
    }
  }
  isModelModalOpen.value = true
}

const handleModelSubmit = async (e: Event) => {
  e.preventDefault()
  const isEditing = !!editingModel.value
  const url = isEditing ? `http://localhost:8080/api/teacher/models/${editingModel.value.id}` : 'http://localhost:8080/api/teacher/models'
  const method = isEditing ? 'PUT' : 'POST'
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(modelFormData.value)
    })
    if (res.ok) {
      isModelModalOpen.value = false
      fetchModels()
    } else {
      alert('保存失败')
    }
  } catch (err: any) {
    alert(`保存失败: ${err.message}`)
  }
}

const handleEndpointDelete = async (id: string) => {
  if (!confirm('确定要删除这个渠道吗？')) return
  try {
    await fetch(`http://localhost:8080/api/teacher/endpoints/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    fetchEndpoints()
  } catch (e) {}
}

const openEndpointModal = (endpoint?: any) => {
  if (endpoint) {
    editingEndpoint.value = endpoint
    endpointFormData.value = {
      name: endpoint.name || '',
      baseUrl: endpoint.baseUrl || '',
      apiKey: endpoint.apiKey || ''
    }
  } else {
    editingEndpoint.value = null
    endpointFormData.value = { name: '', baseUrl: '', apiKey: '' }
  }
  isEndpointModalOpen.value = true
}

const handleEndpointSubmit = async (e: Event) => {
  e.preventDefault()
  const isEditing = !!editingEndpoint.value
  const url = isEditing ? `http://localhost:8080/api/teacher/endpoints/${editingEndpoint.value.id}` : 'http://localhost:8080/api/teacher/endpoints'
  const method = isEditing ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(endpointFormData.value)
    })
    if (res.ok) {
      isEndpointModalOpen.value = false
      fetchEndpoints()
    } else {
      alert('保存失败')
    }
  } catch (err: any) {
    alert(`保存失败: ${err.message}`)
  }
}

onMounted(() => {
  fetchModels()
  fetchEndpoints()
  fetchTutorConfig()
})
</script>

<template>
  <div v-if="modelsLoading || endpointsLoading" style="display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--muted); font-family: var(--font-inter);">
    加载配置中...
  </div>
  
  <div v-else class="editorial-container">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">系统配置</h1>
        <p class="editorial-subtitle">管理底层的 API 渠道代理，并为学生配置可用的模型。</p>
      </div>
      
      <div class="segmented-control">
         <button 
           class="segment-btn" :class="{ active: activeTab === 'MODELS' }"
           @click="activeTab = 'MODELS'"
         >模型列表</button>
         <button 
           class="segment-btn" :class="{ active: activeTab === 'ENDPOINTS' }"
           @click="activeTab = 'ENDPOINTS'"
         >API 渠道</button>
         <button 
           class="segment-btn" :class="{ active: activeTab === 'SETTINGS' }"
           @click="activeTab = 'SETTINGS'"
         >安全与配额</button>
         <button 
           class="segment-btn" :class="{ active: activeTab === 'TUTOR' }"
           @click="activeTab = 'TUTOR'"
         >AI 导师</button>
      </div>
    </div>

    <div class="content-canvas">
      <!-- MODELS TAB -->
      <template v-if="activeTab === 'MODELS'">
        <div class="toolbar">
           <h2 class="section-title">可用模型</h2>
           <button class="primary-button" @click="openModelModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              添加模型
           </button>
        </div>
        
        <div v-if="endpoints.length === 0" class="info-banner warning">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
           您尚未配置任何 API 渠道，模型将无法正常生成图像。请先前往「API 渠道」进行配置。
        </div>

        <div class="grid-layout">
           <div v-for="model in models" :key="model.id" class="editorial-card">
              <div class="card-header">
                 <div>
                    <h3 class="card-title">{{ model.name }}</h3>
                    <span class="badge badge-provider">{{ model.provider }}</span>
                 </div>
                 <div class="badge badge-type" :class="{ both: model.type === 'BOTH' }">
                    {{ model.type === 'TEXT_TO_IMAGE' ? '仅文生图' : model.type === 'IMAGE_TO_IMAGE' ? '仅图生图' : '文/图生图' }}
                 </div>
              </div>
              
              <p class="card-desc">
                 {{ model.description || '暂无详细描述。' }}
              </p>

              <div class="card-meta">
                <div class="meta-row"><span>ID</span> {{ model.modelId }}</div>
                <div class="meta-row"><span>渠道</span> <span v-if="model.apiEndpoint">{{ model.apiEndpoint.name }}</span><span v-else class="error-text">未绑定</span></div>
              </div>
              
              <div class="card-footer">
                 <div class="status-indicator">
                    <template v-if="model.isActive || model.teacherEnabled">
                      <span class="dot dot-active"></span> 已对班级开放
                    </template>
                    <template v-else>
                      <span class="dot dot-inactive"></span> 已停用
                    </template>
                 </div>
                 <div class="action-group">
                   <button class="icon-btn" @click="handleModelToggle(model.id, model.isActive || model.teacherEnabled)" title="切换状态">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                   </button>
                   <button class="icon-btn" @click="openModelModal(model)" title="编辑配置">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                   </button>
                   <button class="icon-btn danger" @click="handleModelDelete(model.id)" title="删除模型">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
                 </div>
              </div>
           </div>
        </div>
      </template>

      <!-- ENDPOINTS TAB -->
      <template v-if="activeTab === 'ENDPOINTS'">
        <div class="toolbar">
           <h2 class="section-title">API 渠道</h2>
           <button class="primary-button" @click="openEndpointModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              添加渠道
           </button>
        </div>

        <div class="info-banner info">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
           通过配置渠道，您可以将底层模型路由到 OpenAI 官方、硅基流动、ChatAnywhere 等不同的中转服务商。
        </div>
        
        <div class="grid-layout">
           <div v-for="ep in endpoints" :key="ep.id" class="editorial-card">
              <div class="card-header">
                 <div>
                    <h3 class="card-title">{{ ep.name }}</h3>
                 </div>
                 <span class="badge badge-provider">API Channel</span>
              </div>
              
              <div class="card-meta">
                <div class="meta-row"><span>Base URL</span> <div class="mono-text truncate" :title="ep.baseUrl">{{ ep.baseUrl }}</div></div>
                <div class="meta-row"><span>关联模型</span> {{ ep._count?.models || 0 }} 个</div>
              </div>
              
              <div class="card-footer">
                 <div class="status-indicator">
                    <span class="dot dot-active"></span> 运行中
                 </div>
                 <div class="action-group">
                   <button class="icon-btn" @click="openEndpointModal(ep)" title="编辑">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                   </button>
                   <button class="icon-btn danger" @click="handleEndpointDelete(ep.id)" title="删除">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
                 </div>
              </div>
           </div>
        </div>
      </template>

      <!-- SETTINGS TAB -->
      <template v-if="activeTab === 'SETTINGS'">
        <div class="glass-panel" style="padding: 2rem; margin-bottom: 2rem;">
          <form @submit="handleQuotaSubmit">
            <div style="margin-bottom: 2.5rem;">
              <h2 style="font-size: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">配额管理</h2>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">学生每日生成次数上限</label>
                <input 
                  type="number" 
                  style="width: 100%; max-width: 300px; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 6px;"
                  v-model="quotaFormData.dailyLimit" 
                  min="1"
                />
                <p style="font-size: 0.875rem; color: var(--text-muted);">防止 API 资源滥用，建议设置为 50-100 次/人</p>
              </div>
            </div>

            <div style="margin-bottom: 2.5rem;">
              <h2 style="font-size: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">安全护栏</h2>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">敏感词黑名单 (用逗号分隔)</label>
                <textarea 
                  style="width: 100%; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 6px; font-family: inherit;"
                  rows="4" 
                  v-model="quotaFormData.blockedWords" 
                  placeholder="例如：暴力, 恐怖, 血腥..." 
                ></textarea>
                <p style="font-size: 0.875rem; color: var(--text-muted);">学生在提示词中输入这些词汇时，生成请求将被直接拦截。</p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="isSavingQuota"
              >
                {{ isSavingQuota ? '保存中...' : '保存更改' }}
              </button>
              <span v-if="quotaMessage" :style="{ fontSize: '0.875rem', color: quotaMessage.includes('失败') ? 'var(--error)' : 'var(--success)' }">
                {{ quotaMessage }}
              </span>
            </div>
          </form>
        </div>
      </template>

      <!-- TUTOR TAB -->
      <template v-if="activeTab === 'TUTOR'">
        <div class="glass-panel" style="padding: 2rem; margin-bottom: 2rem;">
          <form @submit="handleTutorSubmit">
            <div style="margin-bottom: 2.5rem;">
              <h2 style="font-size: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">AI 导师开关</h2>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input 
                  type="checkbox" 
                  id="tutorEnabled"
                  v-model="tutorFormData.enabled" 
                />
                <label for="tutorEnabled" style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">启用 AI 导师分析与点评</label>
              </div>
              <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">关闭后，学生生成图片时将不会调用额外的分析接口，可节省 API 成本并加快生成反馈速度。</p>
            </div>

            <div :style="{ marginBottom: '2.5rem', opacity: tutorFormData.enabled ? 1 : 0.5, pointerEvents: tutorFormData.enabled ? 'auto' : 'none' }">
              <h2 style="font-size: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">底层模型配置</h2>
              
              <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
                <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
                  <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">API 渠道</label>
                  <select 
                    style="width: 100%; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 6px;"
                    v-model="tutorFormData.apiEndpointId"
                  >
                    <option value="">-- 选择分析使用的 API 渠道 --</option>
                    <option v-for="ep in endpoints" :key="ep.id" :value="ep.id">{{ ep.name }} ({{ ep.baseUrl }})</option>
                  </select>
                </div>
                
                <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
                  <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">文本大模型 (如 gpt-4o, gemini-1.5-flash)</label>
                  <input 
                    type="text" 
                    style="width: 100%; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 6px;"
                    v-model="tutorFormData.modelName" 
                    placeholder="gemini-3.1-flash-lite-preview"
                  />
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                  <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-body);">系统人设词 (System Prompt)</label>
                  <button 
                    type="button" 
                    class="ghost-button" 
                    style="padding: 4px 8px; font-size: 12px;"
                    @click="tutorFormData.systemPrompt = ''"
                  >
                    恢复默认
                  </button>
                </div>
                <textarea 
                  style="width: 100%; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 6px; font-family: inherit;"
                  rows="8" 
                  v-model="tutorFormData.systemPrompt" 
                  placeholder="留空则使用默认提示词。注意：必须要求模型返回固定格式的 JSON（包含 optimized 和 tips）。" 
                ></textarea>
                <p style="font-size: 0.875rem; color: var(--text-muted);">定义 AI 导师的性格和点评角度。修改前请确保了解系统要求的 JSON 返回格式。</p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <button 
                type="submit" 
                class="primary-button"
                :disabled="isSavingTutor"
              >
                {{ isSavingTutor ? '保存中...' : '保存更改' }}
              </button>
              <span v-if="tutorMessage" :style="{ fontSize: '0.875rem', color: tutorMessage.includes('失败') ? 'var(--error)' : 'var(--success)' }">
                {{ tutorMessage }}
              </span>
            </div>
          </form>
        </div>
      </template>
    </div>

    <!-- Model Modal -->
    <div v-if="isModelModalOpen" class="overlay-backdrop">
      <div class="overlay-panel">
        <h2 class="overlay-title">{{ editingModel ? '编辑模型' : '新建模型' }}</h2>
        <form @submit="handleModelSubmit" class="overlay-form">
          
          <div class="input-group">
            <label>归属渠道</label>
            <select required class="editorial-input" v-model="modelFormData.apiEndpointId">
              <option value="" disabled>-- 请选择底层调用的 API 渠道 --</option>
              <option v-for="ep in endpoints" :key="ep.id" :value="ep.id">{{ ep.name }} ({{ ep.baseUrl }})</option>
            </select>
          </div>

          <div class="input-row">
            <div class="input-group">
              <label>展示名称</label>
              <input type="text" class="editorial-input" required v-model="modelFormData.name" placeholder="如: Midjourney V6" />
            </div>
            <div class="input-group">
              <label>API Model ID</label>
              <input type="text" class="editorial-input" required v-model="modelFormData.modelId" placeholder="如: midjourney" />
            </div>
          </div>

          <div class="input-row">
            <div class="input-group">
              <label>支持类型</label>
              <select class="editorial-input" v-model="modelFormData.type">
                <option value="TEXT_TO_IMAGE">文生图 (Text to Image)</option>
                <option value="IMAGE_TO_IMAGE">图生图 (Image to Image)</option>
                <option value="BOTH">双模支持 (Both)</option>
              </select>
            </div>
            <div class="input-group">
              <label>提供方标识</label>
              <input type="text" class="editorial-input" required v-model="modelFormData.provider" placeholder="如: openai" />
            </div>
          </div>

          <div class="input-group">
            <label>功能描述</label>
            <input type="text" class="editorial-input" v-model="modelFormData.description" placeholder="一句话介绍这个模型的特点..." />
          </div>

          <div class="overlay-actions">
            <button type="button" class="ghost-button" @click="isModelModalOpen = false">取消</button>
            <button type="submit" class="primary-button" :disabled="!modelFormData.apiEndpointId">{{ editingModel ? '保存更改' : '确认添加' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Endpoint Modal -->
    <div v-if="isEndpointModalOpen" class="overlay-backdrop">
      <div class="overlay-panel">
        <h2 class="overlay-title">{{ editingEndpoint ? '编辑渠道配置' : '新增 API 渠道' }}</h2>
        <form @submit="handleEndpointSubmit" class="overlay-form">
          <div class="input-group">
            <label>渠道名称</label>
            <input type="text" class="editorial-input" required v-model="endpointFormData.name" placeholder="如: 硅基流动, OpenAI 官方" />
          </div>
          <div class="input-group">
            <label>Base URL</label>
            <input type="url" class="editorial-input" required v-model="endpointFormData.baseUrl" placeholder="https://api.siliconflow.cn" />
            <span class="help-text">请填写完整的接口根路径，不包含 /v1/...</span>
          </div>
          <div class="input-group">
            <label>API Key</label>
            <input type="password" class="editorial-input" required v-model="endpointFormData.apiKey" placeholder="sk-..." />
          </div>
          <div class="overlay-actions">
            <button type="button" class="ghost-button" @click="isEndpointModalOpen = false">取消</button>
            <button type="submit" class="primary-button">{{ editingEndpoint ? '保存配置' : '确认添加' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Typography & Layout */
.editorial-container {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 64px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--hairline);
}

.editorial-title {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 400;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.editorial-subtitle {
  font-size: 15px;
  color: var(--muted);
  font-weight: 400;
}

/* Segmented Control */
.segmented-control {
  display: flex;
  background: var(--surface-card);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--hairline);
}

.segment-btn {
  background: transparent;
  border: none;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.segment-btn:hover {
  color: var(--ink);
}

.segment-btn.active {
  background: var(--canvas);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(20,20,19,0.06);
}

/* Toolbars & Banners */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-family: var(--font-inter);
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.primary-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover:not(:disabled) { background: var(--primary-active); }
.primary-button:disabled { background: var(--primary-disabled); cursor: not-allowed; opacity: 0.7; }

.ghost-button {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--hairline);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.ghost-button:hover { background: var(--surface-card); }

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  margin-bottom: 32px;
  border: 1px solid;
}

.info-banner.warning {
  background: #fffdf5;
  border-color: #fce8a6;
  color: #8c6b00;
}

.info-banner.info {
  background: var(--surface-card);
  border-color: var(--hairline);
  color: var(--muted);
}

/* Grid & Cards */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.editorial-card {
  background: var(--surface-card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(20,20,19,0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.editorial-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(20,20,19,0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-title {
  font-family: var(--font-inter);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px 0;
  line-height: 1.2;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-provider { background: var(--surface-cream-strong); color: var(--muted); }
.badge-type { background: var(--canvas); border: 1px solid var(--hairline); color: var(--muted); font-size: 11px; }
.badge-type.both { background: var(--primary); color: white; border-color: var(--primary); }

.card-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 24px;
  flex: 1;
}

.card-meta {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 20px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 4px 0;
}

.meta-row span:first-child { color: var(--muted-soft); font-family: var(--font-mono); text-transform: uppercase; font-size: 11px; }
.error-text { color: var(--error); font-weight: 500; }
.mono-text { font-family: var(--font-mono); font-size: 12px; opacity: 0.8; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px dashed var(--hairline);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active { background: var(--success); box-shadow: 0 0 0 3px rgba(93,184,114,0.2); }
.dot-inactive { background: var(--muted-soft); }

.action-group { display: flex; gap: 8px; }

.icon-btn {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  color: var(--ink);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover { background: var(--surface-card); }
.icon-btn.danger { color: var(--error); }
.icon-btn.danger:hover { background: #fdf5f5; border-color: #fbd6d6; }

/* Overlays & Modals */
.overlay-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(20, 20, 19, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.overlay-panel {
  background: var(--canvas);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 500px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.1);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.overlay-title {
  padding: 24px 32px;
  margin: 0;
  font-family: var(--font-inter);
  font-size: 20px;
  font-weight: 600;
  border-bottom: 1px solid var(--hairline);
  background: var(--surface-card);
}

.overlay-form {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-row {
  display: flex;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.editorial-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  background: var(--canvas);
  font-family: var(--font-inter);
  font-size: 14px;
  color: var(--ink);
  transition: border-color 0.2s;
  outline: none;
}

.editorial-input:focus {
  border-color: var(--primary);
}

.help-text {
  font-size: 12px;
  color: var(--muted-soft);
}

.overlay-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--hairline);
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
