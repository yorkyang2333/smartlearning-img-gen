<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const activeTab = ref<'OVERVIEW' | 'MONITOR'>('OVERVIEW')
const selectedStudentId = ref<string | null>(null)

const stats = ref<any>(null)
const history = ref<any[]>([])
const loadingAnalytics = ref(true)
const loadingHistory = ref(true)

const fetchAnalytics = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/analytics', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      stats.value = data.data
    }
  } finally {
    loadingAnalytics.value = false
  }
}

const fetchHistory = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/teacher/history', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      history.value = data.data || []
    }
  } finally {
    loadingHistory.value = false
  }
}

const getValidImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `data:image/png;base64,${url}`;
};

onMounted(() => {
  fetchAnalytics()
  fetchHistory()
  setInterval(fetchHistory, 3000)
})

// Computed properties for template
import { computed } from 'vue'

const studentsMap = computed(() => {
  const map = new Map<string, { id: string, name: string, items: any[] }>()
  history.value.forEach((item: any) => {
    const sId = item.user?.id || 'unknown'
    const sName = item.user?.displayName || '未知学生'
    if (!map.has(sId)) {
      map.set(sId, { id: sId, name: sName, items: [] })
    }
    map.get(sId)!.items.push(item)
  })
  return map
})

const studentsList = computed(() => Array.from(studentsMap.value.values()))

const selectedStudent = computed(() => {
  if (studentsList.value.length > 0 && !selectedStudentId.value) {
    selectedStudentId.value = studentsList.value[0].id
  }
  return selectedStudentId.value ? studentsMap.value.get(selectedStudentId.value) : null
})

