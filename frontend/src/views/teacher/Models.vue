<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const models = ref<any[]>([])
const endpoints = ref<any[]>([])
const modelsLoading = ref(true)
const endpointsLoading = ref(true)

// Expanded states for Endpoint Cards
const expandedEndpoints = ref<Set<string>>(new Set())

const toggleEndpoint = (id: string) => {
  if (expandedEndpoints.value.has(id)) {
    expandedEndpoints.value.delete(id)
  } else {
    expandedEndpoints.value.add(id)
  }
}

const getModelsForEndpoint = (endpointId: string) => {
  return models.value.filter(m => m.apiEndpoint?.id === endpointId)
}

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

// Tutor Form State
const tutorFormData = ref({
  enabled: true,
  modelName: 'gemini-3.1-flash-lite-preview',
  apiEndpointId: '',
  systemPrompt: ''
})
const isSavingTutor = ref(false)
const tutorMessage = ref('')
const isTutorExpanded = ref(false)

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
  apiKey: '',
  apiFormat: 'openai'
})

// Discover Modal States
const isDiscoverModalOpen = ref(false)
const isDiscovering = ref(false)
const discoveringError = ref('')
const discoveredModels = ref<{ imageModels: any[], textModels: any[] }>({ imageModels: [], textModels: [] })
const discoverEndpointId = ref('')
const selectedModels = ref<Set<string>>(new Set())

const handleDiscover = async (endpointId: string) => {
  discoverEndpointId.value = endpointId
  isDiscovering.value = true
  discoveringError.value = ''
  isDiscoverModalOpen.value = true
  discoveredModels.value = { imageModels: [], textModels: [] }
  selectedModels.value.clear()

  try {
    const res = await fetch(`http://localhost:8080/api/teacher/endpoints/${endpointId}/discover`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      discoveredModels.value = {
        imageModels: data.imageModels || [],
        textModels: data.textModels || []
      }
      // Auto-select image models
      if (data.imageModels) {
        data.imageModels.forEach((m: any) => selectedModels.value.add(m.id))
      }
    } else {
      discoveringError.value = data.error || '探测失败'
    }
  } catch (err: any) {
    discoveringError.value = `请求出错: ${err.message}`
  } finally {
    isDiscovering.value = false
  }
}

const toggleModelSelection = (modelId: string) => {
  if (selectedModels.value.has(modelId)) {
    selectedModels.value.delete(modelId)
  } else {
    selectedModels.value.add(modelId)
  }
}

const handleBatchImport = async () => {
  if (selectedModels.value.size === 0) return
  
  const modelsToImport = Array.from(selectedModels.value).map(id => {
    const model = discoveredModels.value.imageModels.find(m => m.id === id)
    return {
      name: model.name || id,
      modelId: id,
      type: 'TEXT_TO_IMAGE',
      provider: model.provider || 'openai',
      description: '探测自动导入的生图模型',
      apiEndpointId: discoverEndpointId.value,
      apiFormat: endpoints.value.find(e => e.id === discoverEndpointId.value)?.apiFormat || 'openai',
      config: '{"sizes":["1024x1024"]}',
      isActive: true,
      sortOrder: 0
    }
  })

  try {
    const res = await fetch('http://localhost:8080/api/teacher/models/batch', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(modelsToImport)
    })
    if (res.ok) {
      isDiscoverModalOpen.value = false
      fetchModels()
      if (!expandedEndpoints.value.has(discoverEndpointId.value)) {
        expandedEndpoints.value.add(discoverEndpointId.value)
      }
    } else {
      alert('批量导入失败')
    }
  } catch (err: any) {
    alert(`导入出错: ${err.message}`)
  }
}

