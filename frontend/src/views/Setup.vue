<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentStep = ref(1)
const loading = ref(false)
const error = ref('')

// Step 1: Teacher account
const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')

// Step 2: API config
const apiBaseUrl = ref('https://ai-generating.com')
const apiKey = ref('')

// Step 3: Model selection
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
  { name: 'GPT-4o', modelId: 'gpt-4o', type: 'TEXT_GENERATION', provider: 'openai', description: '多模态分析与导师对话', selected: true },
  { name: 'Claude Sonnet 4.6', modelId: 'claude-sonnet-4-6', type: 'TEXT_GENERATION', provider: 'anthropic', description: '长文本分析与教学反馈', selected: false },
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
    case 'BOTH': return '图像生成/编辑'
    case 'TEXT_GENERATION': return '文本'
    default: return type
  }
}
</script>

<template>
  <div class="min-h-screen flex w-full bg-canvas overflow-hidden">
    <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-28 relative z-10">
      <div class="w-full max-w-lg mx-auto">
        <!-- Logo -->
        <div class="absolute top-12 left-8 sm:left-16 lg:left-20 font-display text-2xl font-medium tracking-tight text-ink flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-ink">
            <path d="M12 2L12 22M2 12L22 12M5 5L19 19M5 19L19 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          晋彩智绘
        </div>

        <!-- Step Indicator -->
        <div class="flex items-center gap-3 mb-10">
          <div v-for="step in 3" :key="step" class="flex items-center gap-3">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                currentStep >= step ? 'bg-primary text-on-primary' : 'bg-hairline text-muted'
              ]"
            >{{ step }}</div>
            <div v-if="step < 3" :class="['w-8 h-px', currentStep > step ? 'bg-primary' : 'bg-hairline']"></div>
          </div>
        </div>

        <!-- Step Content -->
        <div v-if="error" class="bg-error/10 text-error p-3 rounded-md text-sm font-medium mb-6">
          {{ error }}
        </div>

        <!-- Step 1: Create Teacher Account -->
        <div v-if="currentStep === 1">
          <h1 class="font-display-force text-3xl font-medium text-ink mb-2">创建教师账号</h1>
          <p class="text-muted text-body-md mb-8">设置您的管理员账号，用于登录和管理平台。</p>

          <div class="space-y-6">
            <div class="group relative">
              <input v-model="username" type="text" required id="setup-username"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="用户名" />
              <label for="setup-username" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                用户名
              </label>
            </div>

            <div class="group relative">
              <input v-model="displayName" type="text" required id="setup-displayname"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="显示名称" />
              <label for="setup-displayname" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                显示名称
              </label>
            </div>

            <div class="group relative">
              <input v-model="password" type="password" required id="setup-password"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="密码" />
              <label for="setup-password" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                密码（至少 6 位）
              </label>
            </div>

            <div class="group relative">
              <input v-model="confirmPassword" type="password" required id="setup-confirm"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="确认密码" />
              <label for="setup-confirm" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                确认密码
              </label>
            </div>
          </div>
        </div>

        <!-- Step 2: API Configuration -->
        <div v-if="currentStep === 2">
          <h1 class="font-display-force text-3xl font-medium text-ink mb-2">配置 AI 接口</h1>
          <p class="text-muted text-body-md mb-8">连接 OpenAI 兼容的 API 网关平台，用于图像生成和文本分析。</p>

          <div class="space-y-6">
            <div class="group relative">
              <input v-model="apiBaseUrl" type="url" required id="setup-url"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="API Base URL" />
              <label for="setup-url" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                API Base URL
              </label>
            </div>

            <div class="group relative">
              <input v-model="apiKey" type="password" required id="setup-key"
                class="peer w-full bg-transparent text-ink border-b border-hairline py-3 px-0 focus:outline-none focus:border-primary transition-colors text-body-md placeholder-transparent"
                placeholder="API Key" />
              <label for="setup-key" class="absolute left-0 top-3 text-muted text-body-md transition-all peer-placeholder-shown:text-body-md peer-placeholder-shown:top-3 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-primary peer-valid:-top-4 peer-valid:text-xs">
                API Key
              </label>
            </div>

            <p class="text-xs text-muted mt-4">平台通过此接口调用 AI 模型，支持所有 OpenAI 兼容格式的网关。设置后可在「模型与配置」页面修改。</p>
          </div>
        </div>

        <!-- Step 3: Model Selection -->
        <div v-if="currentStep === 3">
          <h1 class="font-display-force text-3xl font-medium text-ink mb-2">选择模型</h1>
          <p class="text-muted text-body-md mb-6">选择要启用的 AI 模型，之后可在管理面板中随时调整。</p>

          <div class="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-2">
            <label
              v-for="model in presetModels" :key="model.modelId"
              :class="[
                'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                model.selected ? 'border-primary bg-primary/5' : 'border-hairline hover:border-muted'
              ]"
            >
              <input type="checkbox" v-model="model.selected" class="mt-1 accent-[var(--color-primary)]" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-ink text-sm">{{ model.name }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-hairline text-muted">{{ typeLabel(model.type) }}</span>
                </div>
                <p class="text-xs text-muted mt-1">{{ model.description }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between mt-10">
          <button
            v-if="currentStep > 1"
            @click="prevStep"
            class="text-muted hover:text-ink text-sm font-medium transition-colors"
          >
            上一步
          </button>
          <div v-else></div>

          <button
            v-if="currentStep < 3"
            @click="nextStep"
            class="bg-primary hover:bg-primary-active text-on-primary font-medium rounded-md h-[44px] px-8 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-[1px]"
          >
            下一步
          </button>
          <button
            v-else
            @click="handleSubmit"
            :disabled="loading"
            class="bg-primary hover:bg-primary-active text-on-primary font-medium rounded-md h-[44px] px-8 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {{ loading ? '正在设置...' : '完成设置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Right Side -->
    <div class="hidden lg:flex lg:w-1/2 relative bg-[#181715] items-center justify-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2000&auto=format&fit=crop"
        class="absolute inset-0 w-full h-full object-cover"
        alt="Art Background"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-[#181715]/90 via-[#181715]/40 to-transparent z-10"></div>
      <div class="absolute bottom-24 z-20 text-center max-w-lg px-12">
        <h2 class="font-display-force text-4xl text-white mb-4 leading-relaxed font-medium tracking-wide">
          "每一位艺术家最初都是业余爱好者。"
        </h2>
        <p class="text-white/60 text-body-md font-body tracking-widest mt-6">拉尔夫·沃尔多·爱默生</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-display-force {
  font-family: 'Noto Serif SC', 'Songti SC', 'STSong', serif !important;
}
</style>