const chatItems = computed(() => {
  if (!selectedStudent.value) return []
  return [...selectedStudent.value.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

const maxTrend = computed(() => {
  if (!stats.value?.dailyTrend) return 1
  return Math.max(...stats.value.dailyTrend.map((t: any) => t.count), 1)
})
</script>

<template>
  <div :style="{ maxWidth: activeTab === 'OVERVIEW' ? '1200px' : '100%', margin: '0 auto', paddingBottom: '64px', height: activeTab === 'MONITOR' ? 'calc(100vh - 64px)' : 'auto' }">
    <div class="page-header">
      <div>
        <h1 class="editorial-title">工作台</h1>
        <p class="editorial-subtitle">全班数据与最新创作概览</p>
      </div>
      <div style="display: flex; gap: 16px; align-items: center;">
        <router-link to="/teacher/live" target="_blank" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
          📺 课堂大屏
        </router-link>
        <div style="display: flex; background: var(--surface-card); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--hairline);">
          <button 
            @click="activeTab = 'OVERVIEW'"
            :style="{ padding: '6px 16px', border: 'none', background: activeTab === 'OVERVIEW' ? 'var(--canvas)' : 'transparent', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, color: activeTab === 'OVERVIEW' ? 'var(--ink)' : 'var(--muted)', boxShadow: activeTab === 'OVERVIEW' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }"
          >数据概览</button>
          <button 
            @click="activeTab = 'MONITOR'"
            :style="{ padding: '6px 16px', border: 'none', background: activeTab === 'MONITOR' ? 'var(--canvas)' : 'transparent', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, color: activeTab === 'MONITOR' ? 'var(--ink)' : 'var(--muted)', boxShadow: activeTab === 'MONITOR' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }"
          >生成监控</button>
        </div>
      </div>
    </div>
    
    <div v-if="loadingAnalytics || loadingHistory" style="padding: 48px; color: var(--muted);">加载中...</div>
    <div v-else-if="!stats" style="padding: 48px; color: var(--error);">无法加载数据</div>
    
    <template v-else-if="activeTab === 'OVERVIEW'">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
        <div class="glass-panel" style="padding: 1.5rem;">
          <h3 style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">班级学生总数</h3>
          <div style="font-size: 2.5rem; font-weight: 600; color: var(--primary); letter-spacing: -1px;">
            {{ stats.totalStudents }}
          </div>
        </div>
        <div class="glass-panel" style="padding: 1.5rem;">
          <h3 style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">总生成次数</h3>
          <div style="font-size: 2.5rem; font-weight: 600; color: var(--ink); letter-spacing: -1px;">
            {{ stats.totalGenerations }}
          </div>
        </div>
        <div class="glass-panel" style="padding: 1.5rem;">
          <h3 style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">活跃模型数</h3>
          <div style="font-size: 2.5rem; font-weight: 600; color: var(--success); letter-spacing: -1px;">
            {{ stats.activeModels }}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 3rem;">
        <!-- 近7天生成趋势 -->
        <div class="glass-panel" style="padding: 2rem;">
          <h3 style="margin-top: 0; margin-bottom: 2rem; font-size: 1.1rem;">近 7 天创作活跃度</h3>
          <div style="display: flex; height: 200px; align-items: flex-end; gap: 16px; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; border-top: 1px dashed var(--hairline); z-index: 0;"></div>
            <div style="position: absolute; top: 50%; left: 0; right: 0; border-top: 1px dashed var(--hairline); z-index: 0;"></div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid var(--hairline); z-index: 0;"></div>
            
            <div v-for="(t, idx) in stats.dailyTrend" :key="idx" style="flex: 1; display: flex; flex-direction: column; align-items: center; z-index: 1;">
              <div class="chart-bar-container" style="width: 100%; display: flex; justify-content: center; height: 100%; align-items: flex-end; position: relative;">
                <div class="tooltip">{{ t.count }} 次</div>
                <div class="chart-bar" :style="{ width: '60%', height: `${(t.count / maxTrend) * 100}%`, background: (t.count / maxTrend) * 100 > 0 ? 'var(--primary)' : 'transparent', minHeight: (t.count / maxTrend) * 100 > 0 ? '4px' : '0', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }" />
              </div>
              <div style="margin-top: 12px; font-size: 0.8rem; color: var(--muted);">{{ t.date }}</div>
            </div>
          </div>
        </div>

        <!-- 模型偏好占比 -->
        <div class="glass-panel" style="padding: 2rem;">
          <h3 style="margin-top: 0; margin-bottom: 2rem; font-size: 1.1rem;">全班模型偏好</h3>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div v-if="stats.modelUsage.length === 0" style="color: var(--muted); text-align: center; padding: 2rem 0;">暂无数据</div>
            <div v-else v-for="(m, idx) in stats.modelUsage" :key="idx">
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
                <span>{{ m.name }}</span>
                <span style="font-weight: 500;">{{ m.count }} 次</span>
              </div>
              <div style="width: 100%; height: 8px; background: var(--surface-cream-strong); border-radius: 4px; overflow: hidden;">
                <div :style="{ width: `${(m.count / stats.totalGenerations) * 100}%`, height: '100%', background: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--accent-amber)' : 'var(--accent-teal)', borderRadius: '4px' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem;">最新创作动态</h2>
      <div class="glass-panel" style="overflow: hidden;">
        <div v-if="history.length === 0" style="padding: 3rem; text-align: center; color: var(--muted);">暂无生成记录</div>
        <table v-else style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--hairline); background: var(--surface-soft);">
              <th style="padding: 16px 24px; color: var(--muted); font-weight: 500; width: 15%;">学生</th>
              <th style="padding: 16px 24px; color: var(--muted); font-weight: 500; width: 20%;">模型</th>
              <th style="padding: 16px 24px; color: var(--muted); font-weight: 500; width: 45%;">提示词</th>
              <th style="padding: 16px 24px; color: var(--muted); font-weight: 500; width: 20%;">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in history.slice(0, 5)" :key="item.id" style="border-bottom: 1px solid var(--hairline-soft);">
              <td style="padding: 16px 24px; font-weight: 500;">{{ item.user?.displayName }}</td>
              <td style="padding: 16px 24px;">
                <span style="padding: 4px 8px; background: var(--surface-cream-strong); border-radius: 6px; font-size: 13px;">
                  {{ item.model?.name }}
                </span>
              </td>
              <td style="padding: 16px 24px;">
                <div style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;" :title="item.prompt">
                  {{ item.prompt }}
                </div>
              </td>
              <td style="padding: 16px 24px; color: var(--muted); font-size: 14px;">{{ new Date(item.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="history.length > 5" style="padding: 16px; text-align: center; border-top: 1px solid var(--hairline); background: var(--surface-soft);">
          <button @click="activeTab = 'MONITOR'" style="background: none; border: none; cursor: pointer; color: var(--primary); font-weight: 500; font-size: 14px;">
            查看完整记录 &rarr;
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="dual-pane-layout">
        <div class="students-list-pane">
          <h2 class="pane-title">活跃学生对话</h2>
          <div v-if="studentsList.length === 0" class="empty-text">暂无生成记录</div>
          <div v-else class="students-list">
            <button 
              v-for="student in studentsList" 
              :key="student.id"
              class="student-item" 
              :class="{ active: selectedStudentId === student.id }"
              @click="selectedStudentId = student.id"
            >
              <div class="student-avatar">{{ student.name.charAt(0).toUpperCase() }}</div>
              <div class="student-info">
                <div class="student-name">{{ student.name }}</div>
                <div class="student-meta">{{ student.items.length }} 条对话</div>
              </div>
            </button>
          </div>
        </div>

        <div class="chat-viewer-pane">
          <div v-if="selectedStudent" class="chat-container">
            <div class="chat-header">
              <h3>与 {{ selectedStudent.name }} 的对话记录</h3>
              <div class="live-indicator"><span class="pulse-dot"></span> 实时同步中</div>
            </div>
            
            <div class="messages-list">
              <div v-for="item in chatItems" :key="item.id" class="message-group">
                <div class="message-row user">
                  <div class="message-avatar">
                    <div class="user-avatar-placeholder">{{ selectedStudent.name.charAt(0).toUpperCase() }}</div>
                  </div>
                  <div class="message-content">
                    <div class="message-sender">{{ selectedStudent.name }} <span class="time-meta">{{ new Date(item.createdAt).toLocaleTimeString() }}</span></div>
                    <div class="bubble bubble-user">
                      {{ item.prompt }}
                      <div class="bubble-meta">模型: {{ item.model?.name }}</div>
                    </div>
                  </div>
                </div>

                <div class="message-row agent">
                  <div class="message-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div class="message-content">
                    <div class="message-sender">AI 助手</div>
                    <div class="image-result-card">
                      <img :src="getValidImageUrl(item.outputImageUrl)" alt="Generated" class="generated-image" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted); margin-bottom: 16px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <p>选择左侧学生以查看实时对话记录</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chart-bar-container { cursor: pointer; }
.chart-bar-container:hover .chart-bar { opacity: 0.8; }
.tooltip {
   position: absolute; top: -30px; background: white; color: var(--ink); border: 1px solid var(--hairline);
   padding: 4px 8px; border-radius: 6px; font-size: 12px; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.chart-bar-container:hover .tooltip { opacity: 1; }

.dual-pane-layout { display: flex; height: calc(100vh - 180px); gap: 24px; }
.students-list-pane { width: 280px; background: var(--surface-card); border-radius: var(--radius-lg); padding: 24px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
.pane-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--ink); margin-bottom: 24px; padding: 0 8px; }
.empty-text { color: var(--muted); padding: 0 8px; font-size: 14px; }
.students-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.student-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-md); background: transparent; transition: background 0.2s; text-align: left; border: none; cursor: pointer; }
.student-item:hover { background: rgba(20,20,19,0.04); }
.student-item.active { background: var(--canvas); box-shadow: 0 2px 8px rgba(20,20,19,0.04); }
.student-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 14px; }
.student-info { flex: 1; }
.student-name { font-weight: 500; color: var(--ink); font-size: 14px; }
.student-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.chat-viewer-pane { flex: 1; background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden; }
.chat-container { display: flex; flex-direction: column; height: 100%; }
.chat-header { padding: 16px 24px; border-bottom: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center; background: rgba(250, 249, 245, 0.9); backdrop-filter: blur(8px); z-index: 10; }
.chat-header h3 { font-size: 16px; font-weight: 500; margin: 0; font-family: var(--font-inter); color: var(--ink); }
.live-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent-teal); font-family: 'JetBrains Mono', monospace; }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-teal); animation: pulse 1.5s infinite; }
.messages-list { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; }
.message-group { display: flex; flex-direction: column; gap: 16px; }
.message-row { display: flex; gap: 16px; }
.message-avatar { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--surface-card); display: flex; align-items: center; justify-content: center; color: var(--ink); flex-shrink: 0; }
.user-avatar-placeholder { font-weight: 500; }
.message-content { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.message-sender { font-weight: 600; font-size: 14px; color: var(--ink); display: flex; align-items: baseline; gap: 8px; }
.time-meta { font-weight: 400; font-size: 12px; color: var(--muted); }
.bubble { font-size: 15px; line-height: 1.6; color: var(--ink); }
.bubble-user { background: var(--surface-card); padding: 12px 16px; border-radius: var(--radius-lg); border-top-left-radius: 4px; display: inline-block; max-width: fit-content; }
.bubble-meta { font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--hairline); padding-top: 6px; }
.image-result-card { margin-top: 4px; background: var(--surface-card); padding: 16px; border-radius: var(--radius-lg); display: inline-block; max-width: fit-content; border: 1px solid var(--hairline); }
.generated-image { max-width: 100%; border-radius: var(--radius-md); }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
