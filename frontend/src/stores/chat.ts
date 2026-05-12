import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Message {
  role: 'user' | 'tutor'
  content: string
  timestamp: number
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isTyping = ref(false)

  function addMessage(role: 'user' | 'tutor', content: string) {
    messages.value.push({ role, content, timestamp: Date.now() })
  }

  function clearHistory() {
    messages.value = []
  }

  return { messages, isTyping, addMessage, clearHistory }
})
