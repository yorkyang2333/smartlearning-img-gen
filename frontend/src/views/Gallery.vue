<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Generation {
  id: string
  prompt: string
  outputImageUrl: string
  userId: string
  createdAt: string
  likes: number
}

const images = ref<Generation[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    // Mock API call for now
    // const res = await fetch('http://localhost:8080/api/gallery')
    // images.value = await res.json()
    images.value = [
      { id: '1', prompt: 'A futuristic city at sunset', outputImageUrl: 'https://via.placeholder.com/400', userId: 'user1', createdAt: new Date().toISOString(), likes: 12 },
      { id: '2', prompt: 'A cute cat reading a book', outputImageUrl: 'https://via.placeholder.com/400', userId: 'user2', createdAt: new Date().toISOString(), likes: 45 },
    ]
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="p-xl max-w-7xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4 max-w-2xl mx-auto">
      <h1 class="font-display text-display-lg text-ink tracking-tight">Community Gallery</h1>
      <p class="text-body-md text-muted">Explore inspiring creations from our students and learn from their prompts.</p>
    </div>

    <!-- Gallery Grid -->
    <div v-if="loading" class="flex justify-center py-20">
      <p class="text-muted">Loading gallery...</p>
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="img in images" :key="img.id" class="bg-surface-card rounded-lg overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <!-- Image Mockup -->
        <div class="aspect-square bg-surface-soft relative">
           <img :src="img.outputImageUrl" class="w-full h-full object-cover" alt="Generated image" />
        </div>
        
        <!-- Info -->
        <div class="p-4 space-y-3">
          <p class="text-body-sm text-ink line-clamp-2">"{{ img.prompt }}"</p>
          <div class="flex justify-between items-center pt-2 border-t border-hairline">
            <span class="text-caption text-muted">Student Art</span>
            <button class="flex items-center gap-1 text-muted hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <span class="text-caption">{{ img.likes }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
