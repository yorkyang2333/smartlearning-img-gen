<script setup lang="ts">
import { ref, onMounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAssignmentStore } from '../../stores/assignments'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const assignmentStore = useAssignmentStore()

const isCollapsed = ref(false)

provide('collapseSidebar', () => {
  isCollapsed.value = true
})
const conversations = ref<any[]>([])
const stats = ref<any>(null)

const fetchConversations = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/student/conversations', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      conversations.value = data.data
    }
  } catch (e) {}
}

const fetchAnalytics = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/student/analytics/student', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      stats.value = data.data
    }
  } catch (e) {}
}

onMounted(() => {
  fetchConversations()
  fetchAnalytics()
  assignmentStore.fetchPendingCount()
})

watch(() => route.fullPath, () => {
  fetchConversations()
})

const handleDelete = async (e: Event, id: string) => {
  e.preventDefault()
  if (!confirm('确定要删除这个对话吗？')) return
  try {
    await fetch(`http://localhost:8080/api/student/conversations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    await fetchConversations()
    if (route.path.includes(id)) {
      router.push('/student/generate')
    }
  } catch (err) {}
}

const handleChangePassword = async () => {
  const newPwd = prompt('请输入新密码：')
  if (newPwd) {
    try {
      const res = await fetch('http://localhost:8080/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({ password: newPwd })
      })
      const data = await res.json()
      if (data.error) alert('修改失败：' + data.error)
      else alert('修改成功！')
    } catch (e) {
      alert('网络错误')
    }
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dashboard-layout">
    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <button class="collapseToggle" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? '展开' : '折叠'">
         {{ isCollapsed ? '▶' : '◀' }}
      </button>

      <div class="brand">
        <div class="brandTitle">
          <span class="brandIcon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </span>
          <h2 class="brandText">SmartCanvas</h2>
        </div>
      </div>
      
      <nav class="nav">
        <router-link 
          to="/student/generate" 
          class="navItem"
          :class="{ active: route.path.startsWith('/student/generate') }"
          :title="isCollapsed ? '图片生成' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </span>
          <span class="navText">图片生成</span>
        </router-link>
        <router-link 
          to="/student/class-gallery" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '班级画廊' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </span>
          <span class="navText">班级画廊</span>
        </router-link>
        <router-link 
          to="/student/assignments" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '教学任务' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </span>
          <span class="navText">教学任务</span>
          <span v-if="assignmentStore.pendingCount > 0" class="nav-badge">{{ assignmentStore.pendingCount }}</span>
        </router-link>
      </nav>

      <div class="sidebarSection">
        <div class="conversationsHeader">
          <span>历史对话</span>
          <router-link to="/student/generate" class="newChatBtn" title="新对话" @click="fetchConversations">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </router-link>
        </div>

        <div class="conversationsList">
          <router-link 
            v-for="chat in conversations" 
            :key="chat.id"
            :to="'/student/generate/' + chat.id"
            class="chatItem"
            :class="{ active: route.path === `/student/generate/${chat.id}` }"
          >
            <span class="chatItemText">{{ chat.title }}</span>
            <button class="deleteBtn" @click="handleDelete($event, chat.id)" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </router-link>
        </div>
      </div>

      <div class="userProfile">
        <div class="userInfo">
          <span class="userName">{{ authStore.user?.displayName || authStore.user?.username }}</span>
          <span class="userRole">学生</span>
          <div v-if="!isCollapsed && stats" style="font-size: 11px; color: var(--muted); margin-top: 4px;">
            <div style="margin-bottom: 2px;">
               今日配额: {{ stats.todayCount }} / {{ stats.dailyLimit }} 次
            </div>
            <div>
               本周创作 {{ stats.thisWeekCount }} 次 · 总计 {{ stats.totalGenerations }} 次
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button 
            @click="handleChangePassword" 
            class="logoutBtn"
            style="color: var(--ink);"
            title="修改密码"
          >
            <span class="logoutIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
            <span class="logoutText">修改密码</span>
          </button>
          <button 
            @click="handleLogout" 
            class="logoutBtn"
            title="退出登录"
          >
            <span class="logoutIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
            <span class="logoutText">退出登录</span>
          </button>
        </div>
      </div>
    </aside>
    
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  border-right: 1px solid var(--hairline);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  transition: width 0.3s ease, padding 0.3s ease;
  position: relative;
}

.sidebar.collapsed {
  width: 80px;
  padding: 1.5rem 0.75rem;
}

.collapseToggle {
  position: absolute;
  top: 24px;
  right: -14px;
  width: 28px;
  height: 28px;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  z-index: 10;
  color: var(--muted);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s;
}

.collapseToggle:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.brand {
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
}

.sidebar.collapsed .brand {
  padding: 0;
  display: flex;
  justify-content: center;
}

.brandTitle {
  display: flex;
  align-items: center;
}

.sidebar.collapsed .brandTitle {
  justify-content: center;
  gap: 0;
}

.brandIcon {
  color: var(--primary);
  display: flex;
  align-items: center;
}

.brandText {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  margin: 0 0 0 12px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  max-width: 200px;
  opacity: 1;
  transition: all 0.3s ease;
}

.sidebar.collapsed .brandText {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.navItem {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  color: var(--text-body);
  transition: all 0.2s ease;
  text-decoration: none;
}

.sidebar.collapsed .navItem {
  padding: 12px;
  justify-content: center;
}

.navItem:hover {
  background: var(--surface-cream-strong);
  color: var(--ink);
}

.navItem.active {
  background: var(--primary);
  color: white;
}

.navIcon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.navText {
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  max-width: 200px;
  margin-left: 12px;
  opacity: 1;
  transition: opacity 0.3s ease, max-width 0.3s ease, margin-left 0.3s ease;
}

.sidebar.collapsed .navText {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
}

.nav-badge {
  background: var(--primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  margin-left: auto;
}
.sidebar.collapsed .nav-badge { display: none; }

.sidebarSection {
  transition: all 0.3s ease;
  opacity: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sidebar.collapsed .sidebarSection {
  opacity: 0;
  height: 0;
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.conversationsHeader {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem;
}

.newChatBtn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.newChatBtn:hover {
  background: var(--surface-cream-strong);
  color: var(--ink);
}

.conversationsList {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}

.chatItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  color: var(--text-body);
  transition: all 0.2s ease;
  text-decoration: none;
  font-size: 0.9rem;
}

.chatItemText {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.chatItem:hover {
  background: var(--surface-cream-strong);
  color: var(--ink);
}

.chatItem.active {
  background: rgba(204, 120, 92, 0.1);
  color: var(--primary);
  font-weight: 500;
}

.deleteBtn {
  opacity: 0;
  color: var(--muted);
  background: none;
  border: none;
  padding: 0.2rem;
  cursor: pointer;
  border-radius: 4px;
}

.deleteBtn:hover {
  color: var(--error);
  background: var(--canvas);
}

.chatItem:hover .deleteBtn {
  opacity: 1;
}

.userProfile {
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.userInfo {
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 200px;
  opacity: 1;
  transition: all 0.3s ease;
}

.sidebar.collapsed .userInfo {
  opacity: 0;
  max-width: 0;
  padding: 0;
}

.userName {
  font-weight: 600;
  color: var(--ink);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.userRole {
  font-size: 0.8rem;
  color: var(--muted);
}

.logoutBtn {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  color: var(--error);
  border-radius: var(--radius-md);
  transition: background 0.2s;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.logoutBtn:hover {
  background: var(--surface-cream-strong);
}

.logoutIcon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sidebar.collapsed .logoutBtn {
  justify-content: center;
  padding: 10px;
}

.logoutText {
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  max-width: 200px;
  margin-left: 12px;
  opacity: 1;
  transition: all 0.3s ease;
}

.sidebar.collapsed .logoutText {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
}

.main-content {
  flex: 1;
  padding: 48px;
  overflow-y: auto;
  height: 100vh;
  background: var(--canvas);
}
</style>
