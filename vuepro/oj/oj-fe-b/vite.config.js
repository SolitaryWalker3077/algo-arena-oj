import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Nacos 中的网关路由匹配 /system/**，网关再剔除 /system 转发给 oj-system。
      '/system': {
        target: 'http://localhost:19090',
        changeOrigin: true,
      },
    },
  },
})
