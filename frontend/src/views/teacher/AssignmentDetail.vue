<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAssignmentStore } from '../../stores/assignments'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const store = useAssignmentStore()
const assignmentId = route.params.id as string

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const assignment = ref<any>(null)
const students = ref<any[]>([])
const loading = ref(true)
const filterTab = ref<'all' | 'pending' | 'reviewed'>('all')

const selectedSubmission = ref<any>(null)
const reviewScore = ref<number | ''>('')
const reviewFeedback = ref('')
const isReviewing = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    await store.fetchTeacherAssignments()
    assignment.value = store.assignments.find((a: any) => a.id === assignmentId)

    const stRes = await fetch(`${API_BASE}/api/teacher/students`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (stRes.ok) {
      students.value = await stRes.json()
    }

    await store.fetchSubmissions(assignmentId)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const filteredSubmissions = computed(() => {
  if (filterTab.value === 'pending') return store.submissions.filter(s => s.status === 'PENDING')
  if (filterTab.value === 'reviewed') return store.submissions.filter(s => s.status === 'REVIEWED')
  return store.submissions
})

const getStudentName = (studentId: string) => {
  const st = students.value.find(s => s.id === studentId)
  return st ? (st.displayName || st.username) : '未知学生'
}

const openReview = (sub: any) => {
  selectedSubmission.value = sub
  reviewScore.value = sub.score || ''
  reviewFeedback.value = sub.feedback || ''
}

const submitReview = async () => {
  if (!selectedSubmission.value) return
  if (reviewScore.value === '' || reviewScore.value < 0 || reviewScore.value > 100) {
    alert("请输入有效的评分（0-100）")
    return
  }

  isReviewing.value = true
  try {
    const ok = await store.reviewSubmission(selectedSubmission.value.id, Number(reviewScore.value), reviewFeedback.value)
    if (ok) {
      await loadData()
      selectedSubmission.value = null
    } else {
      alert("评阅失败")
    }
  } catch (e) {
    alert("网络错误")
  } finally {
    isReviewing.value = false
  }
}

const currentIndex = computed(() => {
  if (!selectedSubmission.value) return -1
  return filteredSubmissions.value.findIndex(s => s.id === selectedSubmission.value.id)
})

const goToPrev = () => {
  if (currentIndex.value > 0) {
    openReview(filteredSubmissions.value[currentIndex.value - 1])
  }
}

const goToNext = () => {
  if (currentIndex.value < filteredSubmissions.value.length - 1) {
    openReview(filteredSubmissions.value[currentIndex.value + 1])
  }
}

const unreviewedCount = computed(() => store.submissions.filter(s => s.status === 'PENDING').length)
const reviewedCount = computed(() => store.submissions.filter(s => s.status === 'REVIEWED').length)

onMounted(() => {
  loadData()
})
</script>

<template>
  <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 64px;">
    <div class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/teacher/assignments')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          返回任务列表
        </button>
        <h1 class="editorial-title" style="margin-top: 16px;">{{ assignment?.title || '任务评阅' }}</h1>
        <p class="editorial-subtitle" v-if="assignment">{{ assignment.description }}</p>
      </div>
    </div>

    <div v-if="loading" style="padding: 48px; color: var(--muted); text-align: center;">加载中...</div>

    <div v-else-if="assignment" style="display: flex; gap: 24px; align-items: flex-start;">
      <div class="glass-panel submissions-list" style="flex: 1; min-width: 280px;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--hairline);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--ink);">提交列表</h3>
            <span style="font-size: 12px; color: var(--muted);">{{ store.submissions.length }}/{{ students.length }} 人</span>
          </div>
          <div class="filter-tabs">
            <button :class="{ active: filterTab === 'all' }" @click="filterTab = 'all'">全部 ({{ store.submissions.length }})</button>
            <button :class="{ active: filterTab === 'pending' }" @click="filterTab = 'pending'">待评 ({{ unreviewedCount }})</button>
            <button :class="{ active: filterTab === 'reviewed' }" @click="filterTab = 'reviewed'">已评 ({{ reviewedCount }})</button>
          </div>
        </div>

        <div v-if="filteredSubmissions.length === 0" style="padding: 40px; text-align: center; color: var(--muted); font-size: 13px;">
          {{ filterTab === 'all' ? '目前还没有学生提交作品。' : '没有匹配的提交。' }}
        </div>

        <div v-else class="list-wrapper">
          <div v-for="sub in filteredSubmissions" :key="sub.id" class="submission-item" :class="{ active: selectedSubmission?.id === sub.id }" @click="openReview(sub)">
            <div class="sub-avatar"><img :src="sub.imageUrl" alt="thumbnail" /></div>
            <div class="sub-info">
              <div class="sub-name">{{ getStudentName(sub.studentId) }}</div>
              <div class="sub-time">{{ new Date(sub.createdAt).toLocaleString() }}</div>
            </div>
            <div class="sub-status">
              <span v-if="sub.status === 'REVIEWED'" class="badge-success">{{ sub.score }}分</span>
              <span v-else class="badge-pending">待评</span>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel review-panel" style="flex: 2; position: sticky; top: 24px;">
        <div v-if="!selectedSubmission" class="empty-state">
          <p>请在左侧选择一份学生提交进行评阅</p>
        </div>

        <div v-else class="review-content">
          <div class="review-header">
            <h3>{{ getStudentName(selectedSubmission.studentId) }} 的作品</h3>
            <div class="nav-btns">
              <button class="nav-btn" :disabled="currentIndex <= 0" @click="goToPrev">← 上一份</button>
              <span class="nav-pos">{{ currentIndex + 1 }}/{{ filteredSubmissions.length }}</span>
              <button class="nav-btn" :disabled="currentIndex >= filteredSubmissions.length - 1" @click="goToNext">下一份 →</button>
            </div>
          </div>

          <div class="compare-row">
            <div class="compare-col">
              <div class="compare-label">学生作品</div>
              <div class="image-preview"><img :src="selectedSubmission.imageUrl" alt="Student Submission" /></div>
            </div>
            <div class="compare-col" v-if="assignment.referenceImageUrl">
              <div class="compare-label">参考图</div>
              <div class="image-preview"><img :src="assignment.referenceImageUrl" alt="Reference" /></div>
            </div>
          </div>

          <div v-if="selectedSubmission.prompt" class="prompt-display">
            <label>学生使用的提示词</label>
            <div class="prompt-text">{{ selectedSubmission.prompt }}</div>
          </div>

          <div class="review-form">
            <div v-if="assignment.rubric" class="rubric-hint">
              <label>评分标准</label>
              <div>{{ assignment.rubric }}</div>
            </div>
            <div class="form-group">
              <label>评分 (0-100)</label>
              <input type="number" v-model="reviewScore" min="0" max="100" class="input-score" placeholder="85" />
            </div>
            <div class="form-group">
              <label>导师评语</label>
              <textarea v-model="reviewFeedback" rows="3" class="input-feedback" placeholder="在此输入对作品的点评和建议..."></textarea>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" @click="submitReview" :disabled="isReviewing || reviewScore === ''">
                {{ isReviewing ? '提交中...' : '提交评阅' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; color: var(--muted); display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; font-family: var(--font-inter); cursor: pointer; padding: 0; transition: color 0.2s; }
.btn-back:hover { color: var(--ink); }

.filter-tabs { display: flex; gap: 4px; background: var(--surface-soft); border-radius: 8px; padding: 3px; }
.filter-tabs button { flex: 1; padding: 6px 8px; border: none; background: transparent; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.2s; }
.filter-tabs button.active { background: white; color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.badge-success { background: #e6f7ed; color: #15803d; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.badge-pending { background: rgba(204,120,92,0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }

.list-wrapper { display: flex; flex-direction: column; max-height: 600px; overflow-y: auto; }
.submission-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--surface-card); cursor: pointer; transition: background 0.2s; }
.submission-item:hover { background: var(--surface-cream); }
.submission-item.active { background: rgba(204,120,92,0.05); border-left: 3px solid var(--primary); }

.sub-avatar { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; border: 1px solid var(--hairline); flex-shrink: 0; }
.sub-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sub-info { flex: 1; min-width: 0; }
.sub-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub-time { font-size: 11px; color: var(--muted); margin-top: 2px; }

.empty-state { text-align: center; padding: 80px 20px; color: var(--muted); }

.review-content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.review-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.review-header h3 { margin: 0; font-size: 18px; color: var(--ink); }

.nav-btns { display: flex; align-items: center; gap: 8px; }
.nav-btn { background: white; border: 1px solid var(--hairline); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; color: var(--ink); transition: all 0.2s; }
.nav-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.nav-pos { font-size: 12px; color: var(--muted); font-weight: 500; }

.compare-row { display: flex; gap: 16px; }
.compare-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.compare-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.image-preview { border-radius: 10px; overflow: hidden; border: 1px solid var(--hairline); background: var(--surface-soft); display: flex; justify-content: center; }
.image-preview img { max-width: 100%; max-height: 300px; object-fit: contain; }

.prompt-display { display: flex; flex-direction: column; gap: 6px; }
.prompt-display label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.prompt-text { font-size: 13px; line-height: 1.5; color: var(--ink); padding: 10px 12px; background: var(--surface-soft); border-radius: 8px; white-space: pre-wrap; }

.rubric-hint { padding: 10px 12px; background: rgba(204,120,92,0.05); border: 1px solid rgba(204,120,92,0.15); border-radius: 8px; margin-bottom: 8px; }
.rubric-hint label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 4px; }
.rubric-hint div { font-size: 13px; color: var(--ink); white-space: pre-wrap; }

.review-form { display: flex; flex-direction: column; gap: 14px; background: var(--surface-cream-strong); padding: 20px; border-radius: 12px; border: 1px solid var(--hairline); }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--ink); }
.input-score { width: 100px; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 6px; font-size: 15px; font-weight: 600; outline: none; }
.input-score:focus { border-color: var(--primary); }
.input-feedback { width: 100%; padding: 10px; border: 1px solid var(--hairline); border-radius: 6px; font-size: 13px; font-family: var(--font-inter); line-height: 1.5; resize: vertical; outline: none; }
.input-feedback:focus { border-color: var(--primary); }
.form-actions { display: flex; justify-content: flex-end; }
</style>
