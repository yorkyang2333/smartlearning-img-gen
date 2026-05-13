<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const API = 'http://localhost:8080/api/teacher'

type ModelRecord = {
  id: string; name: string; modelId: string
  type: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'BOTH' | 'TEXT_GENERATION'
  provider: string; description?: string; config?: string
  isActive?: boolean; sortOrder?: number
}
type ChannelRecord = {
  id: number; name: string; type: number; status: number
  models: string; responseTime: number; testTime: number; balance: number
}

const models = ref<ModelRecord[]>([])
const channels = ref<ChannelRecord[]>([])
const modelsLoading = ref(true)
const isSyncing = ref(false)
const syncMessage = ref('')
const syncDetails = ref<any[]>([])
const showSyncDetails = ref(false)

const gatewayFormData = ref({ enabled: true, baseUrl: 'http://localhost:4000', apiKey: '' })
const gatewayResolvedBaseUrl = ref('http://localhost:4000')
const gatewayUpdatedAt = ref('')
const isSavingGateway = ref(false)
const gatewayMessage = ref('')

const isModelModalOpen = ref(false)
const editingModel = ref<ModelRecord | null>(null)
const modelFormData = ref({
  name: '', modelId: '', type: 'TEXT_TO_IMAGE',
  provider: 'openai', description: '', config: '{"sizes":["1024x1024"]}'
})

const tutorFormData = ref({ enabled: true, modelName: '', systemPrompt: '' })
const isSavingTutor = ref(false)
const tutorMessage = ref('')

const headers = () => ({ Authorization: `Bearer ${authStore.token}` })
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...headers() })

const fetchModels = async () => {
  modelsLoading.value = true
  try {
    const res = await fetch(`${API}/models`, { headers: headers() })
    if (res.ok) models.value = await res.json()
  } finally { modelsLoading.value = false }
}

const fetchChannels = async () => {
  try {
    const res = await fetch(`${API}/channels`, { headers: headers() })
    if (res.ok) {
      const data = await res.json()
      if (data.success) channels.value = data.data || []
    }
  } catch {}
}

const fetchGatewayConfig = async () => {
  try {
    const res = await fetch(`${API}/gateway-config`, { headers: headers() })
    if (!res.ok) return
    const data = await res.json()
    gatewayFormData.value = {
      enabled: data.enabled ?? true,
      baseUrl: data.baseUrl || 'http://localhost:4000',
      apiKey: data.apiKey || ''
    }
    gatewayResolvedBaseUrl.value = data.resolvedBaseUrl || gatewayFormData.value.baseUrl
    gatewayUpdatedAt.value = data.updatedAt || ''
  } catch {}
}

const fetchTutorConfig = async () => {
  try {
    const res = await fetch(`${API}/config`, { headers: headers() })
    if (!res.ok) return
    const data = await res.json()
    tutorFormData.value = { enabled: data.enabled, modelName: data.modelName || '', systemPrompt: data.systemPrompt || '' }
  } catch {}
}

const tutorModels = computed(() => models.value.filter(m => m.type === 'TEXT_GENERATION' || m.type === 'BOTH'))
const tutorModelOptions = computed(() => {
  const opts = [...tutorModels.value]
  if (tutorFormData.value.modelName && !opts.find(m => m.modelId === tutorFormData.value.modelName)) {
    opts.unshift({ id: 'custom-current', name: `${tutorFormData.value.modelName} (当前)`, modelId: tutorFormData.value.modelName, type: 'TEXT_GENERATION', provider: 'custom' })
  }
  return opts
})

const imageModels = computed(() => models.value.filter(m => m.type !== 'TEXT_GENERATION'))
const textModels = computed(() => models.value.filter(m => m.type === 'TEXT_GENERATION'))

