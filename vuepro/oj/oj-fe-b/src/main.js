import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 官方暗色变量（html.dark 作用域生效，与项目主题开关对接）
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

// 挂载前初始化主题（index.html 内联脚本已防止首帧闪烁，这里完成状态与监听的接管）
initTheme()

const app = createApp(App)

app.use(router)
app.use(ElementPlus)

app.mount('#app')
