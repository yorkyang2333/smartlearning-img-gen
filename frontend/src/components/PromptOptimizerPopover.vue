<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { marked } from 'marked'

interface OptimizerState {
  phase: 'input' | 'result'
  resultText: string
  isStreaming: boolean
  lastInstruction: string
  lastTab: 'auto' | 'feedback'
  lastActual: string
  lastExpected: string
}

const props = defineProps<{
  prompt: string
  state: OptimizerState
}>()

const emit = defineEmits<{
  (e: 'apply', newPrompt: string): void
  (e: 'close'): void
}>()

const authStore = useAuthStore()

const instruction = ref(props.state.lastInstruction)
const actual = ref(props.state.lastActual)
const expected = ref(props.state.lastExpected)
const tab = ref<'auto' | 'feedback'>(props.state.lastTab)
const errorMsg = ref<string | null>(null)

const rootRef = ref<HTMLDivElement | null>(null)
const autoTextareaRef = ref<HTMLTextAreaElement | null>(null)
const resultScrollRef = ref<HTMLDivElement | null>(null)
const isThinking = ref(false)

let abortController: AbortController | null = null

const canSubmitFeedback = () =>
  actual.value.trim().length > 0 && expected.value.trim().length > 0

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return text.replace(/\n/g, '<br>')
  }
}

const submit = async () => {
  if (props.state.isStreaming) return
  if (tab.value === 'feedback' && !canSubmitFeedback()) {
    errorMsg.value = '请填写两个必填项'
    return
  }
  errorMsg.value = null

  // Save input state
  props.state.lastInstruction = instruction.value
  props.state.lastTab = tab.value
  props.state.lastActual = actual.value
  props.state.lastExpected = expected.value

  // Switch to result phase
  props.state.phase = 'result'
  props.state.resultText = ''
  props.state.isStreaming = true

  const body: Record<string, string> = { prompt: props.prompt || '' }
  if (tab.value === 'auto') {
    if (instruction.value.trim()) body.instruction = instruction.value.trim()
  } else {
    body.actual = actual.value.trim()
    body.expected = expected.value.trim()
  }

  abortController = new AbortController()

  try {
    const res = await fetch('http://localhost:8080/api/generate/optimize-prompt-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(body),
      signal: abortController.signal
    })

    if (!res.ok) {
      const errText = await res.text()
      try {
        const errData = JSON.parse(errText)
        throw new Error(errData.error || errData.message || `请求失败 (${res.status})`)
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Unexpected')) throw e
        throw new Error(`请求失败 (${res.status})`)
      }
    }

    if (!res.body) throw new Error('No streaming body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    isThinking.value = true

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        let dataStr = ''
        if (line.startsWith('data: ')) dataStr = line.slice(6)
        else if (line.startsWith('data:')) dataStr = line.slice(5)

        if (dataStr) {
          if (dataStr === '[DONE]') continue
          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices?.[0]?.delta
            if (delta?.content) {
              isThinking.value = false
              props.state.resultText += delta.content
              nextTick(() => {
                if (resultScrollRef.value) resultScrollRef.value.scrollTop = resultScrollRef.value.scrollHeight
              })
            }
          } catch {
            if (!dataStr.startsWith('{')) {
              isThinking.value = false
              props.state.resultText += dataStr
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      if (!props.state.resultText) {
        props.state.resultText = `⚠️ ${err.message || '网络请求失败'}`
      }
      errorMsg.value = err.message || '网络请求失败'
    }
  } finally {
    props.state.isStreaming = false
    abortController = null
  }
}

const handleApply = () => {
  emit('apply', props.state.resultText)
  resetAndClose()
}

const handleExit = () => {
  resetAndClose()
}

const resetAndClose = () => {
  props.state.phase = 'input'
  props.state.resultText = ''
  props.state.isStreaming = false
  emit('close')
}

const handleRegenerate = () => {
  submit()
}

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.state.resultText)
  } catch {}
}

const goAuto = () => {
  tab.value = 'auto'
  props.state.lastTab = 'auto'
  errorMsg.value = null
  nextTick(() => autoTextareaRef.value?.focus())
}

const goFeedback = () => {
  tab.value = 'feedback'
  props.state.lastTab = 'feedback'
  errorMsg.value = null
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

// Sync local refs back to state on change
watch(instruction, v => { props.state.lastInstruction = v })
watch(actual, v => { props.state.lastActual = v })
watch(expected, v => { props.state.lastExpected = v })

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
  if (props.state.phase === 'input') {
    nextTick(() => autoTextareaRef.value?.focus())
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocMousedown)
  document.removeEventListener('keydown', handleKey)
  if (abortController) abortController.abort()
})
</script>

// --- PLACEHOLDER_TEMPLATE ---

