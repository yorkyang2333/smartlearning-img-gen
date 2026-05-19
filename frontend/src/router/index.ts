import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/teacher/Dashboard.vue'
import Models from '../views/teacher/Models.vue'
import Assignments from '../views/teacher/Assignments.vue'
import Students from '../views/teacher/Students.vue'
import Templates from '../views/teacher/Templates.vue'
import Live from '../views/teacher/Live.vue'

import StudentLayout from '../views/student/StudentLayout.vue'
import Workspace from '../views/student/Workspace.vue'
import ClassGallery from '../views/student/ClassGallery.vue'
import StudentAssignments from '../views/student/StudentAssignments.vue'
import AssignmentDetail from '../views/student/AssignmentDetail.vue'
import AssignmentPlay from '../views/student/AssignmentPlay.vue'

import Gallery from '../views/Gallery.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/teacher',
      component: () => import('../views/teacher/TeacherLayout.vue'),
      meta: { requiresAuth: true, role: 'TEACHER' },
      children: [
        {
          path: '',
          redirect: '/teacher/dashboard'
        },
        {
          path: 'dashboard',
          name: 'teacher-dashboard',
          component: Dashboard
        },
        {
          path: 'models',
          name: 'teacher-models',
          component: Models
        },
        {
          path: 'assignments',
          name: 'teacher-assignments',
          component: Assignments
        },
        {
          path: 'assignments/new',
          name: 'teacher-assignment-new',
          component: () => import('../views/teacher/AssignmentNew.vue')
        },
        {
          path: 'assignments/:id',
          name: 'teacher-assignment-detail',
          component: () => import('../views/teacher/AssignmentDetail.vue')
        },
        {
          path: 'students',
          name: 'teacher-students',
          component: Students
        },
        {
          path: 'templates',
          name: 'teacher-templates',
          component: Templates
        },
        {
          path: 'live',
          name: 'teacher-live',
          component: Live
        },
        {
          path: 'settings',
          name: 'teacher-settings',
          component: () => import('../views/teacher/Settings.vue')
        }
      ]
    },
    {
      path: '/student',
      component: StudentLayout,
      meta: { requiresAuth: true, role: 'STUDENT' },
      children: [
        {
          path: '',
          redirect: '/student/generate'
        },
        {
          path: 'generate/:id?',
          name: 'student-generate',
          component: Workspace
        },
        {
          path: 'class-gallery',
          name: 'student-class-gallery',
          component: ClassGallery
        },
        {
          path: 'assignments',
          name: 'student-assignments',
          component: StudentAssignments
        },
        {
          path: 'assignments/:id',
          name: 'student-assignment-detail',
          component: AssignmentDetail
        },
        {
          path: 'assignments/:id/play',
          name: 'student-assignment-play',
          component: AssignmentPlay
        }
      ]
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: Gallery
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../views/Setup.vue')
    },
    {
      path: '/',
      redirect: '/login'
    }
  ]
})

import { useAuthStore } from '../stores/auth'

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.path === '/login' || to.path === '/setup' || to.path === '/') {
    const initialized = await authStore.checkSystemStatus()
    if (!initialized && to.path !== '/setup') {
      return next('/setup')
    }
    if (initialized && to.path === '/setup') {
      return next('/login')
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/generate')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/generate')
  } else {
    next()
  }
})

export default router
