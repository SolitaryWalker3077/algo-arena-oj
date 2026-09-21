import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/oj/login',
    },
    {
      path: '/oj/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/admin',
      component: () => import('../layout/AdminLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/admin/home',
        },
        {
          path: 'home',
          name: 'adminHome',
          component: () => import('../views/Home.vue'),
        },
        {
          path: 'user',
          name: 'userManage',
          component: () => import('../views/admin/UserManage.vue'),
        },
        {
          path: 'problem',
          name: 'problemManage',
          component: () => import('../views/admin/ProblemManage.vue'),
        },
        {
          path: 'contest',
          name: 'contestManage',
          component: () => import('../views/admin/ContestManage.vue'),
        },
        {
          path: 'contest/new',
          name: 'contestCreate',
          component: () => import('../views/admin/ContestForm.vue'),
        },
        {
          path: 'contest/:examId/edit',
          name: 'contestEdit',
          component: () => import('../views/admin/ContestForm.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = getToken()

  if (to.path.startsWith('/admin') && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && token) {
    return { name: 'adminHome' }
  }
})

export default router