<template>
  <div class="optimizer-popover" ref="rootRef">
    <!-- ===== RESULT PHASE ===== -->
    <div v-if="state.phase === 'result'" class="op-result-pane">
      <div class="op-result-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.8L20.5 10l-6.7 1.6L12 18l-1.8-6.4L3.5 10l6.7-1.2zM19 3l.7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z"/></svg>
        <span class="op-result-title">编排</span>
      </div>

      <div class="op-result-scroll" ref="resultScrollRef">
        <div v-if="isThinking && !state.resultText" class="op-thinking">
          <span class="op-thinking-dot"></span>
          <span class="op-thinking-dot"></span>
          <span class="op-thinking-dot"></span>
          <span class="op-thinking-label">正在分析...</span>
        </div>
        <div class="op-result-content markdown-body" v-html="renderMarkdown(state.resultText)"></div>
        <span v-if="state.isStreaming && state.resultText" class="op-cursor"></span>
      </div>

      <div class="op-result-actions">
        <button class="op-btn op-btn--primary" @click="handleApply" :disabled="state.isStreaming || !state.resultText">替换</button>
        <button class="op-btn op-btn--secondary" @click="handleExit">退出</button>
        <div class="op-action-icons">
          <button class="op-icon-btn" @click="handleCopy" title="复制">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="op-icon-btn" @click="handleRegenerate" :disabled="state.isStreaming" title="重新生成">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          </button>
          <button class="op-icon-btn" title="有帮助">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-6 0v4"/><path d="M5 9h14l1 12H4L5 9z"/></svg>
          </button>
          <button class="op-icon-btn" title="无帮助">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15V19a3 3 0 006 0v-4"/><path d="M19 15H5l-1-12h16l-1 12z"/></svg>
          </button>
        </div>
      </div>

      <!-- Input row stays visible in result phase -->
      <div class="op-input-row op-input-row--bottom">
        <span class="op-prefix-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.8L20.5 10l-6.7 1.6L12 18l-1.8-6.4L3.5 10l6.7-1.2zM19 3l.7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z"/></svg>
        </span>
        <textarea
          v-model="instruction"
          rows="1"
          placeholder="你希望如何编写或优化提示词?"
          @keydown="onAutoKey"
          :disabled="state.isStreaming"
        ></textarea>
        <button class="op-send-btn" :disabled="state.isStreaming" @click="submit" title="发送">
          <span v-if="state.isStreaming" class="op-spinner"></span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="op-disclaimer">内容由AI生成，无法确保真实准确，仅供参考。</div>
    </div>

    <!-- ===== INPUT PHASE ===== -->
    <div v-else>
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
            :disabled="state.isStreaming"
          ></textarea>
          <button class="op-send-btn" :disabled="state.isStreaming" @click="submit" title="发送">
            <span v-if="state.isStreaming" class="op-spinner"></span>
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
          <input v-model="actual" type="text" placeholder="如：颜色偏暗、构图不对…" class="op-text-input op-text-input--accent" @keydown="onFieldKey" :disabled="state.isStreaming" />
        </div>
        <div class="op-field">
          <label>你期望的效果是什么? <span class="op-req">*</span></label>
          <input v-model="expected" type="text" placeholder="描述你想要的画面效果" class="op-text-input" @keydown="onFieldKey" :disabled="state.isStreaming" />
        </div>
        <div v-if="errorMsg" class="op-error">{{ errorMsg }}</div>
        <div class="op-feedback-actions">
          <button class="op-send-btn op-send-btn--circle" :disabled="state.isStreaming || !canSubmitFeedback()" @click="submit" title="发送">
            <span v-if="state.isStreaming" class="op-spinner"></span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
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

