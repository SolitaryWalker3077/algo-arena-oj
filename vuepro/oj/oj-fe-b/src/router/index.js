import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'

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
      path: '/admin/home',
      name: 'adminHome',
      component: () => import('../views/Home.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('adminToken')

  if (to.path.startsWith('/admin') && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && token) {
    return { name: 'adminHome' }
  }
})

export default router
