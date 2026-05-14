<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssignmentStore } from '../../stores/assignments'

const router = useRouter()
const store = useAssignmentStore()

const formData = ref({
  title: '',
  description: '',
  type: 'STANDARD',
  durationMin: 15,
  deadline: '',
  referenceImageUrl: '',
  rubric: '',
  promptHint: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const referencePreview = ref<string | null>(null)

const handleImageUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    formData.value.referenceImageUrl = base64
    referencePreview.value = base64
  }
  reader.readAsDataURL(file)
}

const removeReferenceImage = () => {
  formData.value.referenceImageUrl = ''
  referencePreview.value = null
}

const handleSubmit = async () => {
  if (!formData.value.title.trim()) {
    errorMessage.value = '请输入任务标题'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload: Record<string, unknown> = {
      title: formData.value.title,
      description: formData.value.description,
      type: formData.value.type,
      durationMin: formData.value.type === 'CHALLENGE' ? Number(formData.value.durationMin) : null,
      deadline: formData.value.type === 'STANDARD' && formData.value.deadline ? formData.value.deadline : null,
      referenceImageUrl: formData.value.referenceImageUrl || null,
      rubric: formData.value.rubric || null,
      promptHint: formData.value.promptHint || null
    }

    const ok = await store.createAssignment(payload)
    if (ok) {
      router.push('/teacher/assignments')
    } else {
      errorMessage.value = '发布任务失败'
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
            <label class="radio-tile" :class="{ active: formData.type === 'STANDARD' }">
              <input type="radio" v-model="formData.type" value="STANDARD" class="sr-only" />
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

        <div class="field" v-if="formData.type === 'STANDARD'">
          <label class="field-label">截止日期</label>
          <input v-model="formData.deadline" type="datetime-local" class="field-input" style="max-width: 300px;" />
        </div>

        <div class="field">
          <label class="field-label">详细要求与提示</label>
          <textarea v-model="formData.description" rows="3" placeholder="请详细描述学生需要完成的目标、考察的核心要点..." class="field-input"></textarea>
        </div>

        <div class="field">
          <label class="field-label">参考图片（可选）</label>
          <div v-if="referencePreview" class="ref-image-preview">
            <img :src="referencePreview" alt="参考图" />
            <button type="button" class="ref-remove-btn" @click="removeReferenceImage">移除</button>
          </div>
          <label v-else class="upload-area">
            <input type="file" accept="image/*" class="sr-only" @change="handleImageUpload" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span>点击上传参考图，帮助学生理解创作方向</span>
          </label>
        </div>

        <div class="field">
          <label class="field-label">评分标准（可选）</label>
          <textarea v-model="formData.rubric" rows="3" placeholder="例如：构图合理 30%、色彩搭配 30%、创意表达 40%" class="field-input"></textarea>
        </div>

        <div class="field">
          <label class="field-label">提示词引导（可选）</label>
          <textarea v-model="formData.promptHint" rows="2" placeholder="给学生的创作方向提示，例如：尝试使用赛博朋克、霓虹灯等关键词" class="field-input"></textarea>
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

/* ===== UPLOAD AREA ===== */
.upload-area { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; border: 2px dashed var(--hairline); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; color: var(--muted); text-align: center; }
.upload-area:hover { border-color: var(--primary); color: var(--primary); background: rgba(204,120,92,0.03); }
.upload-area span { font-size: 13px; }

.ref-image-preview { position: relative; display: inline-block; }
.ref-image-preview img { max-width: 200px; max-height: 150px; border-radius: var(--radius-md); border: 1px solid var(--hairline); }
.ref-remove-btn { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer; }
.ref-remove-btn:hover { background: var(--error); }
</style>
