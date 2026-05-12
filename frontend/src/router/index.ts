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
          path: 'generate',
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
        }
      ]
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: Gallery
    },
    {
      path: '/',
      redirect: '/login'
    }
  ]
})

import { useAuthStore } from '../stores/auth'

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    // If trying to access a route for a different role, redirect to appropriate home
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/generate')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/generate')
  } else {
    next()
  }
})

export default router
