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

const searchQuery = ref('')
const isImageExpanded = ref(false)
const isTextExpanded = ref(false)

const filteredModels = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return models.value
  return models.value.filter(m => 
    (m.name && m.name.toLowerCase().includes(q)) || 
    (m.modelId && m.modelId.toLowerCase().includes(q)) ||
    (m.description && m.description.toLowerCase().includes(q)) ||
    (m.provider && m.provider.toLowerCase().includes(q))
  )
})

const imageModels = computed(() => filteredModels.value.filter(m => m.type !== 'TEXT_GENERATION'))
const textModels = computed(() => filteredModels.value.filter(m => m.type === 'TEXT_GENERATION'))

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
    <!-- ============ SECTION 1: PAGE HEADER (HERO BAND) ============ -->
    <header class="hero-band">
      <div class="hero-text-col">
        <h1 class="hero-title">模型与配置</h1>
        <p class="hero-sub">通过 AI Gateway 网关统一接入大模型，<br>管理集成渠道、生图目录以及智能学伴引擎参数。</p>
      </div>
      <div class="hero-actions-col">
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
          <div v-if="isSyncing" class="sync-pulse"><span class="pulse-dot"></span> 正在探测网关节点并映射模型...</div>
          <span v-else-if="syncMessage" :class="syncMessage.includes('失败') ? 'msg-error' : 'msg-success'">{{ syncMessage }}</span>
        </div>
        <button class="btn-icon" @click="showSyncDetails = false" title="关闭">✕</button>
      </div>
      <div v-if="syncDetails.length > 0" class="sync-detail-list">
        <div v-for="item in syncDetails" :key="item.modelId" class="sync-detail-item">
          <span class="sync-badge" :class="item.isNew ? 'badge-new' : 'badge-exist'">{{ item.isNew ? 'NEW' : 'EXISTING' }}</span>
          <span class="sync-model-name">{{ item.name }}</span>
          <span class="sync-model-id">{{ item.modelId }}</span>
          <span class="sync-model-type">{{ typeLabel(item.type) }}</span>
        </div>
      </div>
    </div>

    <!-- ============ SECTION 2: INFRASTRUCTURE (DARK & TILES) ============ -->
    <section class="section-block">
      <div class="section-head">
        <h2 class="section-title">基础设施架构</h2>
        <p class="section-desc">配置核心网关连接参数，监控上游 API 渠道节点的健康状态。</p>
      </div>

      <div class="gateway-grid">
        <!-- Left: config form (DARK MOCKUP) -->
        <form class="card-light" @submit="handleGatewaySubmit">
          <div class="card-top">
            <h3 class="card-label">网关直连配置</h3>
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
              <span>ACTIVE: <span class="cell-mono-light">{{ gatewayResolvedBaseUrl }}</span></span>
              <span v-if="gatewayUpdatedAt">SYNC: {{ new Date(gatewayUpdatedAt).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="card-actions">
              <span v-if="gatewayMessage" :class="gatewayMessage.includes('失败') ? 'msg-error' : 'msg-success'">{{ gatewayMessage }}</span>
              <button type="submit" class="btn-secondary btn-sm" :disabled="isSavingGateway">{{ isSavingGateway ? 'Saving...' : '保存参数配置' }}</button>
            </div>
          </div>
        </form>

        <!-- Right: channel list (CONNECTOR TILES) -->
        <div class="channel-tiles-wrapper">
          <div class="card-top-transparent">
            <h3 class="section-title-sm">活跃集成节点</h3>
            <span class="channel-count">{{ channels.length }} 个节点</span>
          </div>
          <div class="channel-list-area">
            <div v-if="channels.length === 0" class="empty-hint">
              <p>暂无活跃的渠道数据。<br>请先保存网关配置并到 New API 控制台录入。</p>
            </div>
            <div v-else class="connector-tiles-grid">
              <div v-for="ch in channels" :key="ch.id" class="connector-tile">
                <div class="tile-header">
                  <div class="tile-title">{{ ch.name || `Channel #${ch.id}` }}</div>
                  <div class="channel-status-dot" :class="channelStatusClass(ch.status)"></div>
                </div>
                <div class="tile-meta">
                  <span class="channel-type-tag">{{ channelTypeLabel(ch.type) }}</span>
                  <span v-if="ch.responseTime > 0" class="channel-latency">{{ ch.responseTime }}ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ SECTION 3: MODEL DIRECTORY ============ -->
    <section class="section-block">
      <div class="section-head" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 class="section-title">可用模型池</h2>
          <p class="section-desc">面向学生开放的生成模型清单。</p>
        </div>
        <div style="width: 280px;">
          <input type="text" v-model="searchQuery" class="field-input" placeholder="搜索模型名称或标识符..." />
        </div>
      </div>

      <div v-if="models.length === 0" class="empty-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <h3>模型库为空</h3>
        <p>请点击顶部“同步模型”从网关抓取或手动添加。</p>
      </div>

      <!-- Image models -->
      <div v-if="imageModels.length > 0" class="table-group">
        <h3 class="table-group-title" @click="isImageExpanded = !isImageExpanded" style="cursor: pointer; user-select: none;">
          <span class="badge-coral">图像生成</span>
          <span class="count-muted">{{ imageModels.length }} 款可用</span>
          <span style="margin-left: auto; color: var(--muted); font-size: 13px;">{{ isImageExpanded ? '收起 ▲' : '展开 ▼' }}</span>
        </h3>
        <div v-show="isImageExpanded" class="table-card">
          <table class="model-table">
            <thead><tr>
              <th width="100">STATUS</th><th>MODEL NAME</th><th>IDENTIFIER</th><th>TYPE</th><th>PROVIDER</th><th>SIZES</th><th width="100" style="text-align:right">ACTIONS</th>
            </tr></thead>
            <tbody>
              <tr v-for="model in imageModels" :key="model.id" :class="{ 'row-disabled': !model.isActive }">
                <td>
                  <button class="toggle-btn" :class="model.isActive ? 'on' : 'off'" @click="handleModelToggle(model, !!model.isActive)">
                    <span class="toggle-dot" :class="model.isActive ? 'dot-on' : 'dot-off'"></span>
                    {{ model.isActive ? 'ENABLED' : 'DISABLED' }}
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
        <h3 class="table-group-title" @click="isTextExpanded = !isTextExpanded" style="cursor: pointer; user-select: none;">
          <span class="badge-teal">多模态/文本</span>
          <span class="count-muted">{{ textModels.length }} 款可用</span>
          <span style="margin-left: auto; color: var(--muted); font-size: 13px;">{{ isTextExpanded ? '收起 ▲' : '展开 ▼' }}</span>
        </h3>
        <div v-show="isTextExpanded" class="table-card">
          <table class="model-table">
            <thead><tr>
              <th width="100">STATUS</th><th>MODEL NAME</th><th>IDENTIFIER</th><th>PROVIDER</th><th width="100" style="text-align:right">ACTIONS</th>
            </tr></thead>
            <tbody>
              <tr v-for="model in textModels" :key="model.id" :class="{ 'row-disabled': !model.isActive }">
                <td>
                  <button class="toggle-btn" :class="model.isActive ? 'on' : 'off'" @click="handleModelToggle(model, !!model.isActive)">
                    <span class="toggle-dot" :class="model.isActive ? 'dot-on' : 'dot-off'"></span>
                    {{ model.isActive ? 'ENABLED' : 'DISABLED' }}
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

    <!-- ============ SECTION 4: AI TUTOR ============ -->
    <section class="section-block tutor-section">
      <div class="section-head">
        <h2 class="section-title">AI 学伴配置引擎</h2>
        <p class="section-desc">作为学生的“第二导师”，学伴会在创作空间实时提供点评建议。可为其指定专属的人设指令与支撑模型。</p>
      </div>

      <div class="card-light tutor-card">
        <div class="card-top">
          <h3 class="card-label">学伴引擎状态</h3>
          <label class="switch-wrap switch-lg">
            <input v-model="tutorFormData.enabled" type="checkbox" class="switch-input" />
            <span class="switch-track switch-track-lg"></span>
          </label>
        </div>

        <form @submit="handleTutorSubmit" class="tutor-form" :class="{ 'form-disabled': !tutorFormData.enabled }">
          <div class="form-row">
            <div class="field">
              <label class="field-label">底层分析模型绑定</label>
              <select class="field-input" v-model="tutorFormData.modelName">
                <option value="">-- 选择文本/多模态模型 --</option>
                <option v-for="m in tutorModelOptions" :key="m.modelId" :value="m.modelId">{{ m.name }} ({{ m.modelId }})</option>
              </select>
            </div>
          </div>
          <div class="field" style="margin-top:24px">
            <div class="field-label-row">
              <label class="field-label">导师人设 (System Prompt)</label>
              <button type="button" class="btn-text-link" @click="tutorFormData.systemPrompt = ''">恢复系统默认</button>
            </div>
            <textarea class="field-input" style="height: auto; font-family: var(--font-mono); resize: vertical; line-height: 1.6;" rows="5" v-model="tutorFormData.systemPrompt" placeholder="留空则使用默认学伴提示词规则。你可以用 markdown 为学伴编排特定的回复格式要求。"></textarea>
          </div>
          <div class="card-actions" style="margin-top:32px">
            <span v-if="tutorMessage" :class="tutorMessage.includes('失败') || tutorMessage.includes('错误') ? 'msg-error' : 'msg-success'">{{ tutorMessage }}</span>
            <button type="submit" class="btn-primary" :disabled="isSavingTutor">{{ isSavingTutor ? '同步更新中...' : '发布学伴配置' }}</button>
          </div>
        </form>
      </div>
    </section>

    <!-- ============ MODEL MODAL ============ -->
    <div v-if="isModelModalOpen" class="modal-backdrop" @click.self="isModelModalOpen = false">
      <div class="modal-panel">
        <h2 class="modal-title">{{ editingModel ? '编辑模型参数' : '手动挂载模型' }}</h2>
        <form @submit="handleModelSubmit" class="modal-form">
          <div class="form-row">
            <div class="field"><label class="field-label">展示名称</label><input type="text" class="field-input" required v-model="modelFormData.name" placeholder="例如: Stable Diffusion XL" /></div>
            <div class="field"><label class="field-label">API Identifier (模型 ID)</label><input type="text" class="field-input cell-mono" required v-model="modelFormData.modelId" placeholder="例如: sd-xl-v1.0" /></div>
          </div>
          <div class="form-row">
            <div class="field">
              <label class="field-label">引擎特性</label>
              <select class="field-input" v-model="modelFormData.type">
                <option value="TEXT_TO_IMAGE">文生图 (Text-to-Image)</option>
                <option value="IMAGE_TO_IMAGE">图生图 (Image-to-Image)</option>
                <option value="BOTH">混合生图 (Text & Image)</option>
                <option value="TEXT_GENERATION">多模态文本 (Text Generation)</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">服务提供商</label>
              <select class="field-input" v-model="modelFormData.provider">
                <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option>
                <option value="google">Google</option><option value="deepseek">DeepSeek</option>
                <option value="alibaba">Alibaba</option><option value="meta">Meta</option><option value="other">自定义渠道</option>
              </select>
            </div>
          </div>
          <div class="field"><label class="field-label">简要描述</label><input type="text" class="field-input" v-model="modelFormData.description" placeholder="一句话说明该模型的特长或用途..." /></div>
          <div class="field"><label class="field-label">扩展配置 (JSON 格式)</label><textarea class="field-input cell-mono" style="height:auto" rows="3" v-model="modelFormData.config"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="isModelModalOpen = false">取消</button>
            <button type="submit" class="btn-primary">{{ editingModel ? '保存修改' : '确认添加' }}</button>
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
.page-root { max-width:1120px; margin:0 auto; padding-bottom:120px; }

/* ===== SECTION 1: HERO BAND ===== */
.hero-band { display:flex; justify-content:space-between; align-items:center; padding:0 0 64px 0; }
.hero-text-col { flex:1; }
.hero-title { font-family:var(--font-serif); font-size:48px; font-weight:400; line-height:1.1; letter-spacing:-1px; color:var(--ink); margin:0 0 16px 0; }
.hero-sub { font-family:var(--font-inter); font-size:18px; color:var(--muted); line-height:1.6; margin:0; max-width:600px; font-weight:400; }
.hero-actions-col { display:flex; gap:16px; flex-shrink:0; align-items:center; }

/* ===== BUTTONS ===== */
.btn-primary, .btn-secondary, .btn-coral-invert { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 20px; height:40px; border-radius:var(--radius-md); font-weight:500; font-size:14px; cursor:pointer; border:none; transition:background 0.15s, opacity 0.15s, box-shadow 0.15s; font-family:var(--font-inter); }
.btn-primary { background:var(--primary); color:var(--on-primary); }
.btn-primary:hover:not(:disabled) { background:var(--primary-active); }
.btn-primary:disabled { background:var(--primary-disabled); color:var(--muted); cursor:not-allowed; }
.btn-secondary { background:var(--surface-card); color:var(--ink); border:1px solid var(--hairline); }
.btn-secondary:hover:not(:disabled) { background:white; }
.btn-coral-invert { background:white; color:var(--primary); }
.btn-coral-invert:hover:not(:disabled) { opacity:0.9; }
.btn-sm { padding:0 16px; height:36px; font-size:13px; }
.btn-icon { background:none; border:none; color:var(--muted); cursor:pointer; font-size:16px; padding:4px; }
.btn-ghost-coral { background:none; border:none; color:rgba(255,255,255,0.7); cursor:pointer; font-size:13px; font-family:var(--font-inter); }
.btn-ghost-coral:hover { color:white; }

/* ===== SYNC PANEL ===== */
.sync-panel { background:var(--surface-card); border-radius:var(--radius-lg); padding:32px; margin-bottom:48px; border:none; }
.sync-panel-header { display:flex; justify-content:space-between; align-items:center; }
.sync-pulse { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--accent-teal); }
.pulse-dot { width:8px; height:8px; border-radius:50%; background:var(--accent-teal); animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.sync-detail-list { margin-top:16px; display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto; }
.sync-detail-item { display:flex; align-items:center; gap:12px; font-size:14px; padding:8px 0; border-bottom:1px solid var(--hairline-soft); }
.sync-badge { padding:2px 8px; border-radius:var(--radius-pill); font-size:11px; font-weight:600; letter-spacing:1px; }
.badge-new { background:var(--primary); color:white; }
.badge-exist { background:var(--surface-cream-strong); color:var(--muted); }
.sync-model-name { font-weight:500; color:var(--ink); }
.sync-model-id { font-family:var(--font-mono); font-size:13px; color:var(--muted); }
.sync-model-type { color:var(--muted-soft); font-size:12px; margin-left:auto; text-transform:uppercase; letter-spacing:0.5px; }

/* ===== SECTION BLOCKS ===== */
.section-block { margin-bottom:96px; }
.section-head { margin-bottom:32px; }
.section-title { font-family:var(--font-serif); font-size:36px; font-weight:400; letter-spacing:-0.5px; color:var(--ink); margin:0 0 12px 0; }
.section-desc { font-size:16px; color:var(--muted); margin:0; line-height:1.55; }
.section-title-sm { margin:0; font-size:22px; font-family:var(--font-serif); font-weight:400; color:var(--ink); letter-spacing:-0.5px; }

/* ===== GATEWAY GRID (INFRASTRUCTURE) ===== */
.gateway-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:start; }

/* ===== LIGHT CARD (GATEWAY) ===== */
.card-light { background:var(--surface-card); border-radius:var(--radius-lg); padding:32px; color:var(--ink); border:1px solid var(--hairline); }
.card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; }
.card-label { margin:0; font-size:18px; font-weight:500; font-family:var(--font-inter); color:var(--ink); }
.card-inner { display:flex; flex-direction:column; gap:16px; }

