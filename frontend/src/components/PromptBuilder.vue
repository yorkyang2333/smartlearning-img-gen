<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { promptCategories, type PromptElement } from '../lib/prompt-elements'

const props = defineProps<{
  currentPrompt: string
  onUpdatePrompt: (prompt: string) => void
  onClose: () => void
}>()

const selectedElements = ref<PromptElement[]>([])

const initSelection = () => {
  if (!props.currentPrompt) {
    selectedElements.value = []
    return
  }
  
  const matchedElements: PromptElement[] = []
  promptCategories.forEach(category => {
    category.elements.forEach(element => {
      if (props.currentPrompt.includes(element.en) || props.currentPrompt.includes(element.name)) {
        matchedElements.push(element)
      }
    })
  })
  
  selectedElements.value = matchedElements
}

onMounted(() => {
  initSelection()
})

watch(() => props.currentPrompt, () => {
  initSelection()
})

const toggleElement = (element: PromptElement) => {
  const isSelected = selectedElements.value.some(e => e.id === element.id)
  let newSelection
  
  if (isSelected) {
    newSelection = selectedElements.value.filter(e => e.id !== element.id)
  } else {
    newSelection = [...selectedElements.value, element]
  }
  
  selectedElements.value = newSelection
  updateTextPrompt(newSelection)
}

const updateTextPrompt = (elements: PromptElement[]) => {
  const newPrompt = elements.map(e => e.en).join(', ')
  props.onUpdatePrompt(newPrompt)
}

const clearSelection = () => {
  selectedElements.value = []
  props.onUpdatePrompt('')
}
</script>

<template>
  <div class="prompt-builder-container">
    <div class="pb-header">
      <div class="pb-title">
        <span class="pb-icon">🧩</span> 知识图谱式构建器
      </div>
      <div class="pb-actions">
        <button class="pb-btn-text" @click="clearSelection">清除全部</button>
        <button class="pb-btn-close" @click="onClose">✕ 切换文本模式</button>
      </div>
    </div>

    <div class="pb-content">
      <div v-for="category in promptCategories" :key="category.id" class="pb-category">
        <h4 class="pb-category-title">{{ category.title }}</h4>
        <div class="pb-elements-grid">
          <button
            v-for="element in category.elements"
            :key="element.id"
            class="pb-element"
            :class="{ selected: selectedElements.some(e => e.id === element.id) }"
            @click="toggleElement(element)"
            :title="element.en"
          >
            <span class="pb-el-emoji">{{ element.emoji }}</span>
            <span class="pb-el-name">{{ element.name }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="pb-footer">
      <div class="pb-preview-label">实时预览：</div>
      <div class="pb-preview-text">
        <template v-if="selectedElements.length > 0">
          <span v-for="e in selectedElements" :key="e.id" class="pb-preview-tag">
            {{ e.emoji }} {{ e.name }}
          </span>
        </template>
        <span v-else class="pb-preview-empty">点击上方标签组合您的创意提示词...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-builder-container {
  background: var(--surface-cream-strong);
  border: 1px solid var(--primary-light);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(204, 120, 92, 0.08);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.pb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(204, 120, 92, 0.05);
  border-bottom: 1px solid var(--hairline);
}

.pb-title {
  font-weight: 600;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.pb-actions {
  display: flex;
  gap: 12px;
}

.pb-btn-text, .pb-btn-close {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.pb-btn-text {
  color: var(--muted);
}
.pb-btn-text:hover {
  background: rgba(0,0,0,0.05);
  color: var(--text);
}

.pb-btn-close {
  color: var(--primary);
  font-weight: 500;
  background: rgba(204, 120, 92, 0.1);
}
.pb-btn-close:hover {
  background: rgba(204, 120, 92, 0.2);
}

.pb-content {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pb-category-title {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 8px 0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pb-elements-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pb-element {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  transition: all 0.2s;
}

.pb-element:hover {
  border-color: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.pb-element.selected {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(204, 120, 92, 0.3);
}

.pb-footer {
  padding: 12px 16px;
  background: var(--canvas);
  border-top: 1px dashed var(--hairline);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pb-preview-label {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  padding-top: 4px;
}

.pb-preview-text {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pb-preview-empty {
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
  padding-top: 2px;
}

.pb-preview-tag {
  background: rgba(204, 120, 92, 0.1);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
</style>
