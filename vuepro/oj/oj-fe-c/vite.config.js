import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
   proxy: {
    "/dev-api": {
       target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:19090/friend",
       rewrite: (p) => p.replace(/^\/dev-api/, ""),
    },
   },
  },  
})
