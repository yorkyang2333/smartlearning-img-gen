<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  prompt: string
}>()

const emit = defineEmits<{
  (e: 'apply', newPrompt: string): void
  (e: 'close'): void
}>()

const authStore = useAuthStore()

const tab = ref<'auto' | 'feedback'>('auto')
const instruction = ref('')
const actual = ref('')
const expected = ref('')
const isLoading = ref(false)
const errorMsg = ref<string | null>(null)

const rootRef = ref<HTMLDivElement | null>(null)
const autoTextareaRef = ref<HTMLTextAreaElement | null>(null)

const canSubmitFeedback = () =>
  actual.value.trim().length > 0 && expected.value.trim().length > 0

const submit = async () => {
  if (isLoading.value) return
  if (tab.value === 'feedback' && !canSubmitFeedback()) {
    errorMsg.value = '请填写两个必填项'
    return
  }
  errorMsg.value = null
  isLoading.value = true
  try {
    const body: Record<string, string> = { prompt: props.prompt || '' }
    if (tab.value === 'auto') {
      if (instruction.value.trim()) body.instruction = instruction.value.trim()
    } else {
      body.actual = actual.value.trim()
      body.expected = expected.value.trim()
    }
    const res = await fetch('http://localhost:8080/api/generate/optimize-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.success && typeof data.optimized === 'string') {
      emit('apply', data.optimized)
      instruction.value = ''
      actual.value = ''
      expected.value = ''
      emit('close')
    } else {
      errorMsg.value = data.error || '优化失败'
    }
  } catch {
    errorMsg.value = '网络请求失败'
  } finally {
    isLoading.value = false
  }
}

const onAutoKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

const onFieldKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (canSubmitFeedback()) submit()
  }
}

const goAuto = () => {
  tab.value = 'auto'
  errorMsg.value = null
  nextTick(() => autoTextareaRef.value?.focus())
}

const goFeedback = () => {
  tab.value = 'feedback'
  errorMsg.value = null
}

const handleDocMousedown = (e: MouseEvent) => {
  if (!rootRef.value) return
  const target = e.target as Node
  if (rootRef.value.contains(target)) return
  const triggerEl = (e.target as HTMLElement)?.closest?.('.optimizer-trigger-btn')
  if (triggerEl) return
  emit('close')
}

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocMousedown)
  document.addEventListener('keydown', handleKey)
  nextTick(() => autoTextareaRef.value?.focus())
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocMousedown)
  document.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div class="optimizer-popover" ref="rootRef">
    <!-- Tab A: 自动优化 -->
    <div v-if="tab === 'auto'" class="op-pane">
      <div class="op-tabs">
        <button class="op-pill active" @click="goAuto">自动优化</button>
        <button class="op-pill" @click="goFeedback">根据生图结果优化</button>
      </div>
      <div class="op-input-row">
        <span class="op-prefix-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.8L20.5 10l-6.7 1.6L12 18l-1.8-6.4L3.5 10l6.7-1.2zM19 3l.7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z"/></svg>
        </span>
        <textarea
          ref="autoTextareaRef"
          v-model="instruction"
          rows="1"
          placeholder="你希望如何编写或优化提示词?"
          @keydown="onAutoKey"
          :disabled="isLoading"
        ></textarea>
        <button class="op-send-btn" :disabled="isLoading" @click="submit" title="发送">
          <span v-if="isLoading" class="op-spinner"></span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div v-if="errorMsg" class="op-error">{{ errorMsg }}</div>
    </div>

    <!-- Tab B: 根据生图结果优化 -->
    <div v-else class="op-pane">
      <div class="op-back" @click="goAuto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>根据生图结果优化</span>
      </div>

      <div class="op-field">
        <label>生成的图片哪里不满意? <span class="op-req">*</span></label>
        <input
          v-model="actual"
          type="text"
          placeholder="如：颜色偏暗、构图不对…"
          class="op-text-input op-text-input--accent"
          @keydown="onFieldKey"
          :disabled="isLoading"
        />
      </div>

      <div class="op-field">
        <label>你期望的效果是什么? <span class="op-req">*</span></label>
        <input
          v-model="expected"
          type="text"
          placeholder="描述你想要的画面效果"
          class="op-text-input"
          @keydown="onFieldKey"
          :disabled="isLoading"
        />
      </div>

      <div v-if="errorMsg" class="op-error">{{ errorMsg }}</div>

      <div class="op-feedback-actions">
        <button
          class="op-send-btn op-send-btn--circle"
          :disabled="isLoading || !canSubmitFeedback()"
          @click="submit"
          title="发送"
        >
          <span v-if="isLoading" class="op-spinner"></span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.optimizer-popover {
  --op-accent: #6f5fd0;
  --op-accent-soft: #eee9ff;
  --op-accent-hover: #5a4cba;
  position: absolute;
  top: 44px;
  left: 10px;
  right: 10px;
  z-index: 30;
  background: #ffffff;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(20, 20, 19, 0.08), 0 2px 8px rgba(20, 20, 19, 0.04);
  padding: 14px;
  animation: opSlideDown 0.18s ease-out;
}
@keyframes opSlideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.op-pane { display: flex; flex-direction: column; gap: 12px; }

