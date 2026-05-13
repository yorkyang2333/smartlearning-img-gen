<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

type ModelRecord = {
  id: string
  name: string
  modelId: string
  type: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'BOTH' | 'TEXT_GENERATION'
  provider: string
  description?: string
  config?: string
  isActive?: boolean
  sortOrder?: number
}

const models = ref<ModelRecord[]>([])
const modelsLoading = ref(true)
const isSyncing = ref(false)
const syncMessage = ref('')
const gatewayFormData = ref({
  enabled: true,
  baseUrl: 'http://localhost:4000',
  apiKey: ''
})
const gatewayResolvedBaseUrl = ref('http://localhost:4000')
const gatewayUpdatedAt = ref('')
const isSavingGateway = ref(false)
const gatewayMessage = ref('')

const isModelModalOpen = ref(false)
const editingModel = ref<ModelRecord | null>(null)
const modelFormData = ref({
  name: '',
  modelId: '',
  type: 'TEXT_TO_IMAGE',
  provider: 'openai',
  description: '',
  config: '{"sizes":["1024x1024"]}'
})

const tutorFormData = ref({
  enabled: true,
  modelName: '',
  systemPrompt: ''
})
const isSavingTutor = ref(false)
const tutorMessage = ref('')
const isTutorExpanded = ref(false)

const fetchModels = async () => {
  modelsLoading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/models', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      models.value = await res.json()
    }
  } finally {
    modelsLoading.value = false
  }
}

const fetchGatewayConfig = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/gateway-config', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (!res.ok) return
    const data = await res.json()
    gatewayFormData.value = {
      enabled: data.enabled ?? true,
      baseUrl: data.baseUrl || 'http://localhost:4000',
      apiKey: data.apiKey || ''
    }
    gatewayResolvedBaseUrl.value = data.resolvedBaseUrl || gatewayFormData.value.baseUrl
    gatewayUpdatedAt.value = data.updatedAt || ''
  } catch (e) {}
}

const fetchTutorConfig = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/config', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (!res.ok) return
    const data = await res.json()
    tutorFormData.value = {
      enabled: data.enabled,
      modelName: data.modelName || '',
      systemPrompt: data.systemPrompt || ''
    }
  } catch (e) {}
}

const tutorModels = computed(() => {
  return models.value.filter(model => model.type === 'TEXT_GENERATION' || model.type === 'BOTH')
})

const tutorModelOptions = computed(() => {
  const options = [...tutorModels.value]
  if (tutorFormData.value.modelName && !options.find(model => model.modelId === tutorFormData.value.modelName)) {
    options.unshift({
      id: 'custom-current',
      name: `${tutorFormData.value.modelName} (当前配置)`,
      modelId: tutorFormData.value.modelName,
      type: 'TEXT_GENERATION',
      provider: 'custom'
    })
  }
  return options
})

const parseSizes = (config?: string) => {
  if (!config) return []
  try {
    const parsed = JSON.parse(config)
    return Array.isArray(parsed?.sizes) ? parsed.sizes : []
  } catch {
    return []
  }
}

const sizeSummary = (model: ModelRecord) => {
  const sizes = parseSizes(model.config)
  if (sizes.length === 0) return '由网关自动处理'
  if (sizes.length <= 3) return sizes.join(' / ')
  return `${sizes.slice(0, 3).join(' / ')} 等 ${sizes.length} 种`
}

const typeLabel = (type: ModelRecord['type']) => {
  if (type === 'TEXT_TO_IMAGE') return '文生图'
  if (type === 'IMAGE_TO_IMAGE') return '图生图'
  if (type === 'BOTH') return '生图+编辑'
  return '文本分析'
}

const providerLabel = (provider?: string) => {
  if (!provider) return '其它'
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    deepseek: 'DeepSeek',
    alibaba: 'Alibaba',
    meta: 'Meta',
    other: '其它'
  }
  return labels[provider] || provider
}

const handleModelToggle = async (model: ModelRecord, currentEnabled: boolean) => {
  const previous = model.isActive
  model.isActive = !currentEnabled

  try {
    const res = await fetch(`http://localhost:8080/api/teacher/models/${model.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        ...model,
        isActive: model.isActive
      })
    })

    if (!res.ok) throw new Error('Update failed')
  } catch (err) {
    model.isActive = previous
    alert('状态更新失败，请重试')
  }
}

const handleModelDelete = async (id: string) => {
  if (!confirm('确定要删除这个模型吗？')) return
  try {
    await fetch(`http://localhost:8080/api/teacher/models/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    fetchModels()
  } catch (e) {}
}

const openModelModal = (model?: ModelRecord) => {
  if (model) {
    editingModel.value = model
    modelFormData.value = {
      name: model.name || '',
      modelId: model.modelId || '',
      type: model.type || 'TEXT_TO_IMAGE',
      provider: model.provider || 'openai',
      description: model.description || '',
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
      config: '{"sizes":["1024x1024"]}'
    }
  }
  isModelModalOpen.value = true
}

const handleModelSubmit = async (e: Event) => {
  e.preventDefault()
  const isEditing = !!editingModel.value
  const url = isEditing ? `http://localhost:8080/api/teacher/models/${editingModel.value!.id}` : 'http://localhost:8080/api/teacher/models'
  const method = isEditing ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        ...modelFormData.value,
        isActive: editingModel.value?.isActive ?? true,
        sortOrder: editingModel.value?.sortOrder ?? models.value.length
      })
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

const safeJson = async (res: Response) => {
  const text = await res.text()
  if (!text || text.trim().length === 0) return null
  try { return JSON.parse(text) } catch { return null }
}

const handleSyncModels = async () => {
  isSyncing.value = true
  syncMessage.value = ''
  try {
    const res = await fetch('http://localhost:8080/api/teacher/models/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    const data = await safeJson(res)
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `同步失败 (HTTP ${res.status})`)
    }
    syncMessage.value = `同步完成：新增 ${data.created || 0} 个，更新 ${data.updated || 0} 个，共扫描 ${data.totalSynced || 0} 个模型`
    await fetchModels()
  } catch (err: any) {
    syncMessage.value = `同步失败：${err.message}`
  } finally {
    isSyncing.value = false
  }
}

const handleGatewaySubmit = async (e: Event) => {
  e.preventDefault()
  isSavingGateway.value = true
  gatewayMessage.value = ''
  try {
    const res = await fetch('http://localhost:8080/api/teacher/gateway-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify(gatewayFormData.value)
    })
    const data = await safeJson(res)
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || `保存失败 (HTTP ${res.status})`)
    }
    if (data) {
      gatewayResolvedBaseUrl.value = data.resolvedBaseUrl || gatewayFormData.value.baseUrl
      gatewayUpdatedAt.value = data.updatedAt || ''
    }
    gatewayMessage.value = 'AI Gateway 配置保存成功'
  } catch (err: any) {
    gatewayMessage.value = `AI Gateway 配置保存失败：${err.message}`
  } finally {
    isSavingGateway.value = false
    setTimeout(() => (gatewayMessage.value = ''), 3000)
  }
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
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify(tutorFormData.value)
    })
    tutorMessage.value = res.ok ? '设置保存成功' : '设置保存失败'
  } catch (err) {
    tutorMessage.value = '发生错误'
  } finally {
    isSavingTutor.value = false
    setTimeout(() => (tutorMessage.value = ''), 3000)
  }
}

onMounted(async () => {
  await fetchGatewayConfig()
  await fetchModels()
  await fetchTutorConfig()
})
</script>

