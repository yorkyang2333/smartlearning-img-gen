import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export interface Assignment {
  id: string
  teacherId: string
  title: string
  description: string
  deadline: string | null
  type: string
  durationMin: number | null
  status: string | null
  startedAt: string | null
  endedAt: string | null
  isActive: boolean
  maxSubmissions: number
  referenceImageUrl: string | null
  rubric: string | null
  promptHint: string | null
  createdAt: string
  updatedAt: string
  submissions?: Submission[]
  _count?: { submissions: number }
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  generationId: string
  imageUrl: string
  status: string
  score: number | null
  feedback: string | null
  prompt: string | null
  createdAt: string
  updatedAt: string
}

export interface GenerationItem {
  id: string
  userId: string
  modelId: string
  type: string
  prompt: string
  outputImageUrl: string
  size: string | null
  createdAt: string
}

export const useAssignmentStore = defineStore('assignments', () => {
  const assignments = ref<Assignment[]>([])
  const currentAssignment = ref<Assignment | null>(null)
  const submissions = ref<Submission[]>([])
  const loading = ref(false)

  const generations = ref<GenerationItem[]>([])
  const pendingCount = ref(0)

  function authHeaders() {
    const auth = useAuthStore()
    return {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json'
    }
  }

  // --- Teacher actions ---

  async function fetchTeacherAssignments() {
    loading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/teacher/assignments`, { headers: authHeaders() })
      if (res.ok) {
        assignments.value = await res.json()
      }
    } finally {
      loading.value = false
    }
  }

  async function createAssignment(payload: Partial<Assignment>): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/teacher/assignments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    })
    return res.ok
  }

  async function updateAssignment(id: string, payload: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/teacher/assignments/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      await fetchTeacherAssignments()
    }
    return res.ok
  }

  async function fetchSubmissions(assignmentId: string) {
    loading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/teacher/assignments/${assignmentId}/submissions`, { headers: authHeaders() })
      if (res.ok) {
        submissions.value = await res.json()
      }
    } finally {
      loading.value = false
    }
  }

  async function reviewSubmission(submissionId: string, score: number, feedback: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/teacher/submissions/${submissionId}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ score, feedback })
    })
    return res.ok
  }

  // --- Student actions ---

  async function fetchStudentAssignments() {
    loading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/student/assignments`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        assignments.value = data.data
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchAssignmentById(id: string) {
    loading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/student/assignments/${id}`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        currentAssignment.value = data.data
      }
    } finally {
      loading.value = false
    }
  }

  async function submitWork(assignmentId: string, generationId: string, imageUrl: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/api/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ generationId, imageUrl })
    })
    const data = await res.json()
    return { success: data.success, error: data.error }
  }

  async function fetchGenerations(keyword?: string) {
    const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
    const res = await fetch(`${API_BASE}/api/student/generations${params}`, { headers: authHeaders() })
    const data = await res.json()
    if (data.success) {
      generations.value = data.data
    }
  }

  async function fetchPendingCount() {
    const res = await fetch(`${API_BASE}/api/student/pending-count`, { headers: authHeaders() })
    const data = await res.json()
    if (data.success) {
      pendingCount.value = data.count
    }
  }

  return {
    assignments,
    currentAssignment,
    submissions,
    generations,
    pendingCount,
    loading,
    fetchTeacherAssignments,
    createAssignment,
    updateAssignment,
    fetchSubmissions,
    reviewSubmission,
    fetchStudentAssignments,
    fetchAssignmentById,
    submitWork,
    fetchGenerations,
    fetchPendingCount
  }
})