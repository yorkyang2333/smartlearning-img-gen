<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const assignmentId = route.params.id as string

const assignment = ref<any>(null)
const isLoading = ref(true)

const prompt = ref('')
const isGenerating = ref(false)
const isSubmitting = ref(false)
const generatedImage = ref<string | null>(null)
const generationId = ref<string | null>(null)
const errorMsg = ref('')

// Load assignment
const fetchAssignment = async () => {
  try {
    const res = await fetch(`http://localhost:8080/api/student/assignments/${assignmentId}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      assignment.value = data.data
    } else {
      errorMsg.value = "任务获取失败"
    }
  } catch (e) {
    errorMsg.value = "网络错误"
  } finally {
    isLoading.value = false
  }
}

// Get models for generation
const models = ref<any[]>([])
const fetchModels = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/student/models', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      models.value = data.data
    }
  } catch (e) {}
}

const activeSubmission = computed(() => {
  if (assignment.value?.submissions && assignment.value.submissions.length > 0) {
    return assignment.value.submissions[0]
  }
  return null
})

const handleGenerate = async () => {
  if (!prompt.value.trim()) return
  isGenerating.value = true
  errorMsg.value = ''
  generatedImage.value = null
  generationId.value = null

  try {
    const defaultModel = models.value.find(m => m.type !== 'IMAGE_TO_IMAGE') || models.value[0]
    
    const res = await fetch('http://localhost:8080/api/generate/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.value,
        modelId: defaultModel?.modelId || '',
        size: '1024x1024',
        n: 1
      })
    })

    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || '生成失败')
    
    generatedImage.value = data.rawUrl
    generationId.value = data.generationId
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    isGenerating.value = false
  }
}

const handleSubmit = async () => {
  if (!generatedImage.value) return
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const res = await fetch(`http://localhost:8080/api/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generationId: generationId.value,
        imageUrl: generatedImage.value
      })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '提交失败')
    
    // Refresh assignment
    await fetchAssignment()
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchAssignment()
  fetchModels()
})
</script>

<template>
  <div class="page-root">
    <div class="hero-band">
      <button class="btn-back" @click="router.push('/student/assignments')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        返回任务列表
      </button>
      <h1 class="hero-title">{{ assignment?.title || '任务详情' }}</h1>
      <p class="hero-sub" v-if="assignment?.type === 'CHALLENGE'">⚡ 限时挑战模式</p>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="pulse-dot"></div>
      正在加载任务...
    </div>

    <div v-else-if="assignment" class="layout-grid">
      <!-- 左侧：任务信息 -->
      <div class="info-panel card-light">
        <div class="info-section">
          <label>任务说明</label>
          <div class="desc-content">{{ assignment.description }}</div>
        </div>
        <div class="info-section" v-if="assignment.deadline">
          <label>截止时间</label>
          <div class="meta-val">{{ new Date(assignment.deadline).toLocaleString() }}</div>
        </div>
        <div class="info-section">
          <label>提交状态</label>
          <div class="status-badge" :class="activeSubmission ? 'status-submitted' : 'status-pending'">
            {{ activeSubmission ? (activeSubmission.status === 'REVIEWED' ? '已评阅' : '已提交') : '待提交' }}
          </div>
        </div>
      </div>

      <!-- 右侧：创作与提交区 -->
      <div class="action-panel card-light">
        <template v-if="activeSubmission">
          <!-- 已提交状态 -->
          <div class="submitted-view">
            <h3 class="panel-title">我的作品</h3>
            <div class="result-image-box">
              <img :src="activeSubmission.imageUrl" alt="My Submission" class="result-image" />
            </div>
            <div v-if="activeSubmission.status === 'REVIEWED'" class="review-box">
              <div class="score-row">
                <span class="score-label">教师评分：</span>
                <span class="score-val">{{ activeSubmission.score }} 分</span>
              </div>
              <div class="feedback-text">{{ activeSubmission.feedback }}</div>
            </div>
            <div v-else class="pending-review-msg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              作品已成功提交，正在等待老师评阅。
            </div>
          </div>
        </template>
        
        <template v-else>
          <!-- 未提交状态：创作区 -->
          <div class="create-view">
            <h3 class="panel-title">完成挑战</h3>
            <p class="panel-sub">在此输入您的提示词，AI 将协助您生成作品并提交。</p>
            
            <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

            <textarea 
              class="prompt-textarea" 
              v-model="prompt" 
              rows="4" 
              placeholder="描述您的画面构思..."
              :disabled="isGenerating || isSubmitting"
            ></textarea>
            
            <div class="gen-actions">
              <button class="btn btn-secondary" @click="handleGenerate" :disabled="isGenerating || !prompt.trim() || isSubmitting">
                {{ isGenerating ? '正在生成...' : '🎨 生成画面' }}
              </button>
            </div>

            <!-- 生成结果预览 -->
            <div class="preview-area" v-if="isGenerating || generatedImage">
              <div v-if="isGenerating" class="generating-overlay">
                 <div class="pulse-dot"></div>
                 <p>AI 画师正在挥洒创意...</p>
              </div>
              <div v-else-if="generatedImage" class="generated-result">
                 <img :src="generatedImage" alt="Generated" class="preview-image" />
                 <div class="submit-action-box">
                   <p>对这幅作品满意吗？</p>
                   <button class="btn btn-primary" @click="handleSubmit" :disabled="isSubmitting">
                     {{ isSubmitting ? '正在提交...' : '✨ 确认提交作品' }}
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-root { max-width: 1100px; margin: 0 auto; padding-bottom: 48px; display: flex; flex-direction: column; height: 100%; }
.hero-band { padding: 0 0 32px 0; flex-shrink: 0; }
.btn-back { background: none; border: none; color: var(--muted); display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; font-family: var(--font-inter); cursor: pointer; padding: 0; margin-bottom: 16px; transition: color 0.2s; }
.btn-back:hover { color: var(--ink); }
.hero-title { font-family: var(--font-serif); font-size: 42px; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; color: var(--ink); margin: 0 0 8px 0; }
.hero-sub { font-family: var(--font-inter); font-size: 15px; color: var(--accent-amber); font-weight: 500; margin: 0; }

.layout-grid { display: grid; grid-template-columns: 320px 1fr; gap: 32px; align-items: start; }
.card-light { background: var(--surface-card); border-radius: var(--radius-lg); padding: 32px; border: 1px solid var(--hairline); }

/* Left Info */
.info-panel { display: flex; flex-direction: column; gap: 24px; }
.info-section { display: flex; flex-direction: column; gap: 8px; }
.info-section label { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.desc-content { font-size: 15px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; }
.meta-val { font-size: 14px; font-weight: 500; color: var(--ink); }
.status-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 500; width: fit-content; }
.status-pending { background: rgba(204,120,92,0.1); color: var(--primary); }
.status-submitted { background: rgba(93,184,114,0.1); color: var(--success); }

/* Right Action */
.action-panel { min-height: 400px; display: flex; flex-direction: column; }
.panel-title { font-family: var(--font-serif); font-size: 28px; margin: 0 0 8px 0; color: var(--ink); }
.panel-sub { font-size: 14px; color: var(--muted); margin: 0 0 24px 0; }

.prompt-textarea { width: 100%; padding: 16px; border: 1px solid var(--hairline); border-radius: var(--radius-md); font-family: var(--font-inter); font-size: 15px; line-height: 1.5; color: var(--ink); background: white; resize: vertical; transition: all 0.2s; outline: none; }
.prompt-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(204,120,92,0.15); }
.prompt-textarea:disabled { background: var(--surface-soft); color: var(--muted); cursor: not-allowed; }

.gen-actions { display: flex; justify-content: flex-end; margin-top: 16px; }

.preview-area { margin-top: 32px; border-top: 1px solid var(--hairline); padding-top: 32px; display: flex; flex-direction: column; align-items: center; }
.generating-overlay { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--muted); padding: 48px 0; }
.pulse-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--primary); animation: pulse 1.5s infinite ease-in-out; }
@keyframes pulse { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.5; } }

.generated-result { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; }
.preview-image { max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.submit-action-box { display: flex; flex-direction: column; align-items: center; gap: 12px; background: var(--surface-cream-strong); padding: 24px; border-radius: 12px; width: 100%; }
.submit-action-box p { margin: 0; font-size: 15px; font-weight: 500; color: var(--ink); }

/* Submitted View */
.submitted-view { display: flex; flex-direction: column; gap: 24px; }
.result-image-box { border-radius: 12px; overflow: hidden; background: white; padding: 12px; border: 1px solid var(--hairline); display: flex; justify-content: center; }
.result-image { max-width: 100%; max-height: 500px; border-radius: 8px; }

.pending-review-msg { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: rgba(204,120,92,0.05); border: 1px solid rgba(204,120,92,0.2); border-radius: 8px; color: var(--primary-active); font-weight: 500; }

.review-box { background: white; border: 1px solid var(--hairline); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; border-top: 4px solid var(--success); }
.score-row { display: flex; align-items: baseline; gap: 8px; }
.score-label { font-size: 15px; font-weight: 600; color: var(--muted); }
.score-val { font-family: var(--font-serif); font-size: 32px; color: var(--success); }
.feedback-text { font-size: 15px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; padding: 16px; background: var(--surface-soft); border-radius: 8px; }

.error-banner { background: rgba(198,69,69,0.1); color: var(--error); padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 44px; border-radius: var(--radius-md); font-weight: 500; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; font-family: var(--font-inter); }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover:not(:disabled) { background: var(--primary-active); }
.btn-secondary { background: white; color: var(--ink); border: 1px solid var(--hairline); }
.btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
