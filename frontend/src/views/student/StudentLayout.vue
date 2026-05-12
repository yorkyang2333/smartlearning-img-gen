<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const conversations = ref<{id: string, title: string}[]>([])
const stats = ref({ todayCount: 0, dailyLimit: 0, thisWeekCount: 0, totalGenerations: 0 })

const fetchConversations = async () => {
  const res = await fetch('http://localhost:8080/api/student/conversations', {
    headers: { 'Authorization': `Bearer ${authStore.token}` }
  })
  if (res.ok) {
    const json = await res.json()
    conversations.value = json.data
  }
}

const fetchStats = async () => {
  const res = await fetch('http://localhost:8080/api/student/analytics/student', {
    headers: { 'Authorization': `Bearer ${authStore.token}` }
  })
  if (res.ok) {
    const json = await res.json()
    stats.value = json.data
  }
}

const newConversation = async () => {
  const res = await fetch('http://localhost:8080/api/student/conversations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authStore.token}` }
  })
  if (res.ok) {
    const json = await res.json()
    await fetchConversations()
    router.push(`/student/generate?chatId=${json.id}`)
  }
}

const deleteConversation = async (id: string) => {
  if (!confirm('确定删除此对话吗？')) return
  await fetch(`http://localhost:8080/api/student/conversations/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authStore.token}` }
  })
  await fetchConversations()
  if (route.query.chatId === id) {
    router.push('/student/generate')
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  fetchConversations()
  fetchStats()
})
</script>

<template>
  <div class="flex h-screen bg-canvas font-body text-ink overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-surface-card border-r border-hairline flex flex-col flex-shrink-0 transition-all duration-300">
      <div class="h-16 flex items-center px-6 border-b border-hairline">
        <h2 class="font-display text-xl tracking-tight font-bold">SmartCanvas</h2>
      </div>
      
      <nav class="p-4 space-y-1">
        <router-link to="/student/generate" class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors" :class="route.path === '/student/generate' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface-dark/5 hover:text-ink'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          图片生成
        </router-link>
        <router-link to="/student/class-gallery" class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors" :class="route.path === '/student/class-gallery' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface-dark/5 hover:text-ink'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          班级画廊
        </router-link>
        <router-link to="/student/assignments" class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors" :class="route.path === '/student/assignments' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-surface-dark/5 hover:text-ink'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          教学任务
        </router-link>
      </nav>

      <div class="flex-grow overflow-y-auto p-4 border-t border-hairline">
        <div class="flex items-center justify-between mb-4 px-2">
          <span class="text-xs font-bold text-muted uppercase tracking-wider">历史对话</span>
          <button @click="newConversation" class="text-muted hover:text-primary transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
        <div class="space-y-1">
          <div v-for="chat in conversations" :key="chat.id" class="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-dark/5 transition-colors text-sm cursor-pointer" :class="route.query.chatId === chat.id ? 'bg-surface-dark/5 text-ink font-medium' : 'text-muted'" @click="router.push(`/student/generate?chatId=${chat.id}`)">
            <span class="truncate pr-2">{{ chat.title }}</span>
            <button @click.stop="deleteConversation(chat.id)" class="opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-opacity">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-hairline bg-surface-dark/5">
        <div class="flex flex-col gap-1 mb-4">
          <div class="text-sm font-medium text-ink">{{ authStore.user?.displayName }}</div>
          <div class="text-xs text-muted">今日配额: {{ stats.todayCount }} / {{ stats.dailyLimit }} 次</div>
        </div>
        <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded border border-hairline text-sm font-medium text-muted hover:text-ink hover:bg-surface-card transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          退出登录
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto relative">
      <router-view :key="$route.fullPath"></router-view>
    </main>
  </div>
</template>