const handleModelToggle = async (modelId: string, currentEnabled: boolean) => {
  const model = models.value.find(m => m.id === modelId)
  if (!model) return
  
  model.isActive = !currentEnabled
  if ('teacherEnabled' in model) {
    model.teacherEnabled = !currentEnabled
  }
  
  try {
    const res = await fetch(`http://localhost:8080/api/teacher/models/${modelId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}` 
      },
      body: JSON.stringify({
        name: model.name,
        modelId: model.modelId,
        type: model.type,
        provider: model.provider,
        description: model.description,
        config: model.config,
        isActive: model.isActive,
        sortOrder: model.sortOrder,
        apiEndpointId: model.apiEndpointId || (model.apiEndpoint ? model.apiEndpoint.id : null)
      })
    })
    
    if (!res.ok) throw new Error('Update failed')
  } catch (err) {
    model.isActive = currentEnabled
    if ('teacherEnabled' in model) {
      model.teacherEnabled = currentEnabled
    }
    alert('状态更新失败，请重试')
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
      apiKey: endpoint.apiKey || '',
      apiFormat: endpoint.apiFormat || 'openai'
    }
  } else {
    editingEndpoint.value = null
    endpointFormData.value = { name: '', baseUrl: '', apiKey: '', apiFormat: 'openai' }
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

onMounted(async () => {
  await fetchEndpoints()
  await fetchModels()
  await fetchTutorConfig()
  
  // Auto-expand the first endpoint if exists
  if (endpoints.value.length > 0) {
    expandedEndpoints.value.add(endpoints.value[0].id)
  }
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
        <p class="editorial-subtitle">配置 API 渠道与生图模型，管理平台的底层 AI 能力。</p>
      </div>
    </div>

    <div class="content-canvas">
      
      <!-- Section 1: API Channels -->
      <section class="config-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-number">1</div>
            <h2 class="section-title">API 渠道</h2>
          </div>
          <button class="primary-button" @click="openEndpointModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            添加新渠道
          </button>
        </div>
        
        <p class="section-desc">配置提供底层 AI 服务的渠道（如硅基流动、ChatAnywhere 或直连官方）。渠道是添加模型的基础。</p>
        
        <div v-if="endpoints.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          <h3>暂无可用渠道</h3>
          <p>您需要先配置一个 API 渠道，才能探测或添加模型。</p>
          <button class="primary-button" style="margin: 0 auto;" @click="openEndpointModal()">配置第一个渠道</button>
        </div>

        <div v-else class="endpoints-list">
          <div v-for="ep in endpoints" :key="ep.id" class="endpoint-card">
            <div class="endpoint-header" @click="toggleEndpoint(ep.id)">
              <div class="endpoint-info">
                <div class="endpoint-name-row">
                  <h3 class="endpoint-name">{{ ep.name }}</h3>
                  <span class="badge badge-format">{{ ep.apiFormat === 'gemini' ? 'Google 原生' : 'OpenAI 兼容' }}</span>
                </div>
                <div class="endpoint-url">{{ ep.baseUrl }}</div>
              </div>
              <div class="endpoint-actions" @click.stop>
                <button class="ghost-button btn-sm" @click="handleDiscover(ep.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  探测模型
                </button>
                <button class="icon-btn" @click="openEndpointModal(ep)" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                <button class="icon-btn danger" @click="handleEndpointDelete(ep.id)" title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                <div class="expand-icon" :class="{ 'expanded': expandedEndpoints.has(ep.id) }">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            <!-- Expandable Models Area -->
            <div class="endpoint-models" v-show="expandedEndpoints.has(ep.id)">
              <div class="endpoint-models-inner">
                <div class="endpoint-models-header">
                  <h4>关联的模型 ({{ getModelsForEndpoint(ep.id).length }})</h4>
                </div>
                
                <div v-if="getModelsForEndpoint(ep.id).length === 0" class="empty-models">
                  <p>该渠道下暂无模型。请点击右上方「探测模型」自动导入，或手动添加。</p>
                </div>
                
                <div v-else class="compact-model-list">
                  <div v-for="m in getModelsForEndpoint(ep.id)" :key="m.id" class="compact-model-item">
                    <div class="status-indicator" @click="handleModelToggle(m.id, m.isActive || m.teacherEnabled)">
                      <span class="dot" :class="(m.isActive || m.teacherEnabled) ? 'dot-active' : 'dot-inactive'"></span>
                    </div>
                    <div class="m-name" :title="m.name">{{ m.name }}</div>
                    <div class="m-id mono-text" :title="m.modelId">{{ m.modelId }}</div>
                    <div class="m-type badge badge-type" :class="{ both: m.type === 'BOTH' }">
                      {{ m.type === 'TEXT_TO_IMAGE' ? '仅生图' : m.type === 'IMAGE_TO_IMAGE' ? '图生图' : '多模态' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: All Models -->
      <section class="config-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-number">2</div>
            <h2 class="section-title">全局生图模型</h2>
          </div>
          <button class="primary-button" @click="openModelModal()" :disabled="endpoints.length === 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            手动添加模型
          </button>
        </div>
        
        <p class="section-desc">管理平台上所有的可用生图模型，您可以在这里统一管理学生可用的模型、排序并进行精细配置。</p>

        <div v-if="models.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <h3>暂无生图模型</h3>
          <p>请在上方渠道中探测模型，或手动添加。</p>
        </div>

        <div v-else class="config-table-container">
          <table class="config-table">
            <thead>
              <tr>
                <th width="100">状态</th>
                <th>展示名称</th>
                <th>API Model ID</th>
                <th>所属渠道</th>
                <th width="100" style="text-align: right;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="model in models" :key="model.id" :class="{ 'disabled-row': !(model.isActive || model.teacherEnabled) }">
                <td>
                  <button 
                    class="status-toggle-btn" 
                    :class="(model.isActive || model.teacherEnabled) ? 'active' : 'inactive'"
                    @click="handleModelToggle(model.id, model.isActive || model.teacherEnabled)"
                  >
                    <span class="dot" :class="(model.isActive || model.teacherEnabled) ? 'dot-active' : 'dot-inactive'"></span>
                    {{ (model.isActive || model.teacherEnabled) ? '已开放' : '已停用' }}
                  </button>
                </td>
                <td>
                  <div class="name-content">
                    <strong>{{ model.name }}</strong>
                    <span class="badge badge-provider" v-if="model.provider">{{ model.provider }}</span>
                  </div>
                </td>
                <td class="td-id"><span class="mono-text">{{ model.modelId }}</span></td>
                <td class="td-channel">
                  <span v-if="model.apiEndpoint">{{ model.apiEndpoint.name }}</span>
                  <span v-else class="error-text">未绑定</span>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" @click="openModelModal(model)" title="编辑模型">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn danger" @click="handleModelDelete(model.id)" title="删除模型">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 3: AI Tutor -->
      <section class="config-section">
        <div class="section-header cursor-pointer" @click="isTutorExpanded = !isTutorExpanded">
          <div class="section-title-wrap">
            <div class="section-number">3</div>
            <h2 class="section-title">AI 学伴分析配置</h2>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="tutor-status" :class="tutorFormData.enabled ? 'active' : 'inactive'">
              {{ tutorFormData.enabled ? '运行中' : '已关闭' }}
            </div>
            <div class="expand-icon" :class="{ 'expanded': isTutorExpanded }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
        
        <p class="section-desc">为学生配置生成作品后的自动点评功能。系统将在幕后调用此配置的文本大模型提供多维度建议。</p>

        <div v-show="isTutorExpanded" class="tutor-config-area">
          <form @submit="handleTutorSubmit">
            <div class="editorial-card tutor-card">
              <div class="card-header switch-header">
                <h3 class="card-title">启用 AI 导师点评</h3>
                <label class="switch-container">
                  <input type="checkbox" v-model="tutorFormData.enabled" style="display: none;" />
                  <span class="switch-slider"></span>
                </label>
              </div>
              
              <div class="card-body" :class="{ 'disabled-area': !tutorFormData.enabled }">
                <div class="input-row">
                  <div class="input-group">
                    <label>使用的 API 渠道</label>
                    <select class="editorial-input" v-model="tutorFormData.apiEndpointId">
                      <option value="">-- 选择分析使用的渠道 --</option>
                      <option v-for="ep in endpoints" :key="ep.id" :value="ep.id">{{ ep.name }}</option>
                    </select>
                  </div>
                  
                  <div class="input-group">
                    <label>调用的对话大模型 ID</label>
                    <input type="text" class="editorial-input" v-model="tutorFormData.modelName" placeholder="如: gpt-4o, claude-3-opus" />
                    <span class="help-text">请填写具有强推理能力的文本对话模型名称。</span>
                  </div>
                </div>

                <div class="input-group" style="margin-top: 1.5rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <label>导师人设设定 (System Prompt)</label>
                    <button type="button" class="ghost-button btn-sm" @click="tutorFormData.systemPrompt = ''">
                      恢复默认
                    </button>
                  </div>
                  <textarea 
                    class="editorial-input"
                    rows="6" 
                    v-model="tutorFormData.systemPrompt" 
                    placeholder="留空则使用默认提示词。注意：必须要求模型返回固定格式的 JSON（包含 optimized 和 tips）。" 
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <span v-if="tutorMessage" :class="tutorMessage.includes('失败') ? 'error-text' : 'success-text'">
                {{ tutorMessage }}
              </span>
              <button type="submit" class="primary-button" :disabled="isSavingTutor">
                {{ isSavingTutor ? '保存中...' : '保存学伴配置' }}
              </button>
            </div>
          </form>
        </div>
      </section>

    </div>

    <!-- Modals remain unchanged in logic, just reused the existing overlay structure -->
    <!-- Model Modal -->
    <div v-if="isModelModalOpen" class="overlay-backdrop">
      <div class="overlay-panel">
        <h2 class="overlay-title">{{ editingModel ? '编辑模型' : '手动添加模型' }}</h2>
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
                <option value="TEXT_TO_IMAGE">文生图 (仅生图)</option>
                <option value="BOTH">双模支持 (生图+对话)</option>
                <option value="IMAGE_TO_IMAGE">图生图 (Image to Image)</option>
              </select>
            </div>
            <div class="input-group">
              <label>提供方标识</label>
              <select class="editorial-input" v-model="modelFormData.provider">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="deepseek">DeepSeek</option>
                <option value="alibaba">Alibaba (Qwen)</option>
                <option value="other">其它 (Other)</option>
              </select>
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
          <div class="input-group">
            <label>API 格式</label>
            <select class="editorial-input" v-model="endpointFormData.apiFormat">
              <option value="openai">OpenAI 兼容格式 (绝大多数中转适用)</option>
              <option value="gemini">Google Gemini 原生格式</option>
            </select>
            <span class="help-text">如果使用硅基流动、ChatAnywhere等平台，请选择 OpenAI 兼容格式。仅直连 Google Gemini 时选择原生。</span>
          </div>
          <div class="overlay-actions">
            <button type="button" class="ghost-button" @click="isEndpointModalOpen = false">取消</button>
            <button type="submit" class="primary-button">{{ editingEndpoint ? '保存配置' : '确认添加' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Discover Modal -->
    <div v-if="isDiscoverModalOpen" class="overlay-backdrop">
      <div class="overlay-panel" style="max-width: 600px;">
        <h2 class="overlay-title">探测可用模型</h2>
        <div class="overlay-form" style="max-height: 70vh; overflow-y: auto;">
          <div v-if="isDiscovering" class="discovering-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <p>正在连接 API 渠道探测模型列表...</p>
          </div>
          <div v-else-if="discoveringError" class="info-banner warning">
            {{ discoveringError }}
          </div>
          <div v-else>
            <div style="margin-bottom: 24px;">
              <h3 class="discover-group-title">
                <span>📸 图像生成模型</span>
                <span class="badge badge-provider">推荐导入</span>
              </h3>
              <p v-if="discoveredModels.imageModels.length === 0" class="help-text">未探测到明显的图像生成模型。</p>
              <div v-else class="model-list-grid">
                <label v-for="model in discoveredModels.imageModels" :key="model.id" class="model-checkbox-item">
                  <input type="checkbox" :checked="selectedModels.has(model.id)" @change="toggleModelSelection(model.id)" />
                  <div class="model-info">
                    <strong>{{ model.name }}</strong>
                    <span>{{ model.provider }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h3 class="discover-group-title">
                <span>💬 文本对话模型</span>
                <span class="badge badge-provider">仅供参考</span>
              </h3>
              <p class="help-text" style="margin-bottom: 12px;">您可以直接复制模型 ID，填写在「AI 学伴配置」中，不需要导入。</p>
              <p v-if="discoveredModels.textModels.length === 0" class="help-text">未探测到文本模型。</p>
              <div v-else class="model-list-grid text-only">
                <div v-for="model in discoveredModels.textModels" :key="model.id" class="model-text-item" :title="model.id">
                  <strong>{{ model.id }}</strong>
                </div>
              </div>
            </div>
          </div>
          
          <div class="overlay-actions">
            <button type="button" class="ghost-button" @click="isDiscoverModalOpen = false">关闭</button>
            <button 
              type="button" 
              class="primary-button" 
              @click="handleBatchImport"
              :disabled="selectedModels.size === 0 || isDiscovering"
            >
              导入选中的生图模型 ({{ selectedModels.size }})
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Typography & Layout */
.editorial-container {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 64px;
}

.page-header {
  margin-bottom: 40px;
}

.editorial-title {
  font-family: var(--font-serif);
  font-size: 28px;
  color: var(--ink);
  margin: 0 0 8px 0;
}

.editorial-subtitle {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Sections */
.config-section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.section-title {
  font-family: var(--font-inter);
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 20px 36px;
  max-width: 600px;
  line-height: 1.5;
}

/* Buttons */
.primary-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover:not(:disabled) { background: var(--primary-active); }
.primary-button:disabled { background: var(--primary-disabled); cursor: not-allowed; opacity: 0.7; }

.ghost-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--hairline);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.ghost-button:hover { background: var(--surface-card); }

.btn-sm { padding: 6px 12px; font-size: 12px; }

.icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover { background: var(--surface-card); border-color: var(--hairline); color: var(--ink); }
.icon-btn.danger:hover { color: var(--error); background: #fdf5f5; border-color: #fbd6d6; }

/* Empty States */
.empty-state {
  text-align: center;
  padding: 48px;
  background: var(--surface-card);
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-md);
  color: var(--muted);
}
.empty-state svg { margin-bottom: 16px; opacity: 0.5; }
.empty-state h3 { font-size: 16px; margin: 0 0 8px 0; color: var(--ink); }
.empty-state p { font-size: 13px; margin: 0 0 20px 0; }

/* Endpoints Layout */
.endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.endpoint-card {
  background: var(--surface-card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.endpoint-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.03); }

.endpoint-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.endpoint-header:hover { background: var(--surface-cream-strong); }

.endpoint-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endpoint-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.endpoint-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.endpoint-url {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted-soft);
}

.endpoint-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--muted);
  transition: transform 0.3s;
}
.expand-icon.expanded { transform: rotate(180deg); }

.endpoint-models {
  border-top: 1px solid var(--hairline);
  background: var(--canvas);
}

.endpoint-models-inner {
  padding: 16px 24px 24px 24px;
}

.endpoint-models-header {
  margin-bottom: 12px;
}
.endpoint-models-header h4 {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.compact-model-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.compact-model-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  background: var(--surface-card);
}

.status-indicator {
  cursor: pointer;
  padding: 4px;
  display: flex;
}

.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active { background: var(--success); box-shadow: 0 0 0 2px rgba(93,184,114,0.2); }
.dot-inactive { background: var(--muted-soft); }

.m-name { flex: 1; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-id { font-size: 11px; color: var(--muted-soft); }

.empty-models {
  font-size: 13px;
  color: var(--muted-soft);
  font-style: italic;
}

/* Config Table */
.config-table-container {
  background: var(--surface-card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.config-table th {
  padding: 12px 16px;
  background: var(--surface-cream-strong);
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--hairline);
}

.config-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--hairline);
  font-size: 13px;
  color: var(--ink);
  vertical-align: middle;
}

.config-table tr:last-child td { border-bottom: none; }
.config-table tr:hover td { background: var(--canvas); }

.disabled-row td {
  opacity: 0.6;
}

.status-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px;
  border-radius: var(--radius-sm);
}
.status-toggle-btn:hover { background: var(--surface-cream-strong); }
.status-toggle-btn.active { color: var(--success); font-weight: 500; }

.name-content { display: flex; align-items: center; gap: 8px; }
.name-content strong { font-weight: 500; }
.td-channel { color: var(--muted); }

.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

/* Tutor Section */
.tutor-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}
.tutor-status.active { background: rgba(93,184,114,0.1); color: var(--success); }
.tutor-status.inactive { background: var(--surface-cream-strong); color: var(--muted); }

.tutor-config-area {
  margin-top: 16px;
  animation: slideDown 0.3s ease;
}

.editorial-card {
  background: var(--surface-card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.switch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--hairline);
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.card-body {
  padding: 24px;
  transition: opacity 0.3s;
}

.disabled-area {
  opacity: 0.5;
  pointer-events: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.success-text { color: var(--success); font-size: 13px; }

/* Badges & Shared */
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.badge-provider { background: var(--surface-cream-strong); color: var(--muted); }
.badge-format { background: var(--canvas); border: 1px solid var(--hairline); color: var(--muted); }
.badge-type { font-size: 10px; border: 1px solid var(--hairline); color: var(--muted); }
.badge-type.both { color: var(--primary); border-color: rgba(204, 120, 92, 0.3); background: rgba(204, 120, 92, 0.05); }

.mono-text { font-family: var(--font-mono); font-size: 12px; }
.error-text { color: var(--error); font-weight: 500; }

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
  padding: 20px 24px;
  margin: 0;
  font-family: var(--font-inter);
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--hairline);
  background: var(--surface-card);
}

.overlay-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-row { display: flex; gap: 16px; }
.input-group { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.input-group label { font-size: 13px; font-weight: 500; color: var(--muted); }

.editorial-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  background: var(--canvas);
  font-family: var(--font-inter);
  font-size: 14px;
  color: var(--ink);
  transition: border-color 0.2s;
  outline: none;
}
.editorial-input:focus { border-color: var(--primary); }

.help-text { font-size: 12px; color: var(--muted-soft); }

.overlay-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--hairline);
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 16px;
  background: #fffdf5;
  border: 1px solid #fce8a6;
  color: #8c6b00;
}

/* Discover Modal specifics */
.discovering-state {
  text-align: center;
  padding: 40px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.discover-group-title {
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-list-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.model-list-grid.text-only { grid-template-columns: repeat(3, 1fr); }

.model-checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--canvas);
}
.model-checkbox-item:hover { background: var(--surface-card); }
.model-checkbox-item input { margin-top: 4px; }

.model-info { display: flex; flex-direction: column; }
.model-info strong { font-size: 13px; font-weight: 500; }
.model-info span { font-size: 11px; color: var(--muted); text-transform: uppercase; }

.model-text-item {
  padding: 8px 10px;
  background: var(--surface-card);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-mono);
  border: 1px solid var(--hairline);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Switch styling */
.switch-container { position: relative; display: inline-block; width: 40px; height: 24px; }
.switch-slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--muted-soft); transition: .3s; border-radius: 24px;
}
.switch-slider:before {
  position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
input:checked + .switch-slider { background-color: var(--success); }
input:checked + .switch-slider:before { transform: translateX(16px); }

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { 100% { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>
