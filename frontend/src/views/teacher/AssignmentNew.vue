<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  title: '',
  description: '',
  type: 'PRACTICE', // 'PRACTICE' or 'CHALLENGE'
  durationMin: 15
})

const isSubmitting = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  if (!formData.value.title.trim()) {
    errorMessage.value = '请输入任务标题'
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      ...formData.value,
      durationMin: formData.value.type === 'CHALLENGE' ? Number(formData.value.durationMin) : null
    }

    const res = await fetch('http://localhost:8080/api/teacher/assignments', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    })
    
    if (res.ok) {
      router.push('/teacher/assignments')
    } else {
      const data = await res.json()
      errorMessage.value = data.message || '发布任务失败'
    }
  } catch (e: any) {
    errorMessage.value = e.message || '网络错误，发布失败'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="page-root">
    <!-- HERO BAND -->
    <header class="hero-band">
      <div class="hero-text-col">
        <button @click="router.back()" class="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          返回任务列表
        </button>
        <h1 class="hero-title">发布新任务</h1>
        <p class="hero-sub">设定清晰的挑战目标与时间限制，通过课堂大屏实时验收全班同学的创意思维。</p>
      </div>
    </header>

    <div class="form-wrapper">
      <form @submit.prevent="handleSubmit" class="card-light form-layout">
        <div v-if="errorMessage" class="msg-error-banner">
          {{ errorMessage }}
        </div>

        <div class="field">
          <label class="field-label">任务名称</label>
          <input v-model="formData.title" type="text" placeholder="例如：设计一幅赛博朋克风格的海报" required class="field-input" />
        </div>

        <div class="field">
          <label class="field-label">考核模式</label>
          <div class="radio-tiles">
            <label class="radio-tile" :class="{ active: formData.type === 'PRACTICE' }">
              <input type="radio" v-model="formData.type" value="PRACTICE" class="sr-only" />
              <div class="tile-icon">🌱</div>
              <div class="tile-content">
                <h4>普通练习</h4>
                <p>无时间限制，适合日常作业与灵感探索。</p>
              </div>
              <div class="radio-circle"></div>
            </label>
            
            <label class="radio-tile" :class="{ active: formData.type === 'CHALLENGE' }">
              <input type="radio" v-model="formData.type" value="CHALLENGE" class="sr-only" />
              <div class="tile-icon">⚡️</div>
              <div class="tile-content">
                <h4>限时挑战</h4>
                <p>计入大屏动态，倒计时验收，适合随堂测试。</p>
              </div>
              <div class="radio-circle"></div>
            </label>
          </div>
        </div>

        <div class="field" v-if="formData.type === 'CHALLENGE'">
          <label class="field-label">挑战倒计时 (分钟)</label>
          <input v-model="formData.durationMin" type="number" min="1" max="120" required class="field-input" style="max-width: 240px;" />
        </div>

        <div class="field">
          <label class="field-label">详细要求与提示</label>
          <textarea v-model="formData.description" rows="3" placeholder="请详细描述学生需要完成的目标、考察的核心要点..." class="field-input"></textarea>
        </div>

        <div class="card-actions">
          <button type="button" @click="router.back()" class="btn-secondary">取消</button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? '正在发布...' : '确认发布' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ===== PAGE ROOT & HERO ===== */
.page-root { max-width: 720px; margin: 0 auto; padding-bottom: 0; display: flex; flex-direction: column; }
.hero-band { padding: 0 0 24px 0; flex-shrink: 0; }
.btn-back { background: none; border: none; color: var(--muted); display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; font-family: var(--font-inter); cursor: pointer; padding: 0; margin-bottom: 16px; transition: color 0.2s; }
.btn-back:hover { color: var(--ink); }
.hero-title { font-family: var(--font-serif); font-size: 36px; font-weight: 400; line-height: 1.1; letter-spacing: -0.5px; color: var(--ink); margin: 0 0 8px 0; }
.hero-sub { font-family: var(--font-inter); font-size: 15px; color: var(--muted); line-height: 1.5; margin: 0; font-weight: 400; }

/* ===== CARD & LAYOUT ===== */
.form-wrapper { width: 100%; flex: 1; }
.card-light { background: var(--surface-card); border-radius: var(--radius-lg); padding: 24px 32px; border: 1px solid var(--hairline); }
.form-layout { display: flex; flex-direction: column; gap: 16px; }

/* ===== FIELDS ===== */
.field { display: flex; flex-direction: column; gap: 12px; }
.field-label { font-size: 14px; font-weight: 600; color: var(--ink); font-family: var(--font-inter); }
.field-input { width: 100%; padding: 12px 16px; border: 1px solid var(--hairline); border-radius: var(--radius-md); background: white; font-size: 15px; color: var(--ink); font-family: var(--font-inter); transition: border-color 0.15s, box-shadow 0.15s; resize: vertical; }
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(204,120,92,0.15); }

/* ===== RADIO TILES ===== */
.radio-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.radio-tile { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: white; border: 1px solid var(--hairline); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease; position: relative; }
.radio-tile:hover { border-color: var(--primary-disabled); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.radio-tile.active { border-color: var(--primary); background: var(--surface-soft); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.tile-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }
.tile-content { flex: 1; }
.tile-content h4 { margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.tile-content p { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.5; }
.radio-circle { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--hairline); flex-shrink: 0; position: relative; transition: border-color 0.2s; }
.radio-tile.active .radio-circle { border-color: var(--primary); }
.radio-tile.active .radio-circle::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }

/* ===== BUTTONS & ACTIONS ===== */
.card-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 8px; padding-top: 24px; border-top: 1px solid var(--hairline); }
.btn-primary, .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 44px; border-radius: var(--radius-md); font-weight: 500; font-size: 14px; cursor: pointer; border: none; transition: background 0.15s, opacity 0.15s, box-shadow 0.15s; font-family: var(--font-inter); }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover:not(:disabled) { background: var(--primary-active); }
.btn-primary:disabled { background: var(--primary-disabled); color: var(--muted); cursor: not-allowed; }
.btn-secondary { background: white; color: var(--ink); border: 1px solid var(--hairline); }
.btn-secondary:hover:not(:disabled) { background: var(--surface-soft); }

.msg-error-banner { background: #fee2e2; color: #b91c1c; padding: 12px 16px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; }
</style>