const parseSizes = (config?: string) => {
  if (!config) return []
  try { const p = JSON.parse(config); return Array.isArray(p?.sizes) ? p.sizes : [] } catch { return [] }
}
const sizeSummary = (model: ModelRecord) => {
  const s = parseSizes(model.config)
  if (s.length === 0) return '由网关处理'
  if (s.length <= 3) return s.join(' / ')
  return `${s.slice(0, 3).join(' / ')} 等 ${s.length} 种`
}
const typeLabel = (type: string) => {
  const m: Record<string, string> = { TEXT_TO_IMAGE: '文生图', IMAGE_TO_IMAGE: '图生图', BOTH: '生图+编辑', TEXT_GENERATION: '文本分析' }
  return m[type] || type
}
const providerLabel = (p?: string) => {
  const m: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', deepseek: 'DeepSeek', alibaba: 'Alibaba', meta: 'Meta', other: '其它' }
  return m[p || ''] || p || '其它'
}
const channelTypeLabel = (t: number) => {
  const m: Record<number, string> = { 1: 'OpenAI', 3: 'Azure', 14: 'Anthropic', 15: 'Baidu', 17: 'Ali', 18: 'Xunfei', 24: 'Google Gemini', 28: 'Mistral', 31: 'Ollama', 33: 'AWS', 34: 'Cohere', 40: 'Cloudflare', 999: '自定义' }
  return m[t] || `类型${t}`
}
const channelStatusLabel = (s: number) => {
  if (s === 1) return '运行中'
  if (s === 2) return '已禁用'
  if (s === 3) return '自动禁用'
  return '未知'
}
const channelStatusClass = (s: number) => {
  if (s === 1) return 'status-ok'
  if (s === 2) return 'status-off'
  return 'status-err'
}

const handleModelToggle = async (model: ModelRecord, currentEnabled: boolean) => {
  const prev = model.isActive
  model.isActive = !currentEnabled
  try {
    const res = await fetch(`${API}/models/${model.id}`, {
      method: 'PUT', headers: jsonHeaders(),
      body: JSON.stringify({ ...model, isActive: model.isActive })
    })
    if (!res.ok) throw new Error()
  } catch { model.isActive = prev; alert('状态更新失败') }
}

const handleModelDelete = async (id: string) => {
  if (!confirm('确定要删除这个模型吗？')) return
  try { await fetch(`${API}/models/${id}`, { method: 'DELETE', headers: headers() }); fetchModels() } catch {}
}

const openModelModal = (model?: ModelRecord) => {
  if (model) {
    editingModel.value = model
    modelFormData.value = { name: model.name || '', modelId: model.modelId || '', type: model.type || 'TEXT_TO_IMAGE', provider: model.provider || 'openai', description: model.description || '', config: model.config || '{"sizes":["1024x1024"]}' }
  } else {
    editingModel.value = null
    modelFormData.value = { name: '', modelId: '', type: 'TEXT_TO_IMAGE', provider: 'openai', description: '', config: '{"sizes":["1024x1024"]}' }
  }
  isModelModalOpen.value = true
}

const handleModelSubmit = async (e: Event) => {
  e.preventDefault()
  const isEditing = !!editingModel.value
  const url = isEditing ? `${API}/models/${editingModel.value!.id}` : `${API}/models`
  try {
    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ ...modelFormData.value, isActive: editingModel.value?.isActive ?? true, sortOrder: editingModel.value?.sortOrder ?? models.value.length })
    })
    if (res.ok) { isModelModalOpen.value = false; fetchModels() } else alert('保存失败')
  } catch (err: any) { alert(`保存失败: ${err.message}`) }
}

const safeJson = async (res: Response) => {
  const text = await res.text()
  if (!text || !text.trim()) return null
  try { return JSON.parse(text) } catch { return null }
}

const handleSyncModels = async () => {
  isSyncing.value = true; syncMessage.value = ''; syncDetails.value = []; showSyncDetails.value = true
  try {
    const res = await fetch(`${API}/models/sync`, { method: 'POST', headers: headers() })
    const data = await safeJson(res)
    if (!res.ok || !data?.success) throw new Error(data?.error || `同步失败 (HTTP ${res.status})`)
    syncMessage.value = `同步完成：新增 ${data.created || 0} 个，更新 ${data.updated || 0} 个，共扫描 ${data.totalSynced || 0} 个模型`
    syncDetails.value = data.models || []
    await fetchModels()
  } catch (err: any) { syncMessage.value = `同步失败：${err.message}` }
  finally { isSyncing.value = false }
}

