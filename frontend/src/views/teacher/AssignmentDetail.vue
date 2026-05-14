<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const assignmentId = route.params.id as string

const assignment = ref<any>(null)
const submissions = ref<any[]>([])
const students = ref<any[]>([])
const loading = ref(true)

const selectedSubmission = ref<any>(null)
const reviewScore = ref<number | ''>('')
const reviewFeedback = ref('')
const isReviewing = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    // 1. Fetch assignments to find current one
    const asRes = await fetch('http://localhost:8080/api/teacher/assignments', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const asList = await asRes.json()
    assignment.value = asList.find((a: any) => a.id === assignmentId)

    // 2. Fetch students to map names
    const stRes = await fetch('http://localhost:8080/api/teacher/students', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (stRes.ok) {
      students.value = await stRes.json()
    }

    // 3. Fetch submissions
    const subRes = await fetch(`http://localhost:8080/api/teacher/assignments/${assignmentId}/submissions`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (subRes.ok) {
      submissions.value = await subRes.json()
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

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
    const res = await fetch(`http://localhost:8080/api/teacher/submissions/${selectedSubmission.value.id}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        score: reviewScore.value,
        feedback: reviewFeedback.value
      })
    })

    if (res.ok) {
      await loadData()
      selectedSubmission.value = null
    } else {
      const data = await res.json()
      alert("评阅失败: " + data.error)
    }
  } catch (e) {
    alert("网络错误")
  } finally {
    isReviewing.value = false
  }
}

const unreviewedCount = computed(() => {
  return submissions.value.filter(s => s.status === 'PENDING').length
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 64px;">
    <div class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/teacher/assignments')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          返回任务列表
        </button>
        <h1 class="editorial-title" style="margin-top: 16px;">{{ assignment?.title || '任务评阅' }}</h1>
        <p class="editorial-subtitle" v-if="assignment">{{ assignment.description }}</p>
      </div>
    </div>

    <div v-if="loading" style="padding: 48px; color: var(--muted); text-align: center;">加载中...</div>

    <div v-else-if="assignment" style="display: flex; gap: 24px; align-items: flex-start;">
      <!-- 左侧：提交列表 -->
      <div class="glass-panel submissions-list" style="flex: 1;">
        <div style="padding: 20px; border-bottom: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 16px; color: var(--ink);">所有提交 ({{ submissions.length }})</h3>
          <span v-if="unreviewedCount > 0" class="badge-amber">待评阅: {{ unreviewedCount }}</span>
        </div>
        
        <div v-if="submissions.length === 0" style="padding: 40px; text-align: center; color: var(--muted);">
          目前还没有学生提交作品。
        </div>

        <div v-else class="list-wrapper">
          <div 
            v-for="sub in submissions" 
            :key="sub.id" 
            class="submission-item"
            :class="{ active: selectedSubmission?.id === sub.id }"
            @click="openReview(sub)"
          >
            <div class="sub-avatar">
              <img :src="sub.imageUrl" alt="thumbnail" />
            </div>
            <div class="sub-info">
              <div class="sub-name">{{ getStudentName(sub.studentId) }}</div>
              <div class="sub-time">{{ new Date(sub.createdAt).toLocaleString() }}</div>
            </div>
            <div class="sub-status">
              <span v-if="sub.status === 'REVIEWED'" class="badge-success">{{ sub.score }} 分</span>
              <span v-else class="badge-pending">待评</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：评阅面板 -->
      <div class="glass-panel review-panel" style="flex: 2; position: sticky; top: 24px;">
        <div v-if="!selectedSubmission" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.2; margin-bottom: 16px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <p>请在左侧选择一份学生提交进行评阅</p>
        </div>

        <div v-else class="review-content">
          <div class="review-header">
            <h3>{{ getStudentName(selectedSubmission.studentId) }} 的作品</h3>
            <span class="badge-gray">{{ new Date(selectedSubmission.createdAt).toLocaleString() }}</span>
          </div>

          <div class="image-preview">
            <img :src="selectedSubmission.imageUrl" alt="Student Submission" />
            <a :href="selectedSubmission.imageUrl" target="_blank" class="zoom-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </a>
          </div>

          <div class="review-form">
            <div class="form-group">
              <label>评分 (0-100)</label>
              <input type="number" v-model="reviewScore" min="0" max="100" class="input-score" placeholder="例如: 85" />
            </div>
            <div class="form-group">
              <label>导师评语</label>
              <textarea v-model="reviewFeedback" rows="4" class="input-feedback" placeholder="在此输入对作品的点评和建议..."></textarea>
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

.badge-amber { background: var(--accent-amber); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.badge-success { background: #e6f7ed; color: #15803d; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid #bbf7d0; }
.badge-pending { background: rgba(204,120,92,0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500; }
.badge-gray { background: var(--surface-soft); color: var(--muted); padding: 4px 8px; border-radius: 6px; font-size: 12px; }

.list-wrapper { display: flex; flex-direction: column; max-height: 600px; overflow-y: auto; }
.submission-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--surface-card); cursor: pointer; transition: background 0.2s; }
.submission-item:hover { background: var(--surface-cream); }
.submission-item.active { background: rgba(204,120,92,0.05); border-left: 3px solid var(--primary); }

.sub-avatar { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; border: 1px solid var(--hairline); flex-shrink: 0; background: var(--surface-soft); }
.sub-avatar img { width: 100%; height: 100%; object-fit: cover; }

.sub-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sub-name { font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub-time { font-size: 12px; color: var(--muted); }

.empty-state { text-align: center; padding: 120px 20px; color: var(--muted); display: flex; flex-direction: column; align-items: center; }

.review-content { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
.review-header { display: flex; justify-content: space-between; align-items: center; }
.review-header h3 { margin: 0; font-size: 20px; color: var(--ink); }

.image-preview { position: relative; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--hairline); background: var(--surface-soft); display: flex; justify-content: center; }
.image-preview img { max-width: 100%; max-height: 400px; object-fit: contain; }
.zoom-btn { position: absolute; bottom: 12px; right: 12px; width: 36px; height: 36px; background: rgba(0,0,0,0.6); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.zoom-btn:hover { background: var(--primary); transform: scale(1.05); }

.review-form { display: flex; flex-direction: column; gap: 16px; background: var(--surface-cream-strong); padding: 20px; border-radius: 12px; border: 1px solid var(--hairline); }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--ink); }

.input-score { width: 120px; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 8px; font-size: 16px; font-weight: 600; outline: none; transition: border-color 0.2s; }
.input-score:focus { border-color: var(--primary); }

.input-feedback { width: 100%; padding: 12px; border: 1px solid var(--hairline); border-radius: 8px; font-size: 14px; font-family: var(--font-inter); line-height: 1.5; resize: vertical; outline: none; transition: border-color 0.2s; }
.input-feedback:focus { border-color: var(--primary); }

.form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
</style>
