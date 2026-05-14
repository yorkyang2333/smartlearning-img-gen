<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isCollapsed = ref(false)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleSettings = () => {
  router.push('/teacher/settings')
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
          to="/teacher/dashboard" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '工作台' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </span>
          <span class="navText">工作台</span>
        </router-link>
        <router-link 
          to="/teacher/assignments" 
          class="navItem"
          :class="{ active: route.path.startsWith('/teacher/assignments') }"
          :title="isCollapsed ? '教学任务' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </span>
          <span class="navText">教学任务</span>
        </router-link>
        <router-link 
          to="/teacher/students" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '学生管理' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </span>
          <span class="navText">学生管理</span>
        </router-link>

        <router-link 
          to="/teacher/templates" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '模板配置' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </span>
          <span class="navText">模板配置</span>
        </router-link>
        <router-link 
          to="/teacher/models" 
          class="navItem"
          active-class="active"
          :title="isCollapsed ? '模型与配置' : ''"
        >
          <span class="navIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
          </span>
          <span class="navText">模型与配置</span>
        </router-link>
      </nav>

      <div class="userProfile">
        <div class="userInfo">
          <span class="userName">{{ authStore.user?.displayName || authStore.user?.username }}</span>
          <span class="userRole">教师</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button 
            @click="handleSettings" 
            class="logoutBtn"
            style="color: var(--ink);"
            title="个人设置"
          >
            <span class="logoutIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
            <span class="logoutText">个人设置</span>
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
  min-height: 100vh;
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

.collapsed {
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
}

.collapseToggle:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.brand {
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
}

.collapsed .brand {
  padding: 0;
  display: flex;
  justify-content: center;
}

.brandTitle {
  display: flex;
  align-items: center;
}

.collapsed .brandTitle {
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

.collapsed .brandText {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
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

.collapsed .navItem {
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
  transition: all 0.3s ease;
}

.collapsed .navText {
  opacity: 0;
  max-width: 0;
  margin-left: 0;
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

.collapsed .userInfo {
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
}

.logoutBtn:hover {
  background: var(--surface-cream-strong);
}

.logoutIcon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.collapsed .logoutBtn {
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

.collapsed .logoutText {
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
