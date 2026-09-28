import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { showBanner: true },
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
