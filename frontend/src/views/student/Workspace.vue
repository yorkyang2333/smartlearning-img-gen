<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const user = authStore.user
const prompt = ref('')

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="p-xl max-w-7xl mx-auto space-y-12">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="font-display text-display-md text-ink mb-2">Student Workspace</h1>
        <p class="text-muted text-body-md">Start creating with SmartCanvas, {{ user?.displayName || 'Student' }}.</p>
      </div>
      <button @click="handleLogout" class="text-muted hover:text-ink font-medium transition">
        Sign out
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Generator Column -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-surface-card rounded-lg p-xl space-y-6">
          <div>
            <label class="block text-title-sm text-ink mb-2">Prompt</label>
            <textarea 
              v-model="prompt"
              rows="4"
              class="w-full bg-canvas text-ink rounded-md border border-hairline p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-body-md resize-none"
              placeholder="Describe the image you want to generate..."
            ></textarea>
          </div>
          
          <div class="flex justify-end">
            <button class="bg-primary hover:bg-primary-active text-on-primary font-medium rounded-md h-10 px-8 transition-colors">
              Generate Image
            </button>
          </div>
        </div>

        <!-- Output Area (Dark Surface for Mockup feel) -->
        <div class="bg-surface-dark rounded-lg p-lg min-h-[400px] flex items-center justify-center border border-surface-dark-elevated">
           <p class="text-on-dark-soft font-mono text-sm">Your generation will appear here</p>
        </div>
      </div>

      <!-- AI Tutor Column -->
      <div class="bg-canvas border border-hairline rounded-lg flex flex-col h-[600px]">
        <div class="p-4 border-b border-hairline">
          <h3 class="text-title-sm text-ink flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-success block"></span>
            AI Tutor
          </h3>
        </div>
        
        <div class="flex-1 p-4 overflow-y-auto space-y-4">
          <div class="bg-surface-soft p-3 rounded-md max-w-[85%] text-body-sm text-ink">
            Hello! I'm your AI Tutor. Need help crafting a better prompt?
          </div>
        </div>

        <div class="p-4 border-t border-hairline bg-surface-card">
          <input 
            type="text" 
            class="w-full bg-canvas text-ink rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
            placeholder="Ask for suggestions..."
          />
        </div>
      </div>
    </div>
  </div>
</template>
