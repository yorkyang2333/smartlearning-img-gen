<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentStep = ref(1)
const loading = ref(false)
const error = ref('')

const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')

const apiBaseUrl = ref('')
const apiKey = ref('')

interface PresetModel {
  name: string
  modelId: string
  type: string
  provider: string
  description: string
  selected: boolean
}

const presetModels = ref<PresetModel[]>([
  { name: 'GPT Image 2', modelId: 'gpt-image-2', type: 'BOTH', provider: 'openai', description: '优质AI图像生成与编辑', selected: true },
  { name: 'DALL-E 3', modelId: 'dall-e-3', type: 'TEXT_TO_IMAGE', provider: 'openai', description: '高质量AI图像生成模型', selected: true },
  { name: 'FLUX Schnell', modelId: 'flux-schnell', type: 'TEXT_TO_IMAGE', provider: 'stability', description: '快速高质量生图', selected: false },
  { name: 'FLUX Dev', modelId: 'flux-dev', type: 'TEXT_TO_IMAGE', provider: 'stability', description: '高质量生图（开发版）', selected: false },
  { name: 'Gemini 3.1 Flash Lite', modelId: 'gemini-3.1-flash-lite', type: 'TEXT_GENERATION', provider: 'google', description: '极速文本分析与导师对话', selected: true },
  { name: 'DeepSeek Chat', modelId: 'deepseek-chat', type: 'TEXT_GENERATION', provider: 'deepseek', description: '高速文本分析与导师对话', selected: false },
  { name: 'DeepSeek Chat', modelId: 'deepseek-chat', type: 'TEXT_GENERATION', provider: 'deepseek', description: '高速文本分析与导师对话', selected: false },
])

const step1Valid = computed(() =>
  username.value.trim().length > 0 &&
  displayName.value.trim().length > 0 &&
  password.value.length >= 6 &&
  password.value === confirmPassword.value
)

const step2Valid = computed(() =>
  apiBaseUrl.value.trim().length > 0 &&
  apiKey.value.trim().length > 0
)

const selectedModels = computed(() => presetModels.value.filter(m => m.selected))

function nextStep() {
  error.value = ''
  if (currentStep.value === 1 && !step1Valid.value) {
    if (password.value.length < 6) {
      error.value = '密码至少需要 6 个字符'
    } else if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
    } else {
      error.value = '请填写所有必填项'
    }
    return
  }
  if (currentStep.value === 2 && !step2Valid.value) {
    error.value = '请填写 API 地址和密钥'
    return
  }
  currentStep.value++
}

function prevStep() {
  error.value = ''
  currentStep.value--
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('http://localhost:8080/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
        displayName: displayName.value.trim(),
        apiBaseUrl: apiBaseUrl.value.trim(),
        apiKey: apiKey.value.trim(),
        models: selectedModels.value.map(m => ({
          name: m.name,
          modelId: m.modelId,
          type: m.type,
          provider: m.provider,
          description: m.description
        }))
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || '设置失败，请稍后重试')
    }
    const data = await res.json()
    authStore.setAuth(data.token, data.user)
    router.push('/teacher/dashboard')
  } catch (e: any) {
    error.value = e.message || '设置失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'TEXT_TO_IMAGE': return '文生图'
    case 'BOTH': return '生成 / 编辑'
    case 'TEXT_GENERATION': return '文本对话'
    default: return type
  }
}
</script>

