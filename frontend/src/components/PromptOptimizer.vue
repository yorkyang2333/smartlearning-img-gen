<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  prompt: string
}>()

const emit = defineEmits<{
  (e: 'apply', newPrompt: string): void
}>()

const authStore = useAuthStore()
const isOptimizing = ref(false)
const isAnalyzing = ref(false)
const optimizedResult = ref<string | null>(null)
const suggestions = ref<any[] | null>(null)
const error = ref<string | null>(null)

const handleOptimize = async () => {
  if (!props.prompt.trim()) return
  isOptimizing.value = true
  error.value = null
  optimizedResult.value = null
  suggestions.value = null
  
  try {
    const res = await fetch('http://localhost:8080/api/generate/optimize-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ prompt: props.prompt })
    })
    const data = await res.json()
    if (data.success) {
      optimizedResult.value = data.optimized
    } else {
      error.value = data.error || '优化失败'
    }
  } catch (e) {
    error.value = '网络请求失败'
  } finally {
    isOptimizing.value = false
  }
}

const handleAnalyze = async () => {
  if (!props.prompt.trim()) return
  isAnalyzing.value = true
  error.value = null
  optimizedResult.value = null
  suggestions.value = null

  try {
    const res = await fetch('http://localhost:8080/api/generate/analyze-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ prompt: props.prompt })
    })
    const data = await res.json()
    if (data.success && data.data) {
      suggestions.value = data.data.suggestions
    } else {
      error.value = data.error || '分析失败'
    }
  } catch (e) {
    error.value = '网络请求失败'
  } finally {
    isAnalyzing.value = false
  }
}

const applyOptimization = () => {
  if (optimizedResult.value) {
    emit('apply', optimizedResult.value)
    optimizedResult.value = null
  }
}
</script>

<template>
  <div class="prompt-optimizer">
    <div class="opt-actions">
      <button 
        class="opt-btn secondary" 
        @click="handleOptimize" 
        :disabled="isOptimizing || !prompt.trim()"
      >
        <span v-if="isOptimizing" class="spinner"></span>
        <span v-else>✨ 一键优化</span>
      </button>
      <button 
        class="opt-btn secondary" 
        @click="handleAnalyze" 
        :disabled="isAnalyzing || !prompt.trim()"
      >
        <span v-if="isAnalyzing" class="spinner"></span>
        <span v-else>🔍 分析建议</span>
      </button>
    </div>

    <div v-if="error" class="opt-error">{{ error }}</div>

    <div v-if="optimizedResult" class="opt-result-card">
      <div class="card-header">
        <span class="card-title">优化建议</span>
        <button class="close-btn" @click="optimizedResult = null">✕</button>
      </div>
      <div class="comparison">
        <div class="comp-box original">
          <label>当前内容</label>
          <p>{{ prompt }}</p>
        </div>
        <div class="comp-arrow">→</div>
        <div class="comp-box optimized">
          <label>优化结果</label>
          <p>{{ optimizedResult }}</p>
        </div>
      </div>
      <button class="apply-btn" @click="applyOptimization">应用优化结果</button>
    </div>

    <div v-if="suggestions" class="opt-suggestions-card">
      <div class="card-header">
        <span class="card-title">维度分析建议</span>
        <button class="close-btn" @click="suggestions = null">✕</button>
      </div>
      <div class="suggestions-list">
        <div v-for="(s, i) in suggestions" :key="i" class="suggestion-item">
          <div class="sug-dim">{{ s.dimension }}</div>
          <div class="sug-content">
            <div class="sug-status">{{ s.currentStatus }}</div>
            <div class="sug-advice">{{ s.suggestion }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-optimizer {
  margin-bottom: 12px;
}

.opt-actions {
  display: flex;
  gap: 8px;
}

.opt-btn {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  border: 1px solid var(--hairline);
  background: white;
  color: var(--muted);
}

.opt-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--surface-cream);
}

.opt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.opt-error {
  font-size: 11px;
  color: var(--error);
  margin-top: 4px;
}

.opt-result-card, .opt-suggestions-card {
  background: white;
  border: 1px solid var(--primary);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
  box-shadow: 0 4px 12px rgba(204, 120, 92, 0.1);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
}

.comparison {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.comp-box {
  flex: 1;
  background: var(--surface-cream);
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
}

.comp-box label {
  display: block;
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.comp-arrow {
  color: var(--primary);
  font-weight: bold;
}

.apply-btn {
  width: 100%;
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.apply-btn:hover {
  opacity: 0.9;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-item {
  display: flex;
  gap: 12px;
}

.sug-dim {
  font-size: 11px;
  background: var(--surface-cream-strong);
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
  height: fit-content;
  white-space: nowrap;
}

.sug-content {
  flex: 1;
}

.sug-status {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 2px;
}

.sug-advice {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.4;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