const handleGatewaySubmit = async (e: Event) => {
  e.preventDefault(); isSavingGateway.value = true; gatewayMessage.value = ''
  try {
    const res = await fetch(`${API}/gateway-config`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(gatewayFormData.value) })
    const data = await safeJson(res)
    if (!res.ok || data?.success === false) throw new Error(data?.error || `保存失败`)
    if (data) { gatewayResolvedBaseUrl.value = data.resolvedBaseUrl || gatewayFormData.value.baseUrl; gatewayUpdatedAt.value = data.updatedAt || '' }
    gatewayMessage.value = '配置保存成功'
    await fetchChannels()
  } catch (err: any) { gatewayMessage.value = `保存失败：${err.message}` }
  finally { isSavingGateway.value = false; setTimeout(() => gatewayMessage.value = '', 3000) }
}

const handleTutorSubmit = async (e: Event) => {
  e.preventDefault(); isSavingTutor.value = true; tutorMessage.value = ''
  try {
    const res = await fetch(`${API}/config`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(tutorFormData.value) })
    tutorMessage.value = res.ok ? '设置保存成功' : '设置保存失败'
  } catch { tutorMessage.value = '发生错误' }
  finally { isSavingTutor.value = false; setTimeout(() => tutorMessage.value = '', 3000) }
}