.gateway-meta { display:flex; justify-content:space-between; gap:16px; margin-top:8px; font-size:12px; color:var(--muted); font-family:var(--font-mono); }
.cell-mono-light { color:var(--accent-teal); }

/* ===== CONNECTOR TILES (CHANNELS) ===== */
.channel-tiles-wrapper { padding-top:4px; }
.card-top-transparent { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
.channel-count { font-size:14px; color:var(--muted); font-weight:500; }
.connector-tiles-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; max-height:380px; overflow-y:auto; padding-right:8px; padding-bottom:8px; }
.connector-tile { background:var(--surface-card); border:none; border-radius:var(--radius-lg); padding:20px; display:flex; flex-direction:column; gap:16px; transition:transform 0.2s, box-shadow 0.2s; }
.connector-tile:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(20,20,19,0.06); }
.tile-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.tile-title { font-size:16px; font-weight:500; color:var(--ink); line-height:1.4; word-break:break-all; }
.tile-meta { display:flex; align-items:center; gap:8px; margin-top:auto; }

/* ===== SWITCH ===== */
.switch-wrap { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; cursor:pointer; }
.switch-input { position:absolute; opacity:0; width:0; height:0; }
.switch-track { position:absolute; inset:0; background:var(--hairline); border-radius:24px; transition:background 0.25s; }
.switch-track::before { content:''; position:absolute; height:20px; width:20px; left:2px; bottom:2px; background:white; border-radius:50%; transition:transform 0.25s; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
.switch-input:checked + .switch-track { background:var(--primary); }
.switch-input:checked + .switch-track::before { transform:translateX(20px); }

.switch-track-coral { background:rgba(0,0,0,0.2); }
.switch-input-coral:checked + .switch-track-coral { background:white; }
.switch-input-coral:checked + .switch-track-coral::before { background:var(--primary); box-shadow:none; }

.switch-lg { width:52px; height:28px; }
.switch-track-lg { border-radius:28px; }
.switch-track-lg::before { height:24px; width:24px; }
.switch-input:checked + .switch-track-lg::before { transform:translateX(24px); }

/* ===== FIELDS ===== */
.field { display:flex; flex-direction:column; gap:8px; }
.field-label { font-size:13px; font-weight:500; color:var(--body-strong); }
.field-label-coral { font-size:14px; font-weight:500; color:rgba(255,255,255,0.9); }
.field-label-row { display:flex; justify-content:space-between; align-items:flex-end; }
.field-input { width:100%; height:40px; padding:0 14px; border:1px solid var(--hairline); border-radius:var(--radius-md); background:white; font-size:14px; color:var(--ink); font-family:var(--font-inter); transition:border-color 0.15s, box-shadow 0.15s; }
.field-input:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(204,120,92,0.15); }

