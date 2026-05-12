<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const filter = ref<'all' | 'my'>('all')
const gallery = ref<any[]>([])
const isLoading = ref(false)
const togglingLike = ref<string | null>(null)

const fetchGallery = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`http://localhost:8080/api/class-gallery?filter=${filter.value}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (data.success) {
      gallery.value = data.data
    }
  } catch (e) {
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchGallery()
})

const setFilter = (newFilter: 'all' | 'my') => {
  filter.value = newFilter
  fetchGallery()
}

const getValidImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `data:image/png;base64,${url}`
}

const handleToggleLike = async (genId: string) => {
  togglingLike.value = genId
  try {
    const res = await fetch(`http://localhost:8080/api/class-gallery/${genId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      await fetchGallery()
    }
  } finally {
    togglingLike.value = null
  }
}
</script>

<template>
  <div v-if="isLoading" style="padding: 48px; color: var(--muted);">加载中...</div>
  <div v-else style="max-width: 1200px; margin: 0 auto; padding-bottom: 64px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
      <div>
         <h1>班级画廊</h1>
         <p style="color: var(--muted);">在这里欣赏全班同学的精彩作品，互相学习提示词技巧。</p>
      </div>
      
      <div style="display: flex; gap: 8px; background: var(--surface-soft); padding: 4px; border-radius: 8px;">
         <button 
           @click="setFilter('all')"
           :style="{ 
             padding: '6px 16px', 
             borderRadius: '6px', 
             border: 'none', 
             background: filter === 'all' ? 'white' : 'transparent',
             color: filter === 'all' ? 'var(--ink)' : 'var(--muted)',
             boxShadow: filter === 'all' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
             cursor: 'pointer',
             fontWeight: filter === 'all' ? 500 : 400
           }"
         >
           全部作品
         </button>
         <button 
           @click="setFilter('my')"
           :style="{ 
             padding: '6px 16px', 
             borderRadius: '6px', 
             border: 'none', 
             background: filter === 'my' ? 'white' : 'transparent',
             color: filter === 'my' ? 'var(--ink)' : 'var(--muted)',
             boxShadow: filter === 'my' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
             cursor: 'pointer',
             fontWeight: filter === 'my' ? 500 : 400
           }"
         >
           我的作品
         </button>
      </div>
    </div>
    
    <div v-if="gallery.length === 0" class="glass-panel" style="padding: 3rem; text-align: center; color: var(--text-muted);">
       暂无班级作品，快去创作吧！
    </div>
    <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
       <div v-for="item in gallery" :key="item.id" class="glass-panel gallery-card">
          <div class="image-container">
             <img 
                :src="getValidImageUrl(item.outputImageUrl)" 
                :alt="item.prompt"
                class="gallery-image"
             />
          </div>
          <div style="padding: 1.2rem;">
             <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 12px;">
                   <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: var(--ink);">{{ item.user?.displayName || item.user?.username }}</h4>
                   <span style="font-size: 0.8rem; color: var(--muted); background: var(--surface-cream-strong); padding: 2px 6px; border-radius: 4px;">
                      {{ item.model?.name }}
                   </span>
                </div>
                <button 
                   class="like-button"
                   :class="{ liked: item.hasLiked }"
                   @click="handleToggleLike(item.id)"
                   :disabled="togglingLike === item.id"
                >
                   <span class="heart-icon">{{ item.hasLiked ? '❤️' : '🤍' }}</span>
                   <span class="like-count">{{ item.likeCount }}</span>
                </button>
             </div>
             <p class="prompt-text" :title="item.prompt">
                {{ item.prompt }}
             </p>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}
.gallery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}
.image-container {
  aspect-ratio: 1;
  background-color: var(--surface-soft);
  position: relative;
  overflow: hidden;
}
.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.gallery-card:hover .gallery-image {
  transform: scale(1.05);
}
.prompt-text {
  font-size: 0.85rem;
  color: var(--body);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.like-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-card);
  border: 1px solid var(--hairline);
  border-radius: 99px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.like-button:hover {
  background: var(--surface-cream-strong);
  transform: scale(1.05);
}
.like-button.liked {
  background: rgba(204, 120, 92, 0.1);
  border-color: rgba(204, 120, 92, 0.3);
  color: var(--primary);
}
.heart-icon {
  font-size: 1.1rem;
  line-height: 1;
}
.like-count {
  font-weight: 500;
  font-size: 0.9rem;
}
</style>