onMounted(async () => {
  await fetchGatewayConfig()
  await Promise.all([fetchModels(), fetchChannels()])
  await fetchTutorConfig()
})
</script>
<template>
  <div v-if="modelsLoading" class="loading-state">
    <div class="loading-spinner"></div>
    <span>加载模型目录中...</span>
  </div>

  <div v-else class="page-root">
    <!-- ============ SECTION 1: PAGE HEADER ============ -->
    <header class="page-hero">
      <div>
        <h1 class="hero-title">模型与配置</h1>
        <p class="hero-sub">通过 AI Gateway 网关统一接入大模型，管理渠道、模型目录和 AI 学伴教学配置。</p>
      </div>
      <div class="hero-actions">
        <button class="btn-secondary" @click="handleSyncModels" :disabled="isSyncing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {{ isSyncing ? '同步中...' : '同步模型' }}
        </button>
        <button class="btn-primary" @click="openModelModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          手动添加
        </button>
      </div>
    </header>

    <!-- Sync progress panel -->
    <div v-if="showSyncDetails" class="sync-panel">
      <div class="sync-panel-header">
        <div class="sync-status-row">
          <div v-if="isSyncing" class="sync-pulse"><span class="pulse-dot"></span> 正在探测 AI Gateway 模型...</div>
          <span v-else-if="syncMessage" :class="syncMessage.includes('失败') ? 'msg-error' : 'msg-success'">{{ syncMessage }}</span>
        </div>
        <button class="btn-icon" @click="showSyncDetails = false" title="关闭">✕</button>
      </div>
      <div v-if="syncDetails.length > 0" class="sync-detail-list">
        <div v-for="item in syncDetails" :key="item.modelId" class="sync-detail-item">
          <span class="sync-badge" :class="item.isNew ? 'badge-new' : 'badge-exist'">{{ item.isNew ? '新增' : '已有' }}</span>
          <span class="sync-model-name">{{ item.name }}</span>
          <span class="sync-model-id">{{ item.modelId }}</span>
          <span class="sync-model-type">{{ typeLabel(item.type) }}</span>
        </div>
      </div>
    </div>

    <!-- ============ SECTION 2: GATEWAY + CHANNELS ============ -->
    <section class="section-block">
      <div class="section-head">
        <h2 class="section-title">AI Gateway 网关</h2>
        <p class="section-desc">配置 One API 网关连接参数，管理上游渠道。</p>
      </div>

      <div class="gateway-grid">
        <!-- Left: config form -->
        <form class="card-cream" @submit="handleGatewaySubmit">
          <div class="card-top">
            <h3 class="card-label">网关连接</h3>
            <label class="switch-wrap">
              <input v-model="gatewayFormData.enabled" type="checkbox" class="switch-input" />
              <span class="switch-track"></span>
            </label>
          </div>
          <div class="card-inner">
            <div class="field">
              <label class="field-label">Base URL</label>
              <input type="url" class="field-input" v-model="gatewayFormData.baseUrl" placeholder="http://localhost:4000" />
            </div>
            <div class="field">
              <label class="field-label">API Key</label>
              <input type="password" class="field-input" v-model="gatewayFormData.apiKey" placeholder="留空表示网关无需鉴权" />
            </div>
            <div class="gateway-meta">
              <span>当前生效：{{ gatewayResolvedBaseUrl }}</span>
              <span v-if="gatewayUpdatedAt">更新于：{{ new Date(gatewayUpdatedAt).toLocaleString() }}</span>
            </div>
            <div class="card-actions">
              <span v-if="gatewayMessage" :class="gatewayMessage.includes('失败') ? 'msg-error' : 'msg-success'">{{ gatewayMessage }}</span>
              <button type="submit" class="btn-primary btn-sm" :disabled="isSavingGateway">{{ isSavingGateway ? '保存中...' : '保存网关配置' }}</button>
            </div>
          </div>
        </form>

        <!-- Right: channel list -->
        <div class="card-cream">
          <div class="card-top">
            <h3 class="card-label">上游渠道</h3>
            <span class="channel-count">{{ channels.length }} 个渠道</span>
          </div>
          <div class="card-inner channel-list-area">
            <div v-if="channels.length === 0" class="empty-hint">
              <p>暂无渠道数据。请先保存网关配置，或前往 One API 管理面板添加渠道。</p>
            </div>
            <div v-else class="channel-list">
              <div v-for="ch in channels" :key="ch.id" class="channel-item">
                <div class="channel-status-dot" :class="channelStatusClass(ch.status)"></div>
                <div class="channel-info">
                  <div class="channel-name">{{ ch.name || `渠道 #${ch.id}` }}</div>
                  <div class="channel-meta-row">
                    <span class="channel-type-tag">{{ channelTypeLabel(ch.type) }}</span>
                    <span v-if="ch.responseTime > 0" class="channel-latency">{{ ch.responseTime }}ms</span>
                    <span class="channel-status-text">{{ channelStatusLabel(ch.status) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ SECTION 3: MODEL TABLE ============ -->
    <section class="section-block">
      <div class="section-head">
        <h2 class="section-title">全局模型目录</h2>
        <p class="section-desc">管理可供学生使用的生图模型和文本分析模型。</p>
      </div>

      <div v-if="models.length === 0" class="empty-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <h3>暂无模型</h3>
        <p>先从 AI Gateway 同步模型，或手动录入模型。</p>
      </div>

      <!-- Image models -->
      <div v-if="imageModels.length > 0" class="table-group">
        <h3 class="table-group-title">
          <span class="badge-coral">生图</span>
          生图模型 <span class="count-muted">{{ imageModels.length }}</span>
        </h3>
        <div class="table-card">
          <table class="model-table">
            <thead><tr>
              <th width="90">状态</th><th>展示名称</th><th>模型 ID</th><th>类型</th><th>提供方</th><th>尺寸</th><th width="90" style="text-align:right">操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="model in imageModels" :key="model.id" :class="{ 'row-disabled': !model.isActive }">
                <td>
                  <button class="toggle-btn" :class="model.isActive ? 'on' : 'off'" @click="handleModelToggle(model, !!model.isActive)">
                    <span class="toggle-dot" :class="model.isActive ? 'dot-on' : 'dot-off'"></span>
                    {{ model.isActive ? '启用' : '停用' }}
                  </button>
                </td>
                <td><div class="cell-name"><strong>{{ model.name }}</strong><span v-if="model.description" class="cell-desc">{{ model.description }}</span></div></td>
                <td class="cell-mono">{{ model.modelId }}</td>
                <td><span class="badge-pill badge-coral-light">{{ typeLabel(model.type) }}</span></td>
                <td>{{ providerLabel(model.provider) }}</td>
                <td class="cell-sizes">{{ sizeSummary(model) }}</td>
                <td>
                  <div class="cell-actions">
                    <button class="act-btn" @click="openModelModal(model)" title="编辑">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="act-btn act-danger" @click="handleModelDelete(model.id)" title="删除">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Text models -->
      <div v-if="textModels.length > 0" class="table-group">
        <h3 class="table-group-title">
          <span class="badge-teal">文本</span>
          文本分析模型 <span class="count-muted">{{ textModels.length }}</span>
        </h3>
        <div class="table-card">
          <table class="model-table">
            <thead><tr>
              <th width="90">状态</th><th>展示名称</th><th>模型 ID</th><th>提供方</th><th width="90" style="text-align:right">操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="model in textModels" :key="model.id" :class="{ 'row-disabled': !model.isActive }">
                <td>
                  <button class="toggle-btn" :class="model.isActive ? 'on' : 'off'" @click="handleModelToggle(model, !!model.isActive)">
                    <span class="toggle-dot" :class="model.isActive ? 'dot-on' : 'dot-off'"></span>
                    {{ model.isActive ? '启用' : '停用' }}
                  </button>
                </td>
                <td><div class="cell-name"><strong>{{ model.name }}</strong><span v-if="model.description" class="cell-desc">{{ model.description }}</span></div></td>
                <td class="cell-mono">{{ model.modelId }}</td>
                <td>{{ providerLabel(model.provider) }}</td>
                <td>
                  <div class="cell-actions">
                    <button class="act-btn" @click="openModelModal(model)" title="编辑">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="act-btn act-danger" @click="handleModelDelete(model.id)" title="删除">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ============ SECTION 4: AI TUTOR (DARK) ============ -->
    <section class="section-dark">
      <div class="dark-inner">
        <div class="dark-header">
          <div>
            <h2 class="dark-title">AI 学伴配置</h2>
            <p class="dark-desc">为学生提供 AI 辅导伴侣。开启后，学生在创作工作区可以获得 AI 的点评与建议。</p>
          </div>
          <label class="switch-wrap switch-lg">
            <input v-model="tutorFormData.enabled" type="checkbox" class="switch-input" />
            <span class="switch-track switch-track-lg"></span>
          </label>
        </div>

        <form @submit="handleTutorSubmit" class="dark-form" :class="{ 'form-disabled': !tutorFormData.enabled }">
          <div class="dark-form-grid">
            <div class="field">
              <label class="field-label-dark">分析模型</label>
              <select class="field-input-dark" v-model="tutorFormData.modelName">
                <option value="">-- 选择文本/多模态模型 --</option>
                <option v-for="m in tutorModelOptions" :key="m.modelId" :value="m.modelId">{{ m.name }} ({{ m.modelId }})</option>
              </select>
            </div>
          </div>
          <div class="field" style="margin-top:20px">
            <div class="field-label-row">
              <label class="field-label-dark">导师人设 (System Prompt)</label>
              <button type="button" class="btn-ghost-dark" @click="tutorFormData.systemPrompt = ''">恢复默认</button>
            </div>
            <textarea class="field-textarea-dark" rows="5" v-model="tutorFormData.systemPrompt" placeholder="留空则使用默认提示词。"></textarea>
          </div>
          <div class="card-actions" style="margin-top:20px">
            <span v-if="tutorMessage" :class="tutorMessage.includes('失败') || tutorMessage.includes('错误') ? 'msg-error' : 'msg-success-dark'">{{ tutorMessage }}</span>
            <button type="submit" class="btn-dark" :disabled="isSavingTutor">{{ isSavingTutor ? '保存中...' : '保存学伴配置' }}</button>
          </div>
        </form>
      </div>
    </section>

    <!-- ============ MODEL MODAL ============ -->
    <div v-if="isModelModalOpen" class="modal-backdrop" @click.self="isModelModalOpen = false">
      <div class="modal-panel">
        <h2 class="modal-title">{{ editingModel ? '编辑模型' : '手动添加模型' }}</h2>
        <form @submit="handleModelSubmit" class="modal-form">
          <div class="form-row">
            <div class="field"><label class="field-label">展示名称</label><input type="text" class="field-input" required v-model="modelFormData.name" placeholder="如: GPT Image 2" /></div>
            <div class="field"><label class="field-label">模型 ID</label><input type="text" class="field-input" required v-model="modelFormData.modelId" placeholder="如: gpt-image-1" /></div>
          </div>
          <div class="form-row">
            <div class="field">
              <label class="field-label">支持类型</label>
              <select class="field-input" v-model="modelFormData.type">
                <option value="TEXT_TO_IMAGE">文生图</option><option value="BOTH">生图+编辑</option>
                <option value="IMAGE_TO_IMAGE">图生图</option><option value="TEXT_GENERATION">文本分析</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">提供方</label>
              <select class="field-input" v-model="modelFormData.provider">
                <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option>
                <option value="google">Google</option><option value="deepseek">DeepSeek</option>
                <option value="alibaba">Alibaba</option><option value="meta">Meta</option><option value="other">其它</option>
              </select>
            </div>
          </div>
          <div class="field"><label class="field-label">功能描述</label><input type="text" class="field-input" v-model="modelFormData.description" placeholder="一句话介绍..." /></div>
          <div class="field"><label class="field-label">配置 JSON</label><textarea class="field-input cell-mono" rows="3" v-model="modelFormData.config"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="isModelModalOpen = false">取消</button>
            <button type="submit" class="btn-primary">{{ editingModel ? '保存更改' : '确认添加' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* ===== LOADING ===== */
.loading-state { display:flex; align-items:center; justify-content:center; gap:12px; min-height:60vh; color:var(--muted); font-size:15px; }
.loading-spinner { width:20px; height:20px; border:2px solid var(--hairline); border-top-color:var(--primary); border-radius:50%; animation:spin 0.8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ===== PAGE ROOT ===== */
.page-root { max-width:1080px; margin:0 auto; padding-bottom:96px; }

/* ===== SECTION 1: HERO ===== */
.page-hero { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:40px; }
.hero-title { font-family:var(--font-serif); font-size:48px; font-weight:400; line-height:1.1; letter-spacing:-1px; color:var(--ink); margin:0 0 12px 0; }
.hero-sub { font-family:var(--font-inter); font-size:16px; color:var(--muted); line-height:1.55; margin:0; max-width:560px; }
.hero-actions { display:flex; gap:12px; flex-shrink:0; }

/* ===== BUTTONS ===== */
.btn-primary, .btn-secondary, .btn-dark { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:var(--radius-md); font-weight:500; font-size:14px; cursor:pointer; border:none; transition:background 0.15s; }
.btn-primary { background:var(--primary); color:var(--on-primary); }
.btn-primary:hover:not(:disabled) { background:var(--primary-active); }
.btn-primary:disabled { background:var(--primary-disabled); color:var(--muted); cursor:not-allowed; }
.btn-secondary { background:var(--canvas); color:var(--ink); border:1px solid var(--hairline); }
.btn-secondary:hover:not(:disabled) { background:var(--surface-card); }
.btn-dark { background:var(--surface-dark-elevated); color:var(--on-dark); }
.btn-dark:hover:not(:disabled) { background:#2f2d2a; }
.btn-sm { padding:8px 16px; font-size:13px; }
.btn-icon { background:none; border:none; color:var(--muted); cursor:pointer; font-size:16px; padding:4px; }
.btn-ghost-dark { background:none; border:none; color:var(--on-dark-soft); cursor:pointer; font-size:13px; }
.btn-ghost-dark:hover { color:var(--on-dark); }

/* ===== SYNC PANEL ===== */
.sync-panel { background:var(--surface-card); border:1px solid var(--hairline); border-radius:var(--radius-lg); padding:16px 20px; margin-bottom:32px; }
.sync-panel-header { display:flex; justify-content:space-between; align-items:center; }
.sync-pulse { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--accent-teal); }
.pulse-dot { width:8px; height:8px; border-radius:50%; background:var(--accent-teal); animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.sync-detail-list { margin-top:12px; display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto; }
.sync-detail-item { display:flex; align-items:center; gap:10px; font-size:13px; padding:6px 0; border-bottom:1px solid var(--hairline-soft); }
.sync-badge { padding:2px 8px; border-radius:var(--radius-pill); font-size:11px; font-weight:500; }
.badge-new { background:var(--primary); color:white; }
.badge-exist { background:var(--surface-cream-strong); color:var(--muted); }
.sync-model-name { font-weight:500; color:var(--ink); }
.sync-model-id { font-family:var(--font-mono); font-size:12px; color:var(--muted); }
.sync-model-type { color:var(--muted-soft); font-size:12px; margin-left:auto; }

/* ===== SECTION BLOCKS ===== */
.section-block { margin-bottom:48px; }
.section-head { margin-bottom:16px; }
.section-title { font-family:var(--font-serif); font-size:28px; font-weight:400; letter-spacing:-0.3px; color:var(--ink); margin:0 0 6px 0; }
.section-desc { font-size:14px; color:var(--muted); margin:0; line-height:1.5; }

/* ===== GATEWAY GRID ===== */
.gateway-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }

/* ===== CARDS (CREAM) ===== */
.card-cream { background:var(--surface-card); border:1px solid var(--hairline); border-radius:var(--radius-lg); overflow:hidden; }
.card-top { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--hairline); }
.card-label { margin:0; font-size:15px; font-weight:500; color:var(--ink); font-family:var(--font-inter); }
.card-inner { padding:20px; }
.card-actions { display:flex; align-items:center; justify-content:flex-end; gap:12px; margin-top:16px; }

/* ===== SWITCH ===== */
.switch-wrap { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer; }
.switch-input { position:absolute; opacity:0; width:0; height:0; }
.switch-track { position:absolute; inset:0; background:var(--hairline); border-radius:24px; transition:background 0.25s; }
.switch-track::before { content:''; position:absolute; height:20px; width:20px; left:2px; bottom:2px; background:white; border-radius:50%; transition:transform 0.25s; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
.switch-input:checked + .switch-track { background:var(--primary); }
.switch-input:checked + .switch-track::before { transform:translateX(20px); }
.switch-lg { width:52px; height:28px; }
.switch-track-lg { border-radius:28px; }
.switch-track-lg::before { height:24px; width:24px; }
.switch-input:checked + .switch-track-lg::before { transform:translateX(24px); }

/* ===== FIELDS ===== */
.field { display:flex; flex-direction:column; gap:6px; }
.field + .field { margin-top:14px; }
.field-label { font-size:13px; font-weight:500; color:var(--body-strong); }
.field-label-dark { font-size:13px; font-weight:500; color:var(--on-dark-soft); }
.field-label-row { display:flex; justify-content:space-between; align-items:flex-end; }
.field-input { width:100%; padding:10px 14px; border:1px solid var(--hairline); border-radius:var(--radius-md); background:white; font-size:14px; color:var(--ink); font-family:var(--font-inter); }
.field-input:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(204,120,92,0.12); }
.field-input-dark { width:100%; padding:10px 14px; border:1px solid var(--surface-dark-elevated); border-radius:var(--radius-md); background:var(--surface-dark-soft); font-size:14px; color:var(--on-dark); font-family:var(--font-inter); }
.field-input-dark:focus { outline:none; border-color:var(--primary); }
.field-textarea-dark { width:100%; padding:12px 14px; border:1px solid var(--surface-dark-elevated); border-radius:var(--radius-md); background:var(--surface-dark-soft); color:var(--on-dark); font-size:14px; font-family:var(--font-mono); resize:vertical; line-height:1.6; }
.field-textarea-dark:focus { outline:none; border-color:var(--primary); }
.gateway-meta { display:flex; justify-content:space-between; gap:16px; margin-top:12px; font-size:12px; color:var(--muted); }

/* ===== CHANNELS ===== */
.channel-count { font-size:13px; color:var(--muted); }
.channel-list-area { max-height:280px; overflow-y:auto; }
.channel-list { display:flex; flex-direction:column; gap:2px; }
.channel-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--hairline-soft); }
.channel-item:last-child { border-bottom:none; }
.channel-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.status-ok { background:var(--success); }
.status-off { background:var(--muted-soft); }
.status-err { background:var(--error); }
.channel-info { flex:1; min-width:0; }
.channel-name { font-size:14px; font-weight:500; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.channel-meta-row { display:flex; gap:8px; align-items:center; margin-top:3px; }
.channel-type-tag { font-size:11px; padding:1px 6px; background:var(--surface-cream-strong); border-radius:var(--radius-xs); color:var(--muted); }
.channel-latency { font-size:11px; color:var(--accent-teal); font-family:var(--font-mono); }
.channel-status-text { font-size:11px; color:var(--muted-soft); }
.empty-hint { color:var(--muted); font-size:14px; text-align:center; padding:24px 0; }
.empty-hint p { margin:0; }

/* ===== MODEL TABLE ===== */
.table-group { margin-bottom:24px; }
.table-group-title { font-family:var(--font-inter); font-size:15px; font-weight:500; color:var(--ink); margin:0 0 10px 0; display:flex; align-items:center; gap:8px; }
.count-muted { color:var(--muted-soft); font-weight:400; }
.badge-coral, .badge-teal { display:inline-block; padding:2px 10px; border-radius:var(--radius-pill); font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; }
.badge-coral { background:var(--primary); color:white; }
.badge-teal { background:var(--accent-teal); color:white; }
.badge-pill { display:inline-block; padding:2px 8px; border-radius:var(--radius-pill); font-size:12px; font-weight:500; }
.badge-coral-light { background:rgba(204,120,92,0.12); color:var(--primary-active); }
.table-card { background:var(--surface-card); border:1px solid var(--hairline); border-radius:var(--radius-lg); overflow:hidden; }
.model-table { width:100%; border-collapse:collapse; }
.model-table th { padding:12px 16px; text-align:left; font-size:12px; font-weight:500; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--hairline); background:var(--surface-soft); }
.model-table td { padding:14px 16px; border-bottom:1px solid var(--hairline-soft); vertical-align:top; font-size:14px; }
.model-table tbody tr:last-child td { border-bottom:none; }
.row-disabled { opacity:0.5; }

/* ===== TABLE CELLS ===== */
.toggle-btn { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border:1px solid var(--hairline); border-radius:var(--radius-pill); background:white; cursor:pointer; font-size:12px; }
.toggle-btn.on { color:var(--ink); }
.toggle-btn.off { color:var(--muted); }
.toggle-dot { width:7px; height:7px; border-radius:50%; }
.dot-on { background:var(--success); }
.dot-off { background:var(--warning); }
.cell-name { display:flex; flex-direction:column; gap:3px; }
.cell-desc { font-size:12px; color:var(--muted); }
.cell-mono { font-family:var(--font-mono); font-size:12px; color:var(--muted); }
.cell-sizes { font-size:13px; color:var(--muted); }
.cell-actions { display:flex; justify-content:flex-end; gap:6px; }
.act-btn { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:1px solid var(--hairline); border-radius:var(--radius-sm); background:white; cursor:pointer; color:var(--muted); }
.act-btn:hover { color:var(--ink); border-color:var(--muted-soft); }
.act-danger { color:var(--error); }
.act-danger:hover { color:var(--error); background:rgba(198,69,69,0.06); }

/* ===== EMPTY CARD ===== */
.empty-card { padding:48px; border:1px dashed var(--hairline); border-radius:var(--radius-lg); text-align:center; color:var(--muted); }
.empty-card h3 { font-family:var(--font-inter); margin:12px 0 4px; }
.empty-card svg { color:var(--muted-soft); }

/* ===== DARK SECTION (AI TUTOR) ===== */
.section-dark { background:var(--surface-dark); border-radius:var(--radius-lg); margin-bottom:48px; }
.dark-inner { padding:32px; }
.dark-header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:24px; }
.dark-title { font-family:var(--font-serif); font-size:28px; font-weight:400; letter-spacing:-0.3px; color:var(--on-dark); margin:0 0 8px 0; }
.dark-desc { font-size:14px; color:var(--on-dark-soft); margin:0; line-height:1.5; max-width:600px; }
.dark-form { transition:opacity 0.2s; }
.form-disabled { opacity:0.4; pointer-events:none; }
.dark-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

/* ===== MODAL ===== */
.modal-backdrop { position:fixed; inset:0; background:rgba(20,20,19,0.45); display:flex; align-items:center; justify-content:center; padding:24px; z-index:100; }
.modal-panel { width:min(680px,100%); background:white; border-radius:var(--radius-xl); border:1px solid var(--hairline); padding:28px; }
.modal-title { font-family:var(--font-serif); font-size:24px; font-weight:400; letter-spacing:-0.3px; margin:0 0 20px 0; }
.modal-form { display:flex; flex-direction:column; gap:14px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.modal-actions { display:flex; justify-content:flex-end; gap:12px; margin-top:8px; }

/* ===== MESSAGES ===== */
.msg-success { color:var(--success); font-size:13px; }
.msg-success-dark { color:var(--accent-teal); font-size:13px; }
.msg-error { color:var(--error); font-size:13px; }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .page-hero { flex-direction:column; }
  .hero-title { font-size:36px; }
  .gateway-grid { grid-template-columns:1fr; }
  .form-row, .dark-form-grid { grid-template-columns:1fr; }
  .hero-actions { width:100%; }
}
</style>
