import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
 history: createWebHistory(import.meta.env.BASE_URL),
 routes: [
  {
    path: '/c-oj/home',
    name: 'home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/c-oj/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
  },
 ]
})

export default router