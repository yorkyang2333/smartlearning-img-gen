<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { marked } from 'marked'

const props = defineProps<{
  generationId?: string | null
  initialReviews?: Record<string, any>
  hasImage: boolean
}>()

const emit = defineEmits<{
  (e: 'applySuggestion', suggestion: string): void
}>()

const authStore = useAuthStore()

// Tabs
const activeTab = ref<'review' | 'chat'>('review')

// Review state
const activePerspectives = ref<string[]>(['composition', 'style', 'completeness'])
const reviews = ref<Record<string, any>>(props.initialReviews || {})
const isReviewing = ref(false)
const reviewError = ref<string | null>(null)

const perspectives = [
  { id: 'composition', name: '光影构图' },
  { id: 'style', name: '艺术风格' },
  { id: 'completeness', name: '内容完整性' }
]

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-mid'
  return 'score-low'
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#5db872'
  if (score >= 60) return '#d4a017'
  return '#c64545'
}

const togglePerspective = (id: string) => {
  if (activePerspectives.value.includes(id)) {
    activePerspectives.value = activePerspectives.value.filter(p => p !== id)
  } else {
    activePerspectives.value.push(id)
  }
}

const handleReview = async () => {
  if (activePerspectives.value.length === 0 || !props.generationId) return
  isReviewing.value = true
  reviewError.value = null
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
      reviewError.value = data.error || '评审失败'
    }
  } catch (e) {
    reviewError.value = '网络请求失败'
  } finally {
    isReviewing.value = false
  }
}

// Auto-review when generationId changes
watch(() => props.generationId, (newId) => {
  reviews.value = props.initialReviews || {}
  loadChat(newId)
  if (newId && props.hasImage) {
    activeTab.value = 'review'
  }
})

// Chat state
type ChatMsg = { role: 'student' | 'tutor'; text: string }
const chatMessages = ref<ChatMsg[]>([])

const getStorageKey = (id: string | null | undefined) => `tutor_chat_${id || 'default'}`
const loadChat = (id: string | null | undefined) => {
  try {
    const saved = localStorage.getItem(getStorageKey(id))
    if (saved) chatMessages.value = JSON.parse(saved)
    else chatMessages.value = []
  } catch { chatMessages.value = [] }
}
loadChat(props.generationId)

watch(chatMessages, (newVal) => {
  localStorage.setItem(getStorageKey(props.generationId), JSON.stringify(newVal))
}, { deep: true })

const chatInput = ref('')
const isChatting = ref(false)
const chatScrollRef = ref<HTMLDivElement | null>(null)

const renderMarkdown = (text: string) => {
  if (!text) return ''
  return marked.parse(text) as string
}

const sendChat = async () => {
  if (!chatInput.value.trim()) return
  const msg = chatInput.value.trim()
  chatMessages.value.push({ role: 'student', text: msg })
  chatInput.value = ''
  isChatting.value = true
  
  // Add empty tutor message to append stream to
  const tutorMsgIndex = chatMessages.value.length
  chatMessages.value.push({ role: 'tutor', text: '' })
  
  nextTick(() => {
    if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
  })
  
  try {
    const res = await fetch('http://localhost:8080/api/generate/tutor-chat-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        generationId: props.generationId || null,
        message: msg
      })
    })

    if (!res.body) throw new Error('No streaming body')

    isChatting.value = false // Hide typing indicator since we are streaming now

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let done = false
    let buffer = ''

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' 
        for (const line of lines) {
          let dataStr = ''
          if (line.startsWith('data: ')) {
            dataStr = line.slice(6)
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5)
          }

          if (dataStr) {
            if (dataStr === '[DONE]') continue
            try {
              const data = JSON.parse(dataStr)
              if (data.choices && data.choices[0]?.delta?.content) {
                chatMessages.value[tutorMsgIndex].text += data.choices[0].delta.content
                nextTick(() => {
                  if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
                })
              } else if (data.error) {
                chatMessages.value[tutorMsgIndex].text += '\n[Error: ' + data.error + ']'
              }
            } catch (e) {
              // Not JSON (e.g. raw string stream from some providers), just append it if we changed backend format
              if (!dataStr.startsWith('{')) {
                 chatMessages.value[tutorMsgIndex].text += dataStr
                 nextTick(() => {
                   if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
                 })
              }
            }
          } else if (line.trim().length > 0 && !line.startsWith('event:')) {
             // In case backend sends raw strings instead of SSE data wrapper
             chatMessages.value[tutorMsgIndex].text += line + '\n'
             nextTick(() => {
               if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
             })
          }
        }
      }
    }
  } catch (err) {
    console.warn('Chat stream error:', err)
    if (chatMessages.value[tutorMsgIndex].text.length === 0) {
      chatMessages.value[tutorMsgIndex].text += '\n(网络错误，请稍后再试)'
    }
  } finally {
    isChatting.value = false
    nextTick(() => {
      if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    })
  }
}

const handleChatKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChat()
  }
}
</script>

<template>
  <div class="tutor-panel-root">
    <!-- Header -->
    <div class="drawer-header">
      <div class="drawer-title-row">
        <div class="drawer-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          <span class="drawer-title serif-display">AI 智能导师</span>
        </div>
      </div>
        <!-- Tabs -->
        <div class="drawer-tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'review' }" @click="activeTab = 'review'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            作品评审
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            导师对话
          </button>
      </div>
    </div>

    <!-- Content -->
    <div class="drawer-body">
        <!-- ========= REVIEW TAB ========= -->
        <div v-if="activeTab === 'review'" class="tab-content">
          <template v-if="hasImage && generationId">
            <div class="review-config-panel">
              <div class="config-header">
                <label>选择评审维度</label>
                <span class="sub-label">可多选</span>
              </div>
              <div class="perspective-selector">
                <button v-for="p in perspectives" :key="p.id" class="p-chip" :class="{ active: activePerspectives.includes(p.id) }" @click="togglePerspective(p.id)">
                  <svg v-if="p.id === 'composition'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21H3V3"></path><path d="M21 3L3 21"></path></svg>
                  <svg v-else-if="p.id === 'style'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 18a6 6 0 100-12 6 6 0 000 12z" fill="currentColor" fill-opacity="0.2"/></svg>
                  <svg v-else-if="p.id === 'completeness'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  {{ p.name }}
                </button>
              </div>
              <button class="btn-review-submit" @click="handleReview" :disabled="isReviewing || activePerspectives.length === 0">
                <span v-if="isReviewing" class="spinner"></span>
                <template v-else>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                  开始智能评审
                </template>
              </button>
            </div>
            <div v-if="reviewError" class="error-msg">{{ reviewError }}</div>
            <div class="reviews-list">
              <div v-for="p in perspectives" :key="p.id">
                <div v-if="reviews[p.id]" class="review-card">
                  <div class="review-card-top">
                    <div class="score-ring-wrap">
                      <svg viewBox="0 0 36 36" class="score-ring">
                        <path class="ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3"/>
                        <path class="ring-fg" :stroke="getScoreColor(reviews[p.id].score)" :stroke-dasharray="`${reviews[p.id].score}, 100`" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3" stroke-linecap="round"/>
                      </svg>
                      <span class="score-num" :class="getScoreClass(reviews[p.id].score)">{{ reviews[p.id].score }}</span>
                    </div>
                    <div class="review-meta">
                      <span class="perspective-name">
                        <svg v-if="p.id === 'composition'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><path d="M21 21H3V3"></path><path d="M21 3L3 21"></path></svg>
                        <svg v-else-if="p.id === 'style'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 18a6 6 0 100-12 6 6 0 000 12z" fill="currentColor" fill-opacity="0.2"/></svg>
                        <svg v-else-if="p.id === 'completeness'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-2px;"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                        {{ p.name }}
                      </span>
                      <p class="analysis-text">{{ reviews[p.id].analysis }}</p>
                    </div>
                  </div>
                  <div class="suggestion-box">
                    <label>优化建议词</label>
                    <code>{{ reviews[p.id].promptSuggestion }}</code>
                  </div>
                  <button class="btn btn-primary apply-btn" @click="emit('applySuggestion', reviews[p.id].promptSuggestion)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    应用改进建议
                  </button>
                </div>
              </div>
            </div>
            <div v-if="Object.keys(reviews).length === 0 && !isReviewing" class="review-empty-state">
              <div class="empty-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <p>等待评审</p>
              <span>选择上方维度后，点击开始获取导师反馈</span>
            </div>
          </template>
          <template v-else>
            <!-- Welcome cards -->
            <div class="welcome-section">
              <h3 class="welcome-title serif-display">我能帮你做什么？</h3>
              <div class="welcome-cards">
                <div class="welcome-card">
                  <span class="wc-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </span>
                  <h4>多维评审</h4>
                  <p>从光影构图、艺术风格、内容完整性三个角度评价你的作品</p>
                </div>
                <div class="welcome-card">
                  <span class="wc-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                  <h4>智能优化</h4>
                  <p>AI 帮你润色提示词，提升画面细节与艺术表现力</p>
                </div>
                <div class="welcome-card">
                  <span class="wc-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <h4>自由问答</h4>
                  <p>随时向导师提问关于构图、色彩、风格的艺术知识</p>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ========= CHAT TAB ========= -->
        <div v-if="activeTab === 'chat'" class="tab-content chat-tab">
          <div class="chat-scroll" ref="chatScrollRef">
            <div v-if="chatMessages.length === 0" class="chat-empty">
              <p>向 AI 导师提问任何关于构图、色彩、风格的问题</p>
              <div class="chat-starters">
                <button @click="chatInput = '如何改善画面的光影效果？'; sendChat()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  如何改善光影效果？
                </button>
                <button @click="chatInput = '这张图的构图有什么问题？'; sendChat()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21H3V3"></path><path d="M21 3L3 21"></path></svg>
                  构图有什么问题？
                </button>
                <button @click="chatInput = '推荐一些适合这个主题的艺术风格'; sendChat()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 18a6 6 0 100-12 6 6 0 000 12z" fill="currentColor" fill-opacity="0.2"/></svg>
                  推荐艺术风格
                </button>
              </div>
            </div>
            <template v-for="(msg, i) in chatMessages" :key="i">
              <div v-if="msg.role !== 'tutor' || msg.text" class="chat-bubble" :class="msg.role">
                <div v-if="msg.role === 'tutor'" class="bubble-content markdown-body" v-html="renderMarkdown(msg.text)"></div>
                <div v-else class="bubble-content">{{ msg.text }}</div>
              </div>
            </template>
            <div v-if="isChatting" class="chat-bubble tutor">
              <div class="bubble-content typing">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          </div>
          <div class="chat-input-bar">
            <textarea v-model="chatInput" placeholder="向导师提问..." @keydown="handleChatKey" rows="1"></textarea>
            <button class="send-btn" @click="sendChat" :disabled="!chatInput.trim() || isChatting">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Panel Root */
