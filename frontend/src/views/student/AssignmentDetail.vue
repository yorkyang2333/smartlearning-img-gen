<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssignmentStore } from '../../stores/assignments'

const route = useRoute()
const router = useRouter()
const store = useAssignmentStore()
const assignmentId = route.params.id as string

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const selectedGeneration = ref<any>(null)
const searchKeyword = ref('')

const fetchAssignment = async () => {
  try {
    await store.fetchAssignmentById(assignmentId)
    if (!store.currentAssignment) {
      errorMsg.value = "任务获取失败"
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
  selectedGeneration.value = gen
}

const handleSubmit = async () => {
  if (!selectedGeneration.value) return
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const result = await store.submitWork(assignmentId, selectedGeneration.value.id, selectedGeneration.value.outputImageUrl)
    if (!result.success) throw new Error(result.error || '提交失败')
    successMsg.value = '作品提交成功！'
    selectedGeneration.value = null
    await fetchAssignment()
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
</script>

<template>
  <div class="page-root">
    <div class="hero-band">
      <button class="btn-back" @click="router.push('/student/assignments')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        返回任务列表
      </button>
      <h1 class="hero-title">{{ assignment?.title || '任务详情' }}</h1>
    </div>

    <div v-if="isLoading" style="padding: 48px; color: var(--muted);">加载中...</div>

    <div v-else-if="assignment" class="layout-grid">
      <!-- 左侧：任务信息 -->
      <div class="info-panel card-light">
        <div class="info-section">
          <label>任务说明</label>
          <div class="desc-content">{{ assignment.description }}</div>
        </div>

        <div class="info-section" v-if="assignment.referenceImageUrl">
          <label>参考图</label>
          <img :src="assignment.referenceImageUrl" alt="参考图" class="ref-image" />
        </div>

        <div class="info-section" v-if="assignment.rubric">
          <label>评分标准</label>
          <div class="desc-content rubric-text">{{ assignment.rubric }}</div>
        </div>

        <div class="info-section" v-if="assignment.promptHint">
          <label>提示词引导</label>
          <div class="hint-box">{{ assignment.promptHint }}</div>
        </div>

        <div class="info-section" v-if="assignment.deadline">
          <label>截止时间</label>
          <div class="meta-val">{{ new Date(assignment.deadline).toLocaleString('zh-CN') }}</div>
        </div>

        <div class="info-section">
          <label>提交状态</label>
          <div class="status-badge" :class="activeSubmission ? 'status-submitted' : 'status-pending'">
            {{ activeSubmission ? (activeSubmission.status === 'REVIEWED' ? '已评阅' : '已提交') : '待提交' }}
          </div>
        </div>
      </div>

      <!-- 右侧 -->
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
            <div v-else class="pending-review-msg">作品已成功提交，正在等待老师评阅。</div>
          </div>
        </template>

        <template v-else>
          <div class="create-view">
            <h3 class="panel-title">选择作品提交</h3>
            <p class="panel-sub">从你的创作历史中选择一幅作品提交。</p>

            <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
            <div v-if="successMsg" class="success-banner">{{ successMsg }}</div>

            <div v-if="selectedGeneration" class="selected-preview">
              <div class="selected-image-box">
                <img :src="selectedGeneration.outputImageUrl" alt="Selected" class="preview-image" />
              </div>
              <div class="selected-meta">
                <div class="selected-prompt">{{ selectedGeneration.prompt }}</div>
                <span class="selected-time">{{ new Date(selectedGeneration.createdAt).toLocaleString('zh-CN') }}</span>
              </div>
              <div class="submit-bar">
                <button class="btn btn-primary" @click="handleSubmit" :disabled="isSubmitting">
                  {{ isSubmitting ? '正在提交...' : '确认提交此作品' }}
                </button>
                <button class="btn btn-secondary" @click="selectedGeneration = null" :disabled="isSubmitting">重新选择</button>
              </div>
            </div>

            <div v-else>
              <div class="search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="searchKeyword" type="text" placeholder="搜索提示词关键字..." class="search-input" />
              </div>

              <div class="gallery-grid">
                <div v-if="store.generations.length === 0" class="empty-gallery">
                  <p>{{ searchKeyword ? '没有匹配的作品' : '还没有创作记录' }}</p>
                  <router-link v-if="!searchKeyword" to="/student/generate" class="btn btn-secondary">去工作区创作</router-link>
                </div>
                <div v-for="gen in store.generations" :key="gen.id" class="gallery-item" @click="selectGeneration(gen)">
                  <img :src="gen.outputImageUrl" alt="Generation" />
                  <div class="gallery-item-info">
                    <span>{{ gen.prompt?.slice(0, 30) }}</span>
                  </div>
                </div>
              </div>

              <div class="gallery-footer">
                <router-link to="/student/generate" class="link-to-workspace">去工作区创作新作品 →</router-link>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-root { max-width: 1100px; margin: 0 auto; padding-bottom: 48px; }
.hero-band { padding: 0 0 24px 0; }
.btn-back { background: none; border: none; color: var(--muted); display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; cursor: pointer; padding: 0; margin-bottom: 16px; transition: color 0.2s; }
.btn-back:hover { color: var(--ink); }
.hero-title { font-family: var(--font-serif); font-size: 36px; font-weight: 400; color: var(--ink); margin: 0; }

.layout-grid { display: grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start; }
.card-light { background: var(--surface-card); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--hairline); }

.info-panel { display: flex; flex-direction: column; gap: 20px; }
.info-section { display: flex; flex-direction: column; gap: 6px; }
.info-section label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.desc-content { font-size: 14px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; }
.ref-image { max-width: 100%; border-radius: 8px; border: 1px solid var(--hairline); }
.rubric-text { background: var(--surface-soft); padding: 10px 12px; border-radius: 6px; font-size: 13px; }
.hint-box { background: rgba(204,120,92,0.06); border: 1px solid rgba(204,120,92,0.2); padding: 10px 12px; border-radius: 6px; font-size: 13px; color: var(--primary-active); }
.meta-val { font-size: 14px; font-weight: 500; color: var(--ink); }
.status-badge { display: inline-flex; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 500; width: fit-content; }
.status-pending { background: rgba(204,120,92,0.1); color: var(--primary); }
.status-submitted { background: rgba(93,184,114,0.1); color: var(--success); }

.action-panel { min-height: 400px; }
.panel-title { font-family: var(--font-serif); font-size: 24px; margin: 0 0 4px 0; color: var(--ink); }
.panel-sub { font-size: 13px; color: var(--muted); margin: 0 0 16px 0; }

.search-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--hairline); border-radius: var(--radius-md); margin-bottom: 16px; background: white; }
.search-input { border: none; outline: none; flex: 1; font-size: 14px; color: var(--ink); background: transparent; }

