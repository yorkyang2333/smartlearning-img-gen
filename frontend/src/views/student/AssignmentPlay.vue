<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssignmentStore } from '../../stores/assignments'

const route = useRoute()
const router = useRouter()
const store = useAssignmentStore()
const assignmentId = route.params.id as string

const isLoading = ref(true)

const isSubmitting = ref(false)
const errorMsg = ref('')
const selectedGeneration = ref<any>(null)
const searchKeyword = ref('')

// --- Countdown timer ---
const remainingSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const isExpired = computed(() => remainingSeconds.value <= 0 && assignment.value?.startedAt != null)

const formattedTime = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const progressPercent = computed(() => {
  if (!assignment.value?.durationMin) return 0
  const totalSec = assignment.value.durationMin * 60
  return Math.max(0, Math.min(100, (remainingSeconds.value / totalSec) * 100))
})

function startTimer() {
  if (!assignment.value?.startedAt || !assignment.value?.durationMin) return
  const startedAt = new Date(assignment.value.startedAt).getTime()
  const durationMs = assignment.value.durationMin * 60 * 1000
  const expiryTime = startedAt + durationMs

  const updateRemaining = () => {
    const diff = Math.floor((expiryTime - Date.now()) / 1000)
    remainingSeconds.value = Math.max(0, diff)
    if (diff <= 0 && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  updateRemaining()
  timerInterval = setInterval(updateRemaining, 1000)
}
// --- End countdown ---

const fetchAssignment = async () => {
  try {
    await store.fetchAssignmentById(assignmentId)
    if (!store.currentAssignment) {
      errorMsg.value = "任务获取失败"
    } else {
      startTimer()
    }
  } catch (e) {
    errorMsg.value = "网络错误"
  } finally {
    isLoading.value = false
  }
}

const fetchGenerations = async () => {
  await store.fetchGenerations(searchKeyword.value || undefined)
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchKeyword, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchGenerations, 300)
})

const assignment = computed(() => store.currentAssignment)

const activeSubmission = computed(() => {
  if (assignment.value?.submissions && assignment.value.submissions.length > 0) {
    return assignment.value.submissions[0]
  }
  return null
})

const selectGeneration = (gen: any) => {
  if (!isExpired.value) {
    selectedGeneration.value = gen
  }
}