/* Tabs */
.op-tabs { display: flex; gap: 8px; }
.op-pill {
  border: none; padding: 6px 14px; border-radius: 999px;
  background: transparent; color: var(--muted); font-size: 13px;
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.op-pill:hover { color: var(--ink); background: var(--surface-cream); }
.op-pill.active { background: var(--op-accent-soft); color: var(--op-accent); font-weight: 500; }

/* Input row */
.op-input-row {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px 8px 12px;
  border: 1.5px solid var(--op-accent); border-radius: 12px;
  background: #fff; transition: box-shadow 0.15s;
}
.op-input-row:focus-within { box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12); }
.op-input-row--bottom { margin-top: 12px; }
.op-prefix-icon { color: var(--op-accent); display: flex; align-items: center; padding-top: 4px; flex-shrink: 0; }
.op-input-row textarea {
  flex: 1; border: none; outline: none; resize: none;
  font-family: inherit; font-size: 13px; line-height: 1.5;
  color: var(--ink); background: transparent; padding: 4px 0;
  min-height: 22px; max-height: 120px;
}
.op-input-row textarea::placeholder { color: #b8b3a8; }

/* Send button */
.op-send-btn {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px;
  border: none; background: transparent; color: var(--muted);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.op-send-btn:hover:not(:disabled) { background: var(--op-accent-soft); color: var(--op-accent); }
.op-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.op-send-btn--circle { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--hairline); }
.op-send-btn--circle:hover:not(:disabled) { background: var(--op-accent); border-color: var(--op-accent); color: #fff; }

/* Feedback tab */
.op-back { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; color: var(--ink); cursor: pointer; width: fit-content; padding: 2px 0; }
.op-back:hover { color: var(--op-accent); }
.op-field { display: flex; flex-direction: column; gap: 6px; }
.op-field label { font-size: 13px; color: var(--ink); font-weight: 500; }
.op-req { color: #d35a5a; margin-left: 2px; }
.op-text-input {
  width: 100%; border: 1.5px solid var(--hairline); border-radius: 10px;
  padding: 9px 12px; font-size: 13px; color: var(--ink); background: #fff;
  font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
}
.op-text-input::placeholder { color: #b8b3a8; }
.op-text-input:focus { border-color: var(--op-accent); box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12); }
.op-text-input--accent { border-color: var(--op-accent); box-shadow: 0 0 0 3px rgba(111, 95, 208, 0.12); }
.op-text-input:disabled { background: var(--surface-cream); cursor: not-allowed; }
.op-feedback-actions { display: flex; justify-content: flex-end; margin-top: 2px; }

/* Error */
.op-error { font-size: 12px; color: #c64545; background: rgba(198, 69, 69, 0.06); padding: 6px 10px; border-radius: 6px; }

/* Spinner */
.op-spinner { width: 14px; height: 14px; border: 2px solid rgba(111, 95, 208, 0.2); border-top-color: var(--op-accent); border-radius: 50%; animation: opSpin 0.8s linear infinite; }
@keyframes opSpin { to { transform: rotate(360deg); } }

/* ===== RESULT PHASE ===== */
.op-result-pane { display: flex; flex-direction: column; }

.op-result-header {
  display: flex; align-items: center; gap: 8px;
  color: var(--op-accent); margin-bottom: 12px;
}
.op-result-title { font-size: 16px; font-weight: 600; color: var(--ink); }

.op-result-scroll {
  max-height: 280px; overflow-y: auto;
  background: var(--surface-cream, #faf8f5);
  border: 1px solid var(--hairline);
  border-radius: 10px; padding: 14px;
  margin-bottom: 12px;
}

.op-result-content { font-size: 14px; line-height: 1.7; color: var(--ink); }

/* Markdown styles */
.op-result-content :deep(p) { margin: 0 0 8px; }
.op-result-content :deep(p:last-child) { margin-bottom: 0; }
.op-result-content :deep(strong) { font-weight: 600; color: var(--op-accent); }
.op-result-content :deep(ul), .op-result-content :deep(ol) { padding-left: 20px; margin: 0 0 8px; }
.op-result-content :deep(li) { margin-bottom: 4px; }
.op-result-content :deep(code) { background: rgba(111,95,208,0.08); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
.op-result-content :deep(pre) { background: rgba(111,95,208,0.06); padding: 10px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
.op-result-content :deep(h1), .op-result-content :deep(h2), .op-result-content :deep(h3) { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: var(--op-accent); }

/* Streaming cursor */
.op-cursor {
  display: inline-block; width: 2px; height: 16px;
  background: var(--op-accent); margin-left: 2px; vertical-align: text-bottom;
  animation: opBlink 1s step-end infinite;
}
@keyframes opBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Thinking indicator */
.op-thinking {
  display: flex; align-items: center; gap: 4px; padding: 8px 0;
}
.op-thinking-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--op-accent);
  animation: opThinkBounce 1.2s ease-in-out infinite;
}
.op-thinking-dot:nth-child(2) { animation-delay: 0.15s; }
.op-thinking-dot:nth-child(3) { animation-delay: 0.3s; }
.op-thinking-label { font-size: 13px; color: var(--muted); margin-left: 6px; }
@keyframes opThinkBounce {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

/* Action bar */
.op-result-actions {
  display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
}
.op-btn {
  padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
  border: none; cursor: pointer; transition: all 0.15s;
}
.op-btn--primary { background: var(--op-accent); color: #fff; }
.op-btn--primary:hover:not(:disabled) { background: var(--op-accent-hover); }
.op-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
.op-btn--secondary { background: var(--surface-cream, #f5f3ef); color: var(--ink); border: 1px solid var(--hairline); }
.op-btn--secondary:hover { background: #eae7e2; }

.op-action-icons { display: flex; gap: 4px; margin-left: auto; }
.op-icon-btn {
  width: 30px; height: 30px; border-radius: 6px; border: none;
  background: transparent; color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.op-icon-btn:hover:not(:disabled) { background: var(--op-accent-soft); color: var(--op-accent); }
.op-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Disclaimer */
.op-disclaimer {
  text-align: center; font-size: 11px; color: var(--muted);
  padding: 8px 0 0; margin-top: 4px;
}
</style>