.field-input-coral { width:100%; height:40px; padding:0 14px; border:1px solid rgba(255,255,255,0.3); border-radius:var(--radius-md); background:rgba(255,255,255,0.1); font-size:14px; color:white; font-family:var(--font-inter); transition:border-color 0.15s; }
.field-input-coral:focus { outline:none; border-color:white; }
.field-input-coral option { color:var(--ink); background:white; }

.field-textarea-coral { width:100%; padding:14px; border:1px solid rgba(255,255,255,0.3); border-radius:var(--radius-md); background:rgba(255,255,255,0.1); color:white; font-size:14px; font-family:var(--font-mono); resize:vertical; line-height:1.6; transition:border-color 0.15s; }
.field-textarea-coral:focus { outline:none; border-color:white; }

/* ===== CHANNELS ===== */
.channel-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.status-ok { background:var(--success); box-shadow:0 0 0 2px rgba(93,184,114,0.2); }
.status-off { background:var(--muted-soft); }
.status-err { background:var(--error); }
.channel-type-tag { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; padding:2px 8px; background:var(--canvas); border-radius:var(--radius-xs); color:var(--muted); border:1px solid var(--hairline); }
.channel-latency { font-size:12px; color:var(--accent-teal); font-family:var(--font-mono); font-weight:500; }
.empty-hint { color:var(--muted); font-size:15px; padding:32px 0; line-height:1.6; }

