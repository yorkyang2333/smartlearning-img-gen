<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Generation {
  id: string
  outputImageUrl: string
  prompt: string
  createdAt: string
  user: {
    displayName: string
  }
}

const generations = ref<Generation[]>([])
const totalCount = ref(0)
const loading = ref(true)
let pollInterval: number

const fetchFeed = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/live/feed', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.data) {
        
        // Merge without duplicates, keeping new ones at the top
        const currentIds = new Set(generations.value.map(g => g.id))
        const newGens = json.data.filter((g: Generation) => !currentIds.has(g.id))
        
        if (newGens.length > 0) {
          generations.value = [...newGens, ...generations.value].slice(0, 50)
        } else if (generations.value.length === 0) {
          generations.value = json.data
        }
        totalCount.value = json.totalCount
      }
    }
  } catch (e) {
    console.error("Failed to fetch live feed", e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFeed()
  // Poll every 3 seconds
  pollInterval = window.setInterval(fetchFeed, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="min-h-screen bg-black font-body text-white pb-24">
    <!-- Dark Mode Header for Live Screen -->
    <header class="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
        
        <div class="flex items-center gap-6">
          <button @click="router.push('/teacher/dashboard')" class="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span>&larr;</span> 退出大屏
          </button>
          <div class="flex items-center gap-3">
            <h1 class="font-display text-2xl tracking-tight">课堂生成直播</h1>
            <div class="flex items-center gap-1.5 bg-error/20 border border-error/30 text-error px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest">
              <span class="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              LIVE
            </div>
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="text-right">
            <div class="text-xs text-white/50 font-medium tracking-wide uppercase mb-0.5">全班生成</div>
            <div class="font-display text-2xl leading-none">{{ totalCount }}</div>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-right">
            <div class="text-xs text-white/50 font-medium tracking-wide uppercase mb-0.5">大屏展示</div>
            <div class="font-display text-2xl leading-none">{{ generations.length }}</div>
          </div>
        </div>

      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 mt-8">
      
      <div v-if="loading && generations.length === 0" class="flex flex-col items-center justify-center py-32 text-white/30">
        <svg class="w-12 h-12 mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>正在连接实时流...</p>
      </div>

      <div v-else-if="generations.length === 0" class="text-center py-32 text-white/40">
        <div class="text-6xl mb-4 opacity-50">🖼️</div>
        <h2 class="font-display text-2xl mb-2">等待学生创作...</h2>
        <p>当学生在前端完成图像生成时，这里会实时滚动展示。</p>
      </div>

      <!-- Masonry-like Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div 
          v-for="gen in generations" 
          :key="gen.id"
          class="bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex flex-col group animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <!-- Image Container -->
          <div class="aspect-square bg-white/5 relative overflow-hidden">
            <img 
              v-if="gen.outputImageUrl" 
              :src="gen.outputImageUrl" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              alt="Generated"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-white/20">无图片数据</div>
            
            <!-- Overlay gradient -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
            
            <!-- Student badge overlaid on image -->
            <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div class="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <div class="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-[10px] font-bold text-white">
                  {{ gen.user.displayName.charAt(0) }}
                </div>
                <span class="text-sm font-medium text-white/90">{{ gen.user.displayName }}</span>
              </div>
              <div class="text-xs text-white/60 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 font-mono">
                {{ new Date(gen.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
              </div>
            </div>
          </div>
          
          <!-- Prompt area -->
          <div class="p-5 flex-grow bg-black/40">
            <p class="text-sm text-white/80 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
              "{{ gen.prompt }}"
            </p>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>
