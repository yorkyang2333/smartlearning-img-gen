<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAssignmentStore } from '../../stores/assignments'

const store = useAssignmentStore()
const isLoading = ref(true)

const fetchAssignments = async () => {
  await store.fetchStudentAssignments()
  isLoading.value = false
}

const formatDeadline = (deadline: string | null) => {
  if (!deadline) return null
  return new Date(deadline).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const isOverdue = (deadline: string | null) => {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

const isUrgent = (deadline: string | null) => {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

onMounted(() => {
  fetchAssignments()
})
</script>

<template>
  <div v-if="isLoading" style="padding: 48px; color: var(--muted);">加载中...</div>
  <div v-else style="max-width: 800px; margin: 0 auto; padding-bottom: 64px;">
    <div style="margin-bottom: 32px;">
      <h1>教学任务</h1>
      <p style="color: var(--muted);">完成老师布置的创作挑战</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div v-for="assignment in store.assignments" :key="assignment.id" class="glass-panel" style="padding: 24px; position: relative; overflow: hidden;">
         <div v-if="assignment.submissions && assignment.submissions.length > 0" 
              style="position: absolute; top: 0; right: 0; padding: 4px 16px; color: white; font-size: 12px; border-bottom-left-radius: 12px;"
              :style="{ background: assignment.submissions[0].status === 'REVIEWED' ? 'var(--success)' : 'var(--primary)' }">
            {{ assignment.submissions[0].status === 'REVIEWED' ? `已评阅: ${assignment.submissions[0].score}分` : '已提交待评阅' }}
         </div>
         
         <div style="display: flex; justify-content: space-between; align-items: flex-start;">
           <div style="flex: 1; padding-right: 24px;" :style="{ marginTop: (assignment.submissions && assignment.submissions.length > 0) ? '8px' : '0' }">
             <h3 style="margin: 0; font-size: 20px; color: var(--ink); display: flex; align-items: center; gap: 8px;">
               {{ assignment.title }}
               <span v-if="assignment.type === 'CHALLENGE'" style="font-size: 12px; background: var(--accent-amber); color: #fff; padding: 2px 6px; border-radius: 4px;">限时挑战</span>
             </h3>
             <p style="color: var(--muted); margin-top: 8px; font-size: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
               {{ assignment.description }}
             </p>

             <div v-if="assignment.deadline && (!assignment.submissions || assignment.submissions.length === 0)"
                  style="margin-top: 8px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px;"
                  :style="{
                    background: isOverdue(assignment.deadline) ? 'rgba(239,68,68,0.1)' : isUrgent(assignment.deadline) ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.08)',
                    color: isOverdue(assignment.deadline) ? '#dc2626' : isUrgent(assignment.deadline) ? '#d97706' : 'var(--muted)'
                  }">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {{ isOverdue(assignment.deadline) ? '已逾期' : isUrgent(assignment.deadline) ? '即将截止' : '' }} 截止: {{ formatDeadline(assignment.deadline) }}
             </div>
             
             <div v-if="assignment.type === 'CHALLENGE' && assignment.status === 'ACTIVE' && assignment.startedAt && (!assignment.submissions || assignment.submissions.length === 0)" 
                  style="margin-top: 12px; padding: 6px 12px; background: rgba(245, 158, 11, 0.1); color: #d97706; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                挑战进行中，限时 {{ assignment.durationMin }} 分钟
             </div>

             <div v-if="assignment.submissions && assignment.submissions.length > 0 && assignment.submissions[0].feedback" 
                  style="margin-top: 12px; padding: 8px 12px; background: var(--surface-cream-strong); border-radius: 6px; font-size: 13px; border-left: 3px solid var(--primary);">
                <strong>老师评语：</strong>{{ assignment.submissions[0].feedback }}
             </div>
           </div>
           
           <div style="display: flex; flex-direction: column; gap: 8px; width: 120px;" :style="{ marginTop: (assignment.submissions && assignment.submissions.length > 0) ? '8px' : '0' }">
               <template v-if="assignment.type === 'CHALLENGE'">
                 <router-link :to="`/student/assignments/${assignment.id}/play`" 
                    class="btn"
                    :class="[ (assignment.submissions && assignment.submissions.length > 0) ? 'btn-secondary' : 'btn-primary' ]"
                    style="width: 100%;"
                    :style="{ 
                      background: (assignment.submissions && assignment.submissions.length > 0) ? '' : 'var(--accent-amber)', 
                      borderColor: (assignment.submissions && assignment.submissions.length > 0) ? '' : 'transparent', 
                      color: (assignment.submissions && assignment.submissions.length > 0) ? '' : '#fff', 
                      opacity: assignment.status === 'ENDED' && (!assignment.submissions || assignment.submissions.length === 0) ? 0.5 : 1, 
                      pointerEvents: assignment.status === 'ENDED' && (!assignment.submissions || assignment.submissions.length === 0) ? 'none' : 'auto' 
                    }">
                    {{ (assignment.submissions && assignment.submissions.length > 0) ? '查看作品' : assignment.status === 'ENDED' ? '挑战已结束' : '进入挑战' }}
                 </router-link>
              </template>
               <template v-else>
                 <router-link :to="`/student/assignments/${assignment.id}`" 
                    class="btn"
                    :class="[ (assignment.submissions && assignment.submissions.length > 0) ? 'btn-secondary' : 'btn-primary' ]"
                    style="width: 100%;">
                    {{ (assignment.submissions && assignment.submissions.length > 0) ? '查看详情' : '去创作' }}
                 </router-link>
              </template>
           </div>
         </div>
       </div>

      <div v-if="store.assignments.length === 0" class="glass-panel" style="text-align: center; padding: 64px; color: var(--muted);">
         当前没有活跃的教学任务。
      </div>
    </div>
  </div>
</template>
