import { createRouter, createWebHistory } from 'vue-router'

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
      meta: { showBanner: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeLanding.vue'),
          meta: { showBanner: true },
        },
        {
          path: 'question',
          name: 'question',
          component: () => import('@/views/HomeLanding.vue'),
          meta: { showBanner: true },
        },
        {
          path: 'exam',
          name: 'exam',
          component: () => import('@/views/Exam.vue'),
          meta: { showBanner: true },
        },
        {
          path: 'exam/:examId/answer',
          name: 'contest-answer',
          component: () => import('@/views/ContestDestination.vue'),
          meta: { showBanner: false, contestMode: 'answer' },
        },
        {
          path: 'exam/:examId/practice',
          name: 'contest-practice',
          component: () => import('@/views/ContestDestination.vue'),
          meta: { showBanner: false, contestMode: 'practice' },
        },
        {
          path: 'exam/:examId/ranking',
          name: 'contest-ranking',
          component: () => import('@/views/ContestDestination.vue'),
          meta: { showBanner: false, contestMode: 'ranking' },
        },
      ],
    },
    {
      path: '/c-oj/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
})

export default router