<template>
  <div class="setup-page">
    <!-- Left: Form Area -->
    <div class="setup-form-area">
      <div class="setup-form-inner">
        <!-- Logo -->
        <div class="setup-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-mark">
            <path d="M12 2L12 22M2 12L22 12M5 5L19 19M5 19L19 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span>晋彩智绘</span>
        </div>

        <!-- Step Indicator -->
        <div class="step-indicator">
          <div v-for="step in 3" :key="step" class="step-item">
            <div :class="['step-dot', { active: currentStep >= step, done: currentStep > step }]">
              <svg v-if="currentStep > step" viewBox="0 0 16 16" fill="none" class="check-icon">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span v-else>{{ step }}</span>
            </div>
            <span :class="['step-label', { active: currentStep >= step }]">
              {{ step === 1 ? '账号' : step === 2 ? '接口' : '模型' }}
            </span>
            <div v-if="step < 3" :class="['step-line', { active: currentStep > step }]"></div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="setup-error">{{ error }}</div>

        <!-- Step 1: Account -->
        <div v-if="currentStep === 1" class="step-content">
          <h1>创建教师账号</h1>
          <p class="step-desc">设置您的管理员账号，用于登录和管理平台。</p>

          <div class="field-group">
            <div class="field">
              <label for="s-user">用户名</label>
              <input v-model="username" type="text" id="s-user" placeholder="输入登录用户名" />
            </div>
            <div class="field">
              <label for="s-name">显示名称</label>
              <input v-model="displayName" type="text" id="s-name" placeholder="如：王老师" />
            </div>
            <div class="field">
              <label for="s-pwd">密码</label>
              <input v-model="password" type="password" id="s-pwd" placeholder="至少 6 位" />
            </div>
            <div class="field">
              <label for="s-pwd2">确认密码</label>
              <input v-model="confirmPassword" type="password" id="s-pwd2" placeholder="再次输入密码" />
            </div>
          </div>
        </div>

        <!-- Step 2: API -->
        <div v-if="currentStep === 2" class="step-content">
          <h1>配置 AI 接口</h1>
          <p class="step-desc">连接 OpenAI 兼容的 API 网关，用于图像生成和文本分析。</p>

          <div class="field-group">
            <div class="field">
              <label for="s-url">API Base URL</label>
              <input v-model="apiBaseUrl" type="url" id="s-url" placeholder="https://your-api-gateway.com" />
            </div>
            <div class="field">
              <label for="s-key">API Key</label>
              <input v-model="apiKey" type="password" id="s-key" placeholder="sk-..." />
            </div>
          </div>
          <p class="field-hint">支持所有 OpenAI 兼容格式的网关平台。设置后可在「模型与配置」页面修改。</p>
        </div>

        <!-- Step 3: Models -->
        <div v-if="currentStep === 3" class="step-content">
          <h1>选择模型</h1>
          <p class="step-desc">选择要启用的 AI 模型，之后可随时在管理面板调整。</p>

          <div class="model-grid">
            <label
              v-for="model in presetModels" :key="model.modelId"
              :class="['model-card', { selected: model.selected }]"
            >
              <div class="model-check">
                <input type="checkbox" v-model="model.selected" />
                <svg v-if="model.selected" viewBox="0 0 16 16" fill="none" class="check-svg">
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="model-info">
                <span class="model-name">{{ model.name }}</span>
                <span class="model-badge">{{ typeLabel(model.type) }}</span>
                <span class="model-provider">{{ model.provider }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="step-actions">
          <button v-if="currentStep > 1" @click="prevStep" class="btn-back">
            <svg viewBox="0 0 16 16" fill="none" class="btn-icon"><path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            上一步
          </button>
          <div v-else></div>

          <button v-if="currentStep < 3" @click="nextStep" class="btn btn-primary">
            下一步
          </button>
          <button v-else @click="handleSubmit" :disabled="loading" class="btn btn-primary">
            {{ loading ? '正在设置...' : '完成设置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Right: Decorative -->
    <div class="setup-deco">
      <img
        src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2000&auto=format&fit=crop"
        class="deco-img"
        alt=""
      />
      <div class="deco-overlay"></div>
      <div class="deco-content">
        <p class="deco-quote">"每一位艺术家最初都是业余爱好者。"</p>
        <p class="deco-author">拉尔夫·沃尔多·爱默生</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: flex;
  background: var(--canvas);
}

.setup-form-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px 48px;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .setup-form-area {
    width: 50%;
    padding: 40px 80px;
  }
}

.setup-form-inner {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

/* Logo */
.setup-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}
.setup-logo span {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.3px;
}
.logo-mark {
  width: 22px;
  height: 22px;
  color: var(--primary);
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 28px;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-inter);
  background: var(--surface-soft);
  color: var(--muted);
  transition: all 0.3s ease;
}
.step-dot.active {
  background: var(--primary);
  color: var(--on-primary);
}
.step-dot.done {
  background: var(--primary);
  color: var(--on-primary);
}
.check-icon {
  width: 14px;
  height: 14px;
}
.step-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-soft);
  transition: color 0.3s;
}
.step-label.active {
  color: var(--ink);
}
.step-line {
  width: 24px;
  height: 2px;
  background: var(--hairline);
  margin: 0 6px;
  border-radius: 1px;
  transition: background 0.3s;
}
.step-line.active {
  background: var(--primary);
}

/* Error */
.setup-error {
  background: color-mix(in srgb, var(--error) 8%, transparent);
  color: var(--error);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
  border: 1px solid color-mix(in srgb, var(--error) 15%, transparent);
}

/* Step Content */
.step-content h1 {
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.step-desc {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 24px;
  line-height: 1.5;
}

/* Fields */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 4px;
  letter-spacing: 0.01em;
}
.field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  background: var(--canvas);
  color: var(--ink);
  font-size: 14px;
  font-family: var(--font-inter);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}
.field input::placeholder {
  color: var(--muted-soft);
}
.field-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted-soft);
  line-height: 1.5;
}

/* Model Grid */
.model-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.model-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--canvas);
}
.model-card:hover {
  border-color: var(--muted-soft);
  background: var(--surface-soft);
}
.model-card.selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, var(--canvas));
}
.model-check {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.model-card.selected .model-check {
  background: var(--primary);
  border-color: var(--primary);
}
.model-check input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.check-svg {
  width: 11px;
  height: 11px;
  color: white;
}
.model-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
}
.model-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-card);
  color: var(--muted);
}
.model-card.selected .model-badge {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary-active);
}
.model-provider {
  font-size: 11px;
  color: var(--muted-soft);
  text-transform: capitalize;
}

/* Actions */
.step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline-soft);
}
.btn-back {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  transition: color 0.2s;
}
.btn-back:hover {
  color: var(--ink);
}
.btn-icon {
  width: 16px;
  height: 16px;
}

/* Decorative Right Panel */
.setup-deco {
  display: none;
  position: relative;
  width: 50%;
  overflow: hidden;
}
@media (min-width: 1024px) {
  .setup-deco {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.deco-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.deco-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(24,23,21,0.88) 0%, rgba(24,23,21,0.35) 50%, transparent 100%);
  z-index: 1;
}
.deco-content {
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  z-index: 2;
  text-align: center;
  padding: 0 48px;
}
.deco-quote {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  color: white;
  line-height: 1.4;
  letter-spacing: -0.3px;
  margin-bottom: 16px;
}
.deco-author {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 1px;
}

/* Autofill override */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--canvas) inset !important;
  -webkit-text-fill-color: var(--ink) !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