const handleSubmit = async () => {
  if (!selectedGeneration.value || isExpired.value) return
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const result = await store.submitWork(assignmentId, selectedGeneration.value.id, selectedGeneration.value.outputImageUrl)
    if (!result.success) throw new Error(result.error || '提交失败')
    await fetchAssignment()
    selectedGeneration.value = null
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchAssignment()
  fetchGenerations()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<!-- PLACEHOLDER_TEMPLATE -->

<template>
  <div class="page-root">
    <!-- Countdown Banner -->
    <div class="countdown-banner" :class="{ expired: isExpired }">
      <div class="countdown-inner">
        <div class="countdown-label">{{ isExpired ? '挑战时间已结束' : '剩余时间' }}</div>
        <div class="countdown-time">{{ formattedTime }}</div>
      </div>
      <div class="countdown-bar">
        <div class="countdown-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div class="hero-band">
      <button class="btn-back" @click="router.push('/student/assignments')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        返回任务列表
      </button>
      <h1 class="hero-title">{{ assignment?.title || '限时挑战' }}</h1>
      <p class="hero-sub">⚡ 限时挑战模式</p>
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
        <div class="info-section" v-if="assignment.referenceImageUrl">
          <label>参考图</label>
          <img :src="assignment.referenceImageUrl" alt="参考图" style="max-width: 100%; border-radius: 8px;" />
        </div>
        <div class="info-section" v-if="assignment.promptHint">
          <label>提示词引导</label>
          <div class="desc-content" style="background: rgba(245,158,11,0.06); padding: 8px 10px; border-radius: 6px; font-size: 13px;">{{ assignment.promptHint }}</div>
        </div>
        <div class="info-section">
          <label>挑战时长</label>
          <div class="meta-val">{{ assignment.durationMin }} 分钟</div>
        </div>
        <div class="info-section">
          <label>提交状态</label>
          <div class="status-badge" :class="activeSubmission ? 'status-submitted' : 'status-pending'">
            {{ activeSubmission ? (activeSubmission.status === 'REVIEWED' ? '已评阅' : '已提交') : (isExpired ? '未提交' : '待提交') }}
          </div>
        </div>
      </div>

      <!-- 右侧：创作与提交区 -->
      <div class="action-panel card-light">
        <template v-if="activeSubmission">
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

        <template v-else-if="isExpired">
          <div class="expired-view">
            <h3 class="panel-title">挑战已结束</h3>
            <p class="expired-msg">很遗憾，挑战时间已到，无法继续提交作品。</p>
          </div>
        </template>

        <template v-else>
          <div class="create-view">
            <h3 class="panel-title">选择作品提交</h3>
            <p class="panel-sub">在倒计时结束前，从你的创作历史中选择一幅作品提交。</p>

            <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

            <!-- 选中预览 -->
            <div v-if="selectedGeneration" class="selected-preview">
              <div class="selected-image-box">
                <img :src="selectedGeneration.outputImageUrl" alt="Selected" class="preview-image" />
              </div>
              <div class="selected-info">
                <p class="selected-prompt">{{ selectedGeneration.prompt }}</p>
                <span class="selected-time">{{ new Date(selectedGeneration.createdAt).toLocaleString() }}</span>
              </div>
              <div class="submit-action-box">
                <button class="btn btn-challenge" @click="handleSubmit" :disabled="isSubmitting">
                  {{ isSubmitting ? '正在提交...' : '确认提交此作品' }}
                </button>
                <button class="btn btn-secondary" @click="selectedGeneration = null" :disabled="isSubmitting">
                  重新选择
                </button>
              </div>
            </div>

            <!-- 历史作品网格 -->
            <div v-else>
              <div class="search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="searchKeyword" type="text" placeholder="搜索提示词..." class="search-input" />
              </div>
              <div class="gallery-grid">
                <div v-if="store.generations.length === 0" class="empty-gallery">
                  <p>{{ searchKeyword ? '没有匹配的作品' : '还没有创作记录' }}</p>
                  <router-link v-if="!searchKeyword" to="/student/generate" class="btn btn-secondary">前往工作区</router-link>
                </div>
                <div
                  v-for="gen in store.generations"
                  :key="gen.id"
                  class="gallery-item"
                  @click="selectGeneration(gen)"
                >
                  <img :src="gen.outputImageUrl" alt="Generation" />
                  <div class="gallery-item-overlay">
                    <span>{{ gen.prompt?.slice(0, 40) }}{{ gen.prompt?.length > 40 ? '...' : '' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<!-- PLACEHOLDER_STYLE -->

<style scoped>
.page-root { max-width: 1100px; margin: 0 auto; padding-bottom: 48px; display: flex; flex-direction: column; height: 100%; }

/* Countdown Banner */
.countdown-banner { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: var(--radius-lg); padding: 20px 28px; margin-bottom: 24px; color: white; }
.countdown-banner.expired { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
.countdown-inner { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.countdown-label { font-size: 14px; font-weight: 500; opacity: 0.9; }
.countdown-time { font-family: var(--font-serif); font-size: 42px; font-weight: 400; letter-spacing: 2px; }
.countdown-bar { height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden; }
.countdown-bar-fill { height: 100%; background: white; border-radius: 3px; transition: width 1s linear; }

.hero-band { padding: 0 0 32px 0; flex-shrink: 0; }
.btn-back { background: none; border: none; color: var(--muted); display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; font-family: var(--font-inter); cursor: pointer; padding: 0; margin-bottom: 16px; transition: color 0.2s; }
.btn-back:hover { color: var(--ink); }
.hero-title { font-family: var(--font-serif); font-size: 42px; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; color: var(--ink); margin: 0 0 8px 0; }
.hero-sub { font-family: var(--font-inter); font-size: 15px; color: var(--accent-amber); font-weight: 500; margin: 0; }

.layout-grid { display: grid; grid-template-columns: 320px 1fr; gap: 32px; align-items: start; }
.card-light { background: var(--surface-card); border-radius: var(--radius-lg); padding: 32px; border: 1px solid var(--hairline); }

.info-panel { display: flex; flex-direction: column; gap: 24px; }
.info-section { display: flex; flex-direction: column; gap: 8px; }
.info-section label { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.desc-content { font-size: 15px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; }
.meta-val { font-size: 14px; font-weight: 500; color: var(--ink); }
.status-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 500; width: fit-content; }
.status-pending { background: rgba(204,120,92,0.1); color: var(--primary); }
.status-submitted { background: rgba(93,184,114,0.1); color: var(--success); }

.action-panel { min-height: 400px; display: flex; flex-direction: column; }
.panel-title { font-family: var(--font-serif); font-size: 28px; margin: 0 0 8px 0; color: var(--ink); }
.panel-sub { font-size: 14px; color: var(--muted); margin: 0 0 24px 0; }

/* Gallery Grid */
.search-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--hairline); border-radius: var(--radius-md); margin-bottom: 12px; background: white; }
.search-input { border: none; outline: none; flex: 1; font-size: 14px; color: var(--ink); background: transparent; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 350px; overflow-y: auto; }
.gallery-item { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.gallery-item:hover { border-color: var(--accent-amber); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.gallery-item-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; font-size: 11px; line-height: 1.3; opacity: 0; transition: opacity 0.2s; }
.gallery-item:hover .gallery-item-overlay { opacity: 1; }
.empty-gallery { grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }

/* Selected Preview */
.selected-preview { display: flex; flex-direction: column; gap: 16px; }
.selected-image-box { border-radius: 12px; overflow: hidden; border: 1px solid var(--hairline); display: flex; justify-content: center; background: white; padding: 8px; }
.preview-image { max-width: 100%; max-height: 400px; border-radius: 8px; }
.selected-info { display: flex; flex-direction: column; gap: 4px; }
.selected-prompt { font-size: 14px; color: var(--ink); margin: 0; line-height: 1.5; }
.selected-time { font-size: 12px; color: var(--muted); }
.submit-action-box { display: flex; align-items: center; gap: 12px; padding: 20px; background: var(--surface-cream-strong); border-radius: 12px; }

.submitted-view { display: flex; flex-direction: column; gap: 24px; }
.result-image-box { border-radius: 12px; overflow: hidden; background: white; padding: 12px; border: 1px solid var(--hairline); display: flex; justify-content: center; }
.result-image { max-width: 100%; max-height: 500px; border-radius: 8px; }

.pending-review-msg { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: rgba(204,120,92,0.05); border: 1px solid rgba(204,120,92,0.2); border-radius: 8px; color: var(--primary-active); font-weight: 500; }

.review-box { background: white; border: 1px solid var(--hairline); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; border-top: 4px solid var(--success); }
.score-row { display: flex; align-items: baseline; gap: 8px; }
.score-label { font-size: 15px; font-weight: 600; color: var(--muted); }
.score-val { font-family: var(--font-serif); font-size: 32px; color: var(--success); }
.feedback-text { font-size: 15px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; padding: 16px; background: var(--surface-soft); border-radius: 8px; }

.expired-view { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; text-align: center; }
.expired-msg { font-size: 15px; color: var(--muted); margin-top: 12px; }

.error-banner { background: rgba(198,69,69,0.1); color: var(--error); padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 44px; border-radius: var(--radius-md); font-weight: 500; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; font-family: var(--font-inter); }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover:not(:disabled) { background: var(--primary-active); }
.btn-challenge { background: #f59e0b; color: white; }
.btn-challenge:hover:not(:disabled) { background: #d97706; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