/* Tabs (pills) */
.op-tabs { display: flex; gap: 8px; }
.op-pill {
  border: none;
  padding: 6px 14px;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.op-pill:hover { color: var(--ink); background: var(--surface-cream); }
.op-pill.active {
  background: var(--op-accent-soft);
  color: var(--op-accent);
  font-weight: 500;
}

/* Auto tab input */
.op-input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  border: 1.5px solid var(--op-accent);
  border-radius: 12px;
  background: #fff;
  transition: box-shadow 0.15s;
}
.op-input-row:focus-within { box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12); }
.op-prefix-icon {
  color: var(--op-accent);
  display: flex; align-items: center;
  padding-top: 4px;
  flex-shrink: 0;
}
.op-input-row textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
  background: transparent;
  padding: 4px 0;
  min-height: 22px;
  max-height: 120px;
}
.op-input-row textarea::placeholder { color: #b8b3a8; }

/* Send button */
.op-send-btn {
  flex-shrink: 0;
  width: 28px; height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.op-send-btn:hover:not(:disabled) {
  background: var(--op-accent-soft);
  color: var(--op-accent);
}
.op-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.op-send-btn--circle {
  width: 30px; height: 30px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
}
.op-send-btn--circle:hover:not(:disabled) {
  background: var(--op-accent);
  border-color: var(--op-accent);
  color: #fff;
}

/* Feedback tab */
.op-back {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 500; color: var(--ink);
  cursor: pointer;
  width: fit-content;
  padding: 2px 0;
}
.op-back:hover { color: var(--op-accent); }

.op-field { display: flex; flex-direction: column; gap: 6px; }
.op-field label {
  font-size: 13px; color: var(--ink);
  font-weight: 500;
}
.op-req { color: #d35a5a; margin-left: 2px; }

.op-text-input {
  width: 100%;
  border: 1.5px solid var(--hairline);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--ink);
  background: #fff;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.op-text-input::placeholder { color: #b8b3a8; }
.op-text-input:focus {
  border-color: var(--op-accent);
  box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12);
}
.op-text-input--accent {
  border-color: var(--op-accent);
  box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12);
}
.op-text-input:disabled { background: var(--surface-cream); cursor: not-allowed; }

.op-feedback-actions {
  display: flex; justify-content: flex-end;
  margin-top: 2px;
}

.op-error {
  font-size: 12px;
  color: #c64545;
  background: rgba(198, 69, 69, 0.06);
  padding: 6px 10px;
  border-radius: 6px;
}

.op-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(111, 95, 208, 0.2);
  border-top-color: var(--op-accent);
  border-radius: 50%;
  animation: opSpin 0.8s linear infinite;
}
@keyframes opSpin { to { transform: rotate(360deg); } }
</style>
