import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/cookie'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
  routes: [
    {
      path: '/',
      redirect: { name: 'home' },
    },
    {
      path: '/c-oj',
      redirect: { name: 'home' },
    },
    {
      path: '/c-oj/home',
      component: () => import('@/views/Home.vue'),
      children: [
        {
          path: '',
          name: 'home',
          redirect: { name: 'question' },
        },
        {
          path: 'question',
          name: 'question',
          component: () => import('@/views/Question.vue'),
          meta: { showBanner: true },
        },
        {
          path: 'exam',
          name: 'exam',
          component: () => import('@/views/Exam.vue'),
          meta: { showBanner: true },
        },
        {
          path: 'user/exam',
          name: 'user-exam',
          redirect: { name: 'exam', query: { view: 'mine' } },
        },
        {
          path: 'user/message',
          alias: '/c-oj/home/message',
          name: 'user-message',
          component: () => import('@/views/UserMessage.vue'),
          meta: { showBanner: false, requiresAuth: true },
        },
        {
          path: 'user/detail',
          alias: '/c-oj/home/user',
          name: 'user-detail',
          component: () => import('@/views/UserDetail.vue'),
          meta: { showBanner: false, requiresAuth: true },
        },
      ],
    },
    {
      path: '/c-oj/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/c-oj/answer',
      name: 'answer',
      component: () => import('@/views/Answer.vue'),
      meta: { requiresAuth: true, fullscreen: true },
    },
    {
      path: '/c-oj/anwser',
      redirect: (to) => ({ name: 'answer', query: to.query }),
    },
    {
      path: '/c-oj/home/exam/:examId/answer',
      name: 'contest-answer',
      component: () => import('@/views/Answer.vue'),
      meta: { contestMode: 'answer', requiresAuth: true, fullscreen: true },
    },
    {
      path: '/c-oj/home/exam/:examId/practice',
      name: 'contest-practice',
      component: () => import('@/views/Answer.vue'),
      meta: { contestMode: 'practice', requiresAuth: true, fullscreen: true },
    },
    {
      path: '/c-oj/home/exam/:examId/ranking',
      name: 'contest-ranking',
      component: () => import('@/views/ContestRanking.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