.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; }
.gallery-item { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.gallery-item:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.gallery-item-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 8px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; font-size: 10px; opacity: 0; transition: opacity 0.2s; }
.gallery-item:hover .gallery-item-info { opacity: 1; }
.empty-gallery { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }

.gallery-footer { margin-top: 12px; text-align: center; }
.link-to-workspace { font-size: 13px; color: var(--primary); text-decoration: none; font-weight: 500; }
.link-to-workspace:hover { text-decoration: underline; }

.selected-preview { display: flex; flex-direction: column; gap: 12px; }
.selected-image-box { border-radius: 10px; overflow: hidden; border: 1px solid var(--hairline); display: flex; justify-content: center; background: white; }
.preview-image { max-width: 100%; max-height: 350px; }
.selected-meta { display: flex; flex-direction: column; gap: 4px; }
.selected-prompt { font-size: 13px; color: var(--ink); line-height: 1.5; }
.selected-time { font-size: 12px; color: var(--muted); }
.submit-bar { display: flex; gap: 10px; padding: 16px; background: var(--surface-cream-strong); border-radius: 10px; }

.submitted-view { display: flex; flex-direction: column; gap: 16px; }
.result-image-box { border-radius: 10px; overflow: hidden; border: 1px solid var(--hairline); display: flex; justify-content: center; }
.result-image { max-width: 100%; max-height: 400px; }
.review-box { background: white; border: 1px solid var(--hairline); border-radius: 10px; padding: 20px; border-top: 3px solid var(--success); }
.score-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.score-label { font-size: 14px; font-weight: 600; color: var(--muted); }
.score-val { font-family: var(--font-serif); font-size: 28px; color: var(--success); }
.feedback-text { font-size: 14px; line-height: 1.6; color: var(--ink); white-space: pre-wrap; padding: 12px; background: var(--surface-soft); border-radius: 6px; }
.pending-review-msg { padding: 14px 16px; background: rgba(204,120,92,0.05); border: 1px solid rgba(204,120,92,0.2); border-radius: 8px; color: var(--primary-active); font-size: 14px; font-weight: 500; }

.error-banner { background: rgba(198,69,69,0.1); color: var(--error); padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.success-banner { background: rgba(93,184,114,0.1); color: var(--success); padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 20px; height: 40px; border-radius: var(--radius-md); font-weight: 500; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover:not(:disabled) { background: var(--primary-active); }
.btn-secondary { background: white; color: var(--ink); border: 1px solid var(--hairline); }
.btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>