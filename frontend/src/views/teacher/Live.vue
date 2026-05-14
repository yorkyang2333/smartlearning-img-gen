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

const isFullscreen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.value?.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
})
</script>

<template>
  <div class="container" ref="containerRef">
    <header class="live-header">
      <div class="header-left">
        <h1 class="live-title">
          课堂大屏直播 <span class="badge-coral">LIVE</span>
        </h1>
      </div>
      <div class="header-right">
        <div class="stats-card">
          <div class="stat-item">
            <span class="stat-label">全班已生成</span>
            <span class="stat-value">{{ totalCount }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
             <span class="stat-label">展示中</span>
             <span class="stat-value">{{ generations.length }}</span>
          </div>
        </div>
        <button @click="toggleFullscreen" class="btn-fullscreen" title="全屏展示">
          <svg v-if="!isFullscreen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
        </button>
      </div>
    </header>

    <div class="grid" v-if="generations.length > 0">
      <div v-for="gen in generations" :key="gen.id" class="card">
        <div class="imageWrapper">
           <img :src="getValidImageUrl(gen.outputImageUrl)" :alt="gen.prompt" class="image" />
        </div>
        <div class="cardInfo">
           <p class="prompt">{{ gen.prompt }}</p>
           <div class="meta">
              <span class="author" style="display: flex; align-items: center; gap: 4px;">
                {{ gen.user?.displayName || '未知' }}
              </span>
              <span class="time">{{ new Date(gen.createdAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) }}</span>
           </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <div class="empty-icon">
      </div>
      <p>等待学生创作中...</p>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--canvas);
  color: var(--ink);
  overflow: hidden;
  box-sizing: border-box;
}

.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.live-title {
  font-family: 'Cormorant Garamond', 'Copernicus', 'Tiempos Headline', serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.3px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--ink);
}

.badge-coral {
  background-color: var(--primary);
  color: var(--on-primary);
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  padding: 4px 12px;
  border-radius: 9999px;
  text-transform: uppercase;
  animation: pulse 2s infinite;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-card {
  display: flex;
  align-items: center;
  background: var(--surface-card);
  padding: 8px 24px;
  border-radius: var(--radius-full, 9999px);
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-label {
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
}

.stat-value {
  font-family: 'Copernicus', 'Tiempos Headline', serif;
  font-size: 22px;
  font-weight: 400;
  color: var(--ink);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--hairline);
}

.btn-fullscreen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
  background: var(--canvas);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fullscreen:hover {
  background: var(--surface-card);
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-auto-rows: max-content;
  align-items: start;
  gap: 24px;
  overflow-y: auto;
  padding-bottom: 2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--muted-soft) var(--canvas);
}

.grid::-webkit-scrollbar {
  width: 6px;
}
.grid::-webkit-scrollbar-track {
  background: transparent;
}
.grid::-webkit-scrollbar-thumb {
  background-color: var(--muted-soft);
  border-radius: 10px;
}

.card {
  background: var(--surface-card);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: flyIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}

.imageWrapper {
  aspect-ratio: 1;
  width: 100%;
  flex-shrink: 0;
  background: var(--surface-dark-soft, #1f1e1b);
  overflow: hidden;
  position: relative;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card:hover .image {
  transform: scale(1.05);
}

.cardInfo {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt {
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--ink);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
}

.author {
  color: var(--primary);
}

.time {
  color: var(--muted);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-family: 'StyreneB', 'Inter', sans-serif;
  font-size: 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@keyframes flyIn {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
