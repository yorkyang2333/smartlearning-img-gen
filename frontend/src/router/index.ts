import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/teacher/Dashboard.vue'
import Workspace from '../views/student/Workspace.vue'
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
      path: '/teacher/dashboard',
      name: 'teacher-dashboard',
      component: Dashboard,
      meta: { requiresAuth: true, role: 'TEACHER' }
    },
    {
      path: '/student/workspace',
      name: 'student-workspace',
      component: Workspace,
      meta: { requiresAuth: true, role: 'STUDENT' }
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
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    // If trying to access a route for a different role, redirect to appropriate home
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/workspace')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next(authStore.isTeacher ? '/teacher/dashboard' : '/student/workspace')
  } else {
    next()
  }
})

export default router
