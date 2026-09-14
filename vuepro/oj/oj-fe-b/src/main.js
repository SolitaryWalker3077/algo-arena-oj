import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
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
// 全局注入中文语言包：分页/弹窗等 EP 组件文本汉化（共 X 条 / X 条/页 / 前往…页）
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
