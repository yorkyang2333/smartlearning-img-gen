<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  onSelectTemplate: (template: string) => void
  onClose: () => void
}>()

const authStore = useAuthStore()
const templates = ref<any[]>([])
const activeTemplate = ref<any>(null)
const variables = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:8080/api/student/templates', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      templates.value = data.data
    }
  } catch (e) {}
})

const handleSelectTemplate = (t: any) => {
  const matches = t.templateContent ? t.templateContent.match(/\{([^}]+)\}/g) : null
  if (matches && matches.length > 0) {
    const initialVars: Record<string, string> = {}
    matches.forEach((m: string) => {
      initialVars[m] = ''
    })
    variables.value = initialVars
    activeTemplate.value = t
  } else {
    props.onSelectTemplate(t.templateContent || '')
    props.onClose()
  }
}

const handleConfirm = () => {
  let finalPrompt = activeTemplate.value.templateContent || ''
  for (const key in variables.value) {
    const val = variables.value[key].trim() || key
    finalPrompt = finalPrompt.replaceAll(key, val)
  }
  props.onSelectTemplate(finalPrompt)
  props.onClose()
}
</script>

<template>
  <div class="ph-overlay">
    <div class="ph-modal">
      <div class="ph-header">
        <h2 class="ph-title">
          <div v-if="activeTemplate" style="display: flex; align-items: center; gap: 8px;">
            <button @click="activeTemplate = null" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0; color: inherit;">←</button>
            <span>填写模板</span>
          </div>
          <span v-else><span>📝</span> 提示词模板库</span>
        </h2>
        <button @click="onClose" class="ph-close">✕</button>
      </div>
      
      <div class="ph-content">
        <div v-if="activeTemplate" class="ph-filler">
          <div class="ph-card" style="margin-bottom: 16px;">
            <h3 class="ph-card-title">{{ activeTemplate.title }}</h3>
            <p class="ph-desc">{{ activeTemplate.description }}</p>
            <div class="ph-template">
              <template v-for="(part, i) in (activeTemplate.templateContent || '').split(/(\{.*?\})/)" :key="i">
                <span v-if="part.startsWith('{') && part.endsWith('}')" class="ph-var highlight">
                  {{ variables[part] || part }}
                </span>
                <template v-else>{{ part }}</template>
              </template>
            </div>
          </div>

          <div class="ph-vars-form" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <div v-for="(_val, vKey) in variables" :key="vKey" style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 14px; font-weight: 500; color: var(--on-dark);">{{ vKey.replace(/[{}]/g, '') }}</label>
              <input 
                type="text"
                v-model="variables[vKey]"
                :placeholder="`请输入 ${vKey.replace(/[{}]/g, '')}`"
                style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--surface-dark-elevated); background: var(--surface-dark-soft); color: var(--on-dark);"
              />
            </div>
          </div>

          <button class="ph-btn-use" @click="handleConfirm" style="width: 100%; padding: 12px;">
            完成并应用到输入框
          </button>
        </div>
        
        <div v-else-if="templates.length === 0" class="ph-empty">
          老师尚未发布任何模板
        </div>
        
        <div v-else class="ph-grid">
          <div v-for="t in templates" :key="t.id" class="ph-card">
            <div class="ph-card-header">
              <h3 class="ph-card-title">{{ t.title }}</h3>
              <span v-if="t.category" class="ph-badge">{{ t.category }}</span>
            </div>
            <p class="ph-desc">{{ t.description }}</p>
            
            <div class="ph-template">
              <template v-for="(part, i) in (t.templateContent || '').split(/(\{.*?\})/)" :key="i">
                <span v-if="part.startsWith('{') && part.endsWith('}')" class="ph-var">{{ part }}</span>
                <template v-else>{{ part }}</template>
              </template>
            </div>
            
            <button @click="handleSelectTemplate(t)" class="ph-btn-use">
              使用此模板
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ph-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.ph-modal {
  background: #1e1e1e;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid #2d2d2d;
  animation: slideDown 0.3s ease-out;
}

.ph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #2d2d2d;
}

.ph-title {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.ph-close {
  color: #a0a0a0;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  background: none;
  border: none;
}

.ph-close:hover {
  color: #fff;
}

.ph-content {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.ph-empty {
  text-align: center;
  color: #a0a0a0;
  padding: 2rem 0;
}

.ph-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.ph-card {
  background: #252525;
  border: 1px solid #2d2d2d;
  padding: 1.25rem;
  border-radius: 12px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.ph-card:hover {
  border-color: rgba(93, 184, 166, 0.5);
}

.ph-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.ph-card-title {
  font-weight: 600;
  color: #fff;
  margin: 0;
  font-size: 1rem;
}

.ph-badge {
  background: #1e1e1e;
  color: #a0a0a0;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.ph-desc {
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-bottom: 1rem;
  min-height: 2.5rem;
}

.ph-template {
  background: #1e1e1e;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #2d2d2d;
  font-family: monospace;
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ph-var {
  color: #5db8a6;
}

.ph-var.highlight {
  background: rgba(93, 184, 166, 0.2);
  padding: 0 4px;
  border-radius: 4px;
}

.ph-btn-use {
  width: 100%;
  padding: 0.5rem;
  background: rgba(93, 184, 166, 0.1);
  color: #5db8a6;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}

.ph-btn-use:hover {
  background: #5db8a6;
  color: #1e1e1e;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