/* ===== MODEL TABLE (DIRECTORY) ===== */
.table-group { margin-bottom:48px; }
.table-group-title { font-family:var(--font-inter); font-size:16px; font-weight:500; color:var(--ink); margin:0 0 16px 0; display:flex; align-items:center; gap:12px; }
.count-muted { color:var(--muted-soft); font-weight:400; font-size:14px; }
.badge-coral, .badge-teal { display:inline-block; padding:4px 12px; border-radius:var(--radius-pill); font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
.badge-coral { background:var(--primary); color:white; }
.badge-teal { background:var(--accent-teal); color:white; }
.badge-pill { display:inline-block; padding:4px 12px; border-radius:var(--radius-pill); font-size:12px; font-weight:500; }
.badge-coral-light { background:rgba(204,120,92,0.12); color:var(--primary-active); }

.table-card { background:transparent; border:none; border-radius:0; overflow:visible; }
.model-table { width:100%; border-collapse:collapse; }
.model-table th { padding:0 20px 16px 20px; text-align:left; font-size:12px; font-weight:600; color:var(--muted); letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid var(--hairline); background:transparent; }
.model-table td { padding:24px 20px; border-bottom:1px solid var(--hairline-soft); vertical-align:top; font-size:14px; transition:background 0.15s; }
.model-table tbody tr:hover td { background:rgba(230, 223, 216, 0.2); }
.model-table tbody tr:last-child td { border-bottom:none; }
.row-disabled { opacity:0.4; }

/* ===== TABLE CELLS ===== */
.toggle-btn { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border:1px solid var(--hairline); border-radius:var(--radius-pill); background:transparent; cursor:pointer; font-size:11px; font-weight:600; letter-spacing:0.5px; }
.toggle-btn.on { color:var(--ink); }
.toggle-btn.off { color:var(--muted); }
.toggle-dot { width:6px; height:6px; border-radius:50%; }
.dot-on { background:var(--success); }
.dot-off { background:var(--warning); }
.cell-name { display:flex; flex-direction:column; gap:4px; }
.cell-name strong { font-size:15px; font-weight:500; }
.cell-desc { font-size:13px; color:var(--muted); line-height:1.4; }
.cell-mono { font-family:var(--font-mono); font-size:13px; color:var(--muted); }
.cell-sizes { font-size:14px; color:var(--muted); }
.cell-actions { display:flex; justify-content:flex-end; gap:8px; }
.act-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border:1px solid var(--hairline); border-radius:var(--radius-sm); background:transparent; cursor:pointer; color:var(--muted); transition:all 0.15s; }
.act-btn:hover { color:var(--ink); background:var(--surface-card); }
.act-danger { color:var(--error); }
.act-danger:hover { color:var(--error); background:rgba(198,69,69,0.06); border-color:transparent; }