<template>
  <div v-if="modelsLoading" class="loading-state">加载模型目录中...</div>

  <div v-else class="editorial-container">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">模型目录</h1>
        <p class="editorial-subtitle">应用现在通过 AI Gateway 网关统一接入模型，这里只保留模型目录与教学配置。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-button" @click="handleSyncModels" :disabled="isSyncing">
          {{ isSyncing ? '同步中...' : '同步 AI Gateway 模型' }}
        </button>
        <button class="primary-button" @click="openModelModal()">
          手动添加模型
        </button>
      </div>
    </div>

    <div class="gateway-banner">
      <div>
        <strong>AI Gateway 网关模式已启用</strong>
        <p>上游渠道、密钥和路由策略由 AI Gateway 管理。应用侧仅维护可见模型目录、启停、排序和教学用途。</p>
      </div>
      <span v-if="syncMessage" :class="syncMessage.includes('失败') ? 'error-text' : 'success-text'">
        {{ syncMessage }}
      </span>
    </div>

    <section class="config-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">AI Gateway 网关管理</h2>
          <p class="section-desc">在平台内维护 AI Gateway 的开关、网关地址和访问凭证。未填写时会使用后端环境变量作为默认值。</p>
        </div>
      </div>

      <form class="editorial-card gateway-config-card" @submit="handleGatewaySubmit">
        <div class="card-header switch-header">
          <h3 class="card-title">启用 AI Gateway 网关</h3>
          <label class="switch-container">
            <input v-model="gatewayFormData.enabled" type="checkbox" style="display: none;" />
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="card-body">
          <div class="input-row">
            <div class="input-group">
              <label>Base URL</label>
              <input type="url" class="editorial-input" v-model="gatewayFormData.baseUrl" placeholder="http://localhost:4000" />
            </div>
            <div class="input-group">
              <label>API Key</label>
              <input type="password" class="editorial-input" v-model="gatewayFormData.apiKey" placeholder="留空表示网关无需鉴权" />
            </div>
          </div>
          <div class="gateway-meta">
            <span>当前生效地址：{{ gatewayResolvedBaseUrl }}</span>
            <span v-if="gatewayUpdatedAt">最近更新：{{ new Date(gatewayUpdatedAt).toLocaleString() }}</span>
          </div>
          <div class="form-actions">
            <span v-if="gatewayMessage" :class="gatewayMessage.includes('失败') ? 'error-text' : 'success-text'">
              {{ gatewayMessage }}
            </span>
            <button type="submit" class="primary-button" :disabled="isSavingGateway">
              {{ isSavingGateway ? '保存中...' : '保存 AI Gateway 配置' }}
            </button>
          </div>
        </div>
      </form>
    </section>

    <section class="config-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">全局模型目录</h2>
          <p class="section-desc">学生端只会看到非纯文本模型；AI 学伴会从支持文本分析的模型中选用。</p>
        </div>
      </div>

      <div v-if="models.length === 0" class="empty-state">
        <h3>暂无模型</h3>
        <p>先从 AI Gateway 同步模型，或手动录入一批模型目录。</p>
      </div>

      <div v-else class="config-table-container">
        <table class="config-table">
          <thead>
            <tr>
              <th width="100">状态</th>
              <th>展示名称</th>
              <th>模型 ID</th>
              <th>类型</th>
              <th>提供方</th>
              <th>尺寸/能力</th>
              <th width="100" style="text-align: right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in models" :key="model.id" :class="{ 'disabled-row': !model.isActive }">
              <td>
                <button
                  class="status-toggle-btn"
                  :class="model.isActive ? 'active' : 'inactive'"
                  @click="handleModelToggle(model, !!model.isActive)"
                >
                  <span class="dot" :class="model.isActive ? 'dot-active' : 'dot-inactive'"></span>
                  {{ model.isActive ? '已开放' : '已停用' }}
                </button>
              </td>
              <td>
                <div class="name-content">
                  <strong>{{ model.name }}</strong>
                  <span v-if="model.description" class="description-text">{{ model.description }}</span>
                </div>
              </td>
              <td class="td-id"><span class="mono-text">{{ model.modelId }}</span></td>
              <td>{{ typeLabel(model.type) }}</td>
              <td>{{ providerLabel(model.provider) }}</td>
              <td>{{ sizeSummary(model) }}</td>
              <td>
                <div class="table-actions">
                  <button class="icon-btn" @click="openModelModal(model)" title="编辑模型">编</button>
                  <button class="icon-btn danger" @click="handleModelDelete(model.id)" title="删除模型">删</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="config-section">
      <div class="section-header cursor-pointer" @click="isTutorExpanded = !isTutorExpanded">
        <div>
          <h2 class="section-title">AI 学伴分析配置</h2>
          <p class="section-desc">分析模型也走 AI Gateway 网关，但选项来源于模型目录中的文本/多模态模型。</p>
        </div>
        <div class="tutor-status" :class="tutorFormData.enabled ? 'active' : 'inactive'">
          {{ tutorFormData.enabled ? '运行中' : '已关闭' }}
        </div>
      </div>

      <div v-show="isTutorExpanded" class="tutor-config-area">
        <form @submit="handleTutorSubmit">
          <div class="editorial-card tutor-card">
            <div class="card-header switch-header">
              <h3 class="card-title">启用 AI 导师点评</h3>
              <label class="switch-container">
                <input v-model="tutorFormData.enabled" type="checkbox" style="display: none;" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="card-body" :class="{ 'disabled-area': !tutorFormData.enabled }">
              <div class="input-row">
                <div class="input-group">
                  <label>分析模型</label>
                  <select class="editorial-input" v-model="tutorFormData.modelName">
                    <option value="">-- 选择模型目录中的文本/多模态模型 --</option>
                    <option v-for="model in tutorModelOptions" :key="model.modelId" :value="model.modelId">
                      {{ model.name }} ({{ model.modelId }})
                    </option>
                  </select>
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
                  placeholder="留空则使用默认提示词。"
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

    <div v-if="isModelModalOpen" class="overlay-backdrop">
      <div class="overlay-panel">
        <h2 class="overlay-title">{{ editingModel ? '编辑模型' : '手动添加模型' }}</h2>
        <form @submit="handleModelSubmit" class="overlay-form">
          <div class="input-row">
            <div class="input-group">
              <label>展示名称</label>
              <input type="text" class="editorial-input" required v-model="modelFormData.name" placeholder="如: GPT Image 2" />
            </div>
            <div class="input-group">
              <label>AI Gateway 模型 ID</label>
              <input type="text" class="editorial-input" required v-model="modelFormData.modelId" placeholder="如: gpt-image-1 或 openai/gpt-4o-mini" />
            </div>
          </div>
          <div class="input-row">
            <div class="input-group">
              <label>支持类型</label>
              <select class="editorial-input" v-model="modelFormData.type">
                <option value="TEXT_TO_IMAGE">文生图</option>
                <option value="BOTH">生图+编辑</option>
                <option value="IMAGE_TO_IMAGE">图生图</option>
                <option value="TEXT_GENERATION">文本分析</option>
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
                <option value="meta">Meta</option>
                <option value="other">其它</option>
              </select>
            </div>
          </div>
          <div class="input-group">
            <label>功能描述</label>
            <input type="text" class="editorial-input" v-model="modelFormData.description" placeholder="一句话介绍这个模型的特点..." />
          </div>
          <div class="input-group">
            <label>模型配置 JSON</label>
            <textarea class="editorial-input mono-text" rows="4" v-model="modelFormData.config"></textarea>
          </div>
          <div class="overlay-actions">
            <button type="button" class="ghost-button" @click="isModelModalOpen = false">取消</button>
            <button type="submit" class="primary-button">{{ editingModel ? '保存更改' : '确认添加' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--muted);
}

.editorial-container {
  max-width: 1080px;
  margin: 0 auto;
  padding-bottom: 64px;
}

.page-header {
  margin-bottom: 28px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.editorial-title {
  font-family: var(--font-serif);
  font-size: 28px;
  color: var(--ink);
  margin: 0 0 8px 0;
}

.editorial-subtitle,
.section-desc,
.description-text {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.gateway-banner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  margin-bottom: 32px;
}

.gateway-config-card {
  overflow: hidden;
}

.gateway-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--muted);
}

.gateway-banner p {
  margin: 6px 0 0;
}

.config-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header.cursor-pointer {
  cursor: pointer;
}

.section-title {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--ink);
}

.empty-state {
  padding: 36px;
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--muted);
}

.config-table-container,
.editorial-card {
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
}

.config-table {
  width: 100%;
  border-collapse: collapse;
}

.config-table th,
.config-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
  text-align: left;
}

.config-table tbody tr:last-child td {
  border-bottom: none;
}

.disabled-row {
  opacity: 0.6;
}

.status-toggle-btn,
.primary-button,
.ghost-button,
.icon-btn {
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: white;
  cursor: pointer;
}

.primary-button,
.ghost-button {
  padding: 10px 16px;
}

.status-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.status-toggle-btn.active {
  color: var(--ink);
}

.status-toggle-btn.inactive {
  color: var(--muted);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-active {
  background: #16a34a;
}

.dot-inactive {
  background: #d97706;
}

.name-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mono-text {
  font-family: var(--font-mono);
  font-size: 12px;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
}

.icon-btn.danger {
  color: var(--error);
}

.tutor-status {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.tutor-status.active {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.tutor-status.inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.tutor-config-area {
  margin-top: 16px;
}

.card-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--hairline);
}

.switch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  margin: 0;
  font-size: 16px;
}

.card-body {
  padding: 20px;
}

.disabled-area {
  opacity: 0.55;
}

.switch-container {
  position: relative;
  display: inline-flex;
}

.switch-slider {
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: var(--hairline);
  position: relative;
}

.switch-slider::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s ease;
}

input:checked + .switch-slider {
  background: var(--primary);
}

input:checked + .switch-slider::after {
  transform: translateX(18px);
}

.input-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editorial-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  background: white;
}

.form-actions,
.overlay-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.success-text {
  color: var(--success);
}

.error-text {
  color: var(--error);
}

.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 19, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
}

.overlay-panel {
  width: min(680px, 100%);
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid var(--hairline);
  padding: 24px;
}

.overlay-title {
  margin: 0 0 16px;
}

.overlay-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 900px) {
  .page-header,
  .gateway-banner,
  .section-header,
  .form-actions,
  .overlay-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions,
  .input-row {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