.tutor-panel-root {
  display: flex; flex-direction: column;
  height: 100%; overflow: hidden;
}

/* Header */
.drawer-header {
  padding: 16px 16px 0; border-bottom: 1px solid var(--hairline);
  background: var(--surface-card);
}
.drawer-title-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.drawer-brand { display: flex; align-items: center; gap: 10px; }
.drawer-title {
  font-size: 20px; color: var(--ink); letter-spacing: -0.3px;
}
.drawer-close {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--hairline);
  background: var(--canvas); color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.drawer-close:hover { color: var(--ink); border-color: var(--primary); }

/* Tabs */
.drawer-tabs { display: flex; gap: 4px; }
.tab-btn {
  flex: 1; padding: 10px 8px; background: none; border: none;
  font-size: 13px; font-weight: 500; color: var(--muted);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  gap: 6px; border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--ink); }
.tab-btn.active {
  color: var(--primary); border-bottom-color: var(--primary);
}

/* Body */
.drawer-body { 
  flex: 1; overflow-y: auto; 
  display: flex; flex-direction: column;
}
.tab-content {
  padding: 16px 16px;
  flex: 1; display: flex; flex-direction: column;
}

/* ===== REVIEW TAB ===== */
.review-config-panel {
  background: white;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.02);
}
.config-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.config-header label {
  font-size: 14px; font-weight: 600; color: var(--ink);
}
.config-header .sub-label {
  font-size: 12px; color: var(--muted);
}
.perspective-selector {
  display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
}
.p-chip {
  padding: 10px 16px; border-radius: 10px; border: 1px solid var(--hairline);
  background: var(--surface-card); font-size: 13px; color: var(--muted);
  cursor: pointer; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex; align-items: center; gap: 8px; font-weight: 500;
}
.p-chip:hover { 
  border-color: var(--primary); color: var(--primary); 
  background: white; box-shadow: 0 4px 12px rgba(204,120,92,0.08); 
}
.p-chip.active {
  background: var(--primary); color: white; border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(204,120,92,0.25);
}
.btn-review-submit {
  width: 100%; padding: 12px; border-radius: 10px;
  background: var(--ink); color: white; border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.btn-review-submit:hover:not(:disabled) {
  background: var(--primary);
  box-shadow: 0 4px 12px rgba(204,120,92,0.2);
}
.btn-review-submit:disabled {
  opacity: 0.5; cursor: not-allowed; background: var(--muted);
}

.review-empty-state {
  text-align: center; padding: 32px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  background: var(--surface-card); border-radius: 12px;
  border: 1px dashed var(--hairline-soft);
}
.empty-icon-wrap {
  width: 44px; height: 44px; border-radius: 22px;
  background: white; color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.review-empty-state p { margin: 0; font-size: 16px; font-weight: 600; color: var(--ink); }
.review-empty-state span { font-size: 13px; color: var(--muted); }

.reviews-list { display: flex; flex-direction: column; gap: 12px; }
.review-card {
  background: white; border-radius: 12px; border: 1px solid var(--hairline);
  padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  animation: cardIn 0.4s ease-out;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.review-card-top { display: flex; gap: 12px; margin-bottom: 12px; }
.score-ring-wrap {
  width: 44px; height: 44px; position: relative; flex-shrink: 0;
}
.score-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { stroke: var(--hairline); }
.ring-fg { transition: stroke-dasharray 1s ease-out; }
.score-num {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; font-size: 13px; font-weight: 700;
}
.score-high { color: #5db872; }
.score-mid { color: #d4a017; }
.score-low { color: #c64545; }

.review-meta { flex: 1; min-width: 0; }
.perspective-name {
  font-size: 12px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.5px;
  display: block; margin-bottom: 6px;
}
.analysis-text {
  font-size: 14px; line-height: 1.55; color: var(--body);
  margin: 0;
}
.suggestion-box {
  background: var(--surface-soft); padding: 12px; border-radius: 8px;
  border: 1px solid var(--hairline); margin-bottom: 12px;
}
.suggestion-box label {
  display: block; font-size: 11px; color: var(--muted);
  margin-bottom: 4px; font-weight: 500;
}
.suggestion-box code {
  font-family: var(--font-mono); font-size: 12px;
  color: var(--primary); word-break: break-all;
}
.apply-btn { width: 100%; font-size: 13px; height: 36px; }

.error-msg {
  font-size: 12px; color: var(--error); text-align: center;
  margin-bottom: 12px;
}

/* ===== WELCOME ===== */
.welcome-section { padding-top: 8px; }
.welcome-title { font-size: 22px; margin: 0 0 20px; color: var(--ink); }
.welcome-cards { display: flex; flex-direction: column; gap: 12px; }
.welcome-card {
  background: var(--surface-card); border-radius: 12px; padding: 20px;
  border: 1px solid var(--hairline-soft);
  transition: transform 0.2s;
}
.welcome-card:hover { transform: translateY(-2px); border-color: var(--primary); box-shadow: 0 4px 12px rgba(204,120,92,0.08); }
.wc-icon { display: flex; margin-bottom: 12px; color: var(--primary); }
.welcome-card h4 {
  font-family: var(--font-inter); font-size: 15px; font-weight: 600;
  color: var(--ink); margin: 0 0 6px;
}
.welcome-card p {
  font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0;
}

/* ===== CHAT TAB ===== */
.chat-tab {
  display: flex; flex-direction: column; padding: 0 !important;
  flex: 1; min-height: 0;
}
.chat-scroll {
  flex: 1; overflow-y: auto; padding: 20px 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.chat-empty {
  text-align: center; padding: 40px 0; color: var(--muted);
}
.chat-empty p { font-size: 14px; margin-bottom: 16px; }
.chat-starters { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.chat-starters button {
  background: white; border: 1px solid var(--hairline);
  border-radius: 12px; padding: 10px 16px; font-size: 13px;
  color: var(--ink); cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.chat-starters button:hover {
  border-color: var(--primary); color: var(--primary);
  background: var(--surface-card);
  box-shadow: 0 4px 12px rgba(204,120,92,0.08);
}
.chat-bubble { display: flex; }
.chat-bubble.student { justify-content: flex-end; }
.chat-bubble.tutor { justify-content: flex-start; }
.bubble-content {
  max-width: 80%; padding: 10px 14px; border-radius: 12px;
  font-size: 14px; line-height: 1.5;
}
.student .bubble-content {
  background: var(--primary); color: white;
  border-bottom-right-radius: 4px;
}
.tutor .bubble-content {
  background: var(--surface-card); color: var(--ink);
  border-bottom-left-radius: 4px;
}

/* Markdown Styles */
.markdown-body {
  font-size: 14px;
  line-height: 1.6;
}
.markdown-body p { margin-bottom: 8px; }
.markdown-body p:last-child { margin-bottom: 0; }
.markdown-body strong { font-weight: 600; color: var(--primary); }
.markdown-body ul { padding-left: 20px; margin-bottom: 8px; list-style-type: disc; }
.markdown-body ol { padding-left: 20px; margin-bottom: 8px; list-style-type: decimal; }
.markdown-body li { margin-bottom: 4px; }
.typing { display: flex; gap: 4px; align-items: center; padding: 12px 18px; }
.dot {
  width: 6px; height: 6px; background: var(--muted); border-radius: 50%;
  animation: dotBounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.chat-input-bar {
  padding: 12px 24px 20px; border-top: 1px solid var(--hairline);
  display: flex; gap: 8px; align-items: flex-end;
  background: var(--canvas);
}
.chat-input-bar textarea {
  flex: 1; padding: 10px 14px; border: 1px solid var(--hairline);
  border-radius: 8px; font-size: 14px; resize: none;
  font-family: var(--font-inter); background: white;
  max-height: 80px;
}
.chat-input-bar textarea:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(204,120,92,0.1);
}
.send-btn {
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--primary); color: white; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s; flex-shrink: 0;
}
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.send-btn:hover:not(:disabled) { background: var(--primary-active); }

/* Spinner */
.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
