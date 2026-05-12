<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const generations = ref<any[]>([])
const totalCount = ref(0)
let timer: number | null = null

const fetchLiveFeed = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/live/feed', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.data) {
        totalCount.value = data.totalCount || 0
        generations.value = data.data
      }
    }
  } catch (e) {
    console.error('Failed to fetch live feed:', e)
  }
}

onMounted(() => {
  fetchLiveFeed()
  timer = setInterval(fetchLiveFeed, 3000) as any
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const getValidImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `data:image/png;base64,${url}`;
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1 class="title">
        📺 课堂大屏直播 <span class="liveBadge">LIVE</span>
      </h1>
      <div class="stats">
        <div class="statItem">
          <span class="statLabel">全班已生成</span>
          <span class="statValue">{{ totalCount }} 张</span>
        </div>
        <div class="statItem">
           <span class="statLabel">展示中</span>
           <span class="statValue">{{ generations.length }} 张</span>
        </div>
      </div>
    </header>

    <div class="grid">
      <div v-for="gen in generations" :key="gen.id" class="card">
        <div class="imageWrapper">
           <img :src="getValidImageUrl(gen.outputImageUrl)" :alt="gen.prompt" class="image" />
        </div>
        <div class="cardInfo">
           <p class="prompt">{{ gen.prompt }}</p>
           <div class="meta">
              <span class="author">👤 {{ gen.user?.displayName || '未知' }}</span>
              <span class="time">{{ new Date(gen.createdAt).toLocaleTimeString() }}</span>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 2rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--canvas, #faf9f5);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  font-family: var(--font-serif, "Cormorant Garamond", serif);
  color: var(--color-ink, #141413);
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0;
}

.liveBadge {
  background-color: var(--color-coral, #ff6b6b);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  animation: pulse 2s infinite;
  letter-spacing: 1px;
}

.stats {
  display: flex;
  gap: 2rem;
  background: white;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid var(--color-sand, #e8e6df);
}

.statItem {
  display: flex;
  flex-direction: column;
}

.statLabel {
  font-size: 0.8rem;
  color: var(--color-stone, #5a5a55);
}

.statValue {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-ink, #141413);
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  overflow-y: auto;
  padding-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid var(--color-sand, #e8e6df);
  animation: flyIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  opacity: 0;
  transform: translateY(40px) scale(0.95);
  display: flex;
  flex-direction: column;
}

.imageWrapper {
  aspect-ratio: 1;
  position: relative;
  background: var(--color-canvas, #faf9f5);
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.card:hover .image {
  transform: scale(1.05);
}

.cardInfo {
  padding: 1rem;
  background: white;
  z-index: 1;
}

.prompt {
  font-size: 0.95rem;
  color: var(--color-ink, #141413);
  margin-bottom: 0.8rem;
  margin-top: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-stone, #5a5a55);
}

.author {
  font-weight: 500;
  color: var(--color-coral, #ff6b6b);
}

.time {
  font-size: 0.75rem;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

@keyframes flyIn {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
