import { build, preview } from 'vite'

// 在生产产物上验收，避免开发工具自身的存储访问干扰受限存储用例。
await build()
await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } })
