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
  <div style="max-width: 800px; margin: 0 auto; padding-bottom: 64px;">
    <div class="page-header" style="margin-bottom: 32px;">
      <div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <button @click="router.back()" style="background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; font-size: 14px; gap: 4px;">
            &larr; 返回
          </button>
        </div>
        <h1 class="editorial-title">发布新任务</h1>
        <p class="editorial-subtitle">设定任务要求并发送给班级学生。</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="glass-panel" style="padding: 32px; display: flex; flex-direction: column; gap: 24px;">
      <div v-if="errorMessage" style="color: var(--error); background: rgba(220, 53, 69, 0.1); padding: 12px; border-radius: 6px; font-size: 14px;">
        {{ errorMessage }}
      </div>

      <div class="form-group">
        <label>任务标题</label>
        <input v-model="formData.title" type="text" placeholder="例如：设计一幅赛博朋克风格的海报" required class="input-field" />
      </div>

      <div class="form-group">
        <label>任务类型</label>
        <div style="display: flex; gap: 16px;">
          <label class="radio-label">
            <input type="radio" v-model="formData.type" value="PRACTICE" />
            <span>普通练习 (无时间限制)</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="formData.type" value="CHALLENGE" />
            <span>限时挑战 (计入大屏动态)</span>
          </label>
        </div>
      </div>

      <div class="form-group" v-if="formData.type === 'CHALLENGE'">
        <label>挑战时长 (分钟)</label>
        <input v-model="formData.durationMin" type="number" min="1" max="120" required class="input-field" style="max-width: 200px;" />
      </div>

      <div class="form-group">
        <label>任务描述与要求</label>
        <textarea v-model="formData.description" rows="5" placeholder="请详细描述学生需要完成的目标..." class="input-field"></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 16px; margin-top: 16px; border-top: 1px solid var(--hairline); padding-top: 24px;">
        <button type="button" @click="router.back()" class="btn btn-secondary">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? '正在发布...' : '确认发布' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-weight: 500;
  font-size: 14px;
  color: var(--ink);
}
.input-field {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  background: white;
  font-size: 14px;
  color: var(--ink);
  font-family: var(--font-inter);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(204,120,92,0.15);
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--ink);
}
</style>
