<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  generationId: string
  prompt: string
  initialReviews?: any
}>()

const emit = defineEmits<{
  (e: 'applySuggestion', suggestion: string): void
}>()

const authStore = useAuthStore()
const activePerspectives = ref<string[]>(['composition'])
const reviews = ref<Record<string, any>>(props.initialReviews || {})
const isLoading = ref(false)
const error = ref<string | null>(null)

const perspectives = [
  { id: 'composition', name: '光影构图', icon: '📐' },
  { id: 'style', name: '艺术风格', icon: '🎨' },
  { id: 'completeness', name: '内容完整性', icon: '📋' }
]

const togglePerspective = (id: string) => {
  if (activePerspectives.value.includes(id)) {
    activePerspectives.value = activePerspectives.value.filter(p => p !== id)
  } else {
    activePerspectives.value.push(id)
  }
}

const handleReview = async () => {
  if (activePerspectives.value.length === 0) return
  isLoading.value = true
  error.value = null
  
  try {
    const res = await fetch('http://localhost:8080/api/generate/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        generationId: props.generationId,
        perspectives: activePerspectives.value
      })
    })
    const data = await res.json()
    if (data.success) {
      reviews.value = { ...reviews.value, ...data.results }
    } else {
      error.value = data.error || '评审失败'
    }
  } catch (e) {
    error.value = '网络请求失败'
  } finally {
    isLoading.value = false
  }
}

// Auto-run for initial perspective if not reviewed
watch(() => props.generationId, () => {
  reviews.value = props.initialReviews || {}
}, { immediate: true })

</script>

<template>
  <div class="tutor-review">
    <div class="perspective-selector">
      <button 
        v-for="p in perspectives" 
        :key="p.id"
        class="p-chip"
        :class="{ active: activePerspectives.includes(p.id) }"
        @click="togglePerspective(p.id)"
      >
        <span class="p-icon">{{ p.icon }}</span>
        {{ p.name }}
      </button>
      
      <button 
        class="review-trigger" 
        @click="handleReview" 
        :disabled="isLoading || activePerspectives.length === 0"
      >
        <span v-if="isLoading" class="spinner"></span>
        <span v-else>🚀 开始评审</span>
      </button>
    </div>

    <div v-if="error" class="review-error">{{ error }}</div>

    <div class="reviews-container">
      <div v-for="p in perspectives" :key="p.id">
        <div v-if="reviews[p.id]" class="review-card">
          <div class="card-header">
            <div class="header-left">
              <span class="perspective-badge">{{ p.name }}</span>
              <div class="score-pill" :class="getScoreClass(reviews[p.id].score)">
                {{ reviews[p.id].score }}分
              </div>
            </div>
            <button class="apply-link" @click="emit('applySuggestion', reviews[p.id].promptSuggestion)">
              应用改进建议
            </button>
          </div>
          
          <div class="analysis-body">
            <p class="analysis-text">{{ reviews[p.id].analysis }}</p>
            <div class="suggestion-box">
              <label>优化建议词：</label>
              <code>{{ reviews[p.id].promptSuggestion }}</code>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="Object.keys(reviews).length === 0 && !isLoading" class="empty-placeholder">
        选择上方的一个或多个方向，点击「开始评审」获取导师点评。
      </div>
    </div>
  </div>
</template>

<style scoped>
.tutor-review {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.perspective-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--hairline);
}

.p-chip {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--hairline);
  background: white;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.p-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.p-chip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.review-trigger {
  margin-left: auto;
  padding: 8px 16px;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reviews-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--hairline);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.perspective-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-pill {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.score-high { background: #e6f7ed; color: #15803d; }
.score-mid { background: #fef9c3; color: #a16207; }
.score-low { background: #fee2e2; color: #b91c1c; }

.apply-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}

.analysis-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  margin-bottom: 12px;
}

.suggestion-box {
  background: var(--surface-cream);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
}

.suggestion-box label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}

.suggestion-box code {
  font-family: monospace;
  font-size: 12px;
  color: var(--primary);
  word-break: break-all;
}

.empty-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
  border: 1px dashed var(--hairline);
  border-radius: 12px;
}

.review-error {
  font-size: 12px;
  color: var(--error);
  text-align: center;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>

<script lang="ts">
const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-mid'
  return 'score-low'
}
</script>
