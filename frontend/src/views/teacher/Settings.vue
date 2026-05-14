<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const isSaving = ref(false)

const form = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  if (authStore.user) {
    form.value.username = authStore.user.username || ''
    form.value.displayName = authStore.user.displayName || ''
  }
})

const handleSave = async () => {
  if (form.value.password && form.value.password !== form.value.confirmPassword) {
    alert('两次输入的密码不一致！')
    return
  }

  isSaving.value = true
  try {
    const res = await fetch('http://localhost:8080/api/teacher/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        displayName: form.value.displayName,
        password: form.value.password
      })
    })

    const data = await res.json()
    if (res.ok && data.success) {
      alert('保存成功！')
      // Update local store
      authStore.setAuth(authStore.token!, data.user)
      form.value.password = ''
      form.value.confirmPassword = ''
    } else {
      alert(data.error || '保存失败')
    }
  } catch (e) {
    console.error(e)
    alert('网络错误')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="settings-container">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">个人设置</h1>
        <p class="editorial-subtitle">管理您的教师账号与个人信息</p>
      </div>
    </div>

    <div class="settings-content">
      <div class="glass-panel form-card">
        <h2 class="section-title">基本信息</h2>
        
        <div class="form-group">
          <label>登录账号 <span class="badge">不可修改</span></label>
          <input type="text" v-model="form.username" class="input readonly" readonly disabled />
          <p class="hint">用于登录系统的唯一凭证。</p>
        </div>

        <div class="form-group">
          <label>显示名称</label>
          <input type="text" v-model="form.displayName" class="input" placeholder="请输入姓名或昵称" />
          <p class="hint">学生将在系统界面和历史记录中看到此名称。</p>
        </div>
      </div>

      <div class="glass-panel form-card">
        <h2 class="section-title">安全设置</h2>
        
        <div class="form-group">
          <label>新密码</label>
          <input type="password" v-model="form.password" class="input" placeholder="如不修改请留空" />
        </div>

        <div class="form-group">
          <label>确认新密码</label>
          <input type="password" v-model="form.confirmPassword" class="input" placeholder="请再次输入新密码" />
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-primary" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? '保存中...' : '保存更改' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 4rem;
}

.page-header {
  margin-bottom: 1rem;
}

.editorial-title {
  font-family: 'Cormorant Garamond', 'Copernicus', 'Tiempos Headline', serif;
  font-size: 2.25rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.5px;
  margin: 0 0 0.5rem 0;
}

.editorial-subtitle {
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 1.05rem;
  color: var(--muted);
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-card {
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-family: 'Cormorant Garamond', 'Copernicus', serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0 0 1rem 0;
  border-bottom: 1px solid var(--hairline);
  padding-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-md);
  background: var(--canvas);
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 0.95rem;
  color: var(--ink);
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.1);
}

.input.readonly {
  background: var(--surface-soft);
  color: var(--muted);
  cursor: not-allowed;
  border-color: var(--hairline);
}

.hint {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  background: var(--surface-cream-strong);
  color: var(--muted);
  border-radius: 4px;
  font-weight: normal;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-md);
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(204, 120, 92, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #b0624a);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(204, 120, 92, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