/* ===== EMPTY CARD ===== */
.empty-card { padding:64px; border:1px dashed var(--hairline); border-radius:var(--radius-lg); text-align:center; color:var(--muted); }
.empty-card h3 { font-family:var(--font-serif); font-size:24px; margin:16px 0 8px; color:var(--ink); font-weight:400; }
.empty-card svg { color:var(--muted-soft); }

/* ===== SECTION 4: AI TUTOR ===== */
.tutor-section { margin-bottom:96px; }
.tutor-card { position:relative; overflow:hidden; }
.tutor-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--primary); }
.tutor-form { transition:opacity 0.2s; }
.form-disabled { opacity:0.5; pointer-events:none; }
.btn-text-link { background:transparent; border:none; color:var(--primary); cursor:pointer; font-size:13px; font-weight:500; font-family:var(--font-inter); padding:0; }
.btn-text-link:hover { text-decoration:underline; }
.card-actions { display:flex; align-items:center; justify-content:flex-end; gap:16px; margin-top:24px; }

/* ===== MODAL ===== */
.modal-backdrop { position:fixed; inset:0; background:rgba(20,20,19,0.45); display:flex; align-items:center; justify-content:center; padding:24px; z-index:100; backdrop-filter:blur(2px); }
.modal-panel { width:min(720px,100%); background:var(--canvas); border-radius:var(--radius-xl); border:1px solid var(--hairline); padding:40px; box-shadow:0 24px 48px rgba(20,20,19,0.1); }
.modal-title { font-family:var(--font-serif); font-size:32px; font-weight:400; letter-spacing:-0.5px; margin:0 0 32px 0; color:var(--ink); }
.modal-form { display:flex; flex-direction:column; gap:16px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.modal-actions { display:flex; justify-content:flex-end; gap:12px; margin-top:16px; }

/* ===== MESSAGES ===== */
.msg-success { color:var(--success); font-size:13px; font-weight:500; }
.msg-success-coral { color:white; font-size:14px; font-weight:500; }
.msg-error { color:var(--error); font-size:13px; font-weight:500; }
.msg-error-coral { color:#ffd0d0; font-size:14px; font-weight:500; }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .hero-band { flex-direction:column; align-items:flex-start; gap:32px; padding:64px 0; }
  .hero-title { font-size:40px; }
  .gateway-grid { grid-template-columns:1fr; }
  .form-row, .coral-form-grid { grid-template-columns:1fr; }
  .hero-actions-col { width:100%; }
}
</style>
