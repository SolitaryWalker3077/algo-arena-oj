import { ref } from 'vue'

// 主题偏好持久化键（index.html 防闪烁内联脚本中硬编码了同名键，修改时需同步）
export const THEME_STORAGE_KEY = 'admin-theme-mode'

// 仅支持用户手动选择浅色 / 深色。
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
}

const VALID_MODES = [THEME_MODE.LIGHT, THEME_MODE.DARK]

const readStoredMode = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    // 旧版 system 偏好或无效值统一回退为浅色，不再解析系统主题。
    return VALID_MODES.includes(stored) ? stored : THEME_MODE.LIGHT
  } catch {
    return THEME_MODE.LIGHT
  }
}

// 手动模式就是实际生效的主题；保留 effectiveTheme 入口供组件读取。
const mode = ref(readStoredMode())
const effectiveTheme = mode

let initialized = false
let transitionTimer = null
const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// 切换期间临时挂载过渡类（仅约 400ms），避免全局常驻 transition 带来的绘制开销
const runTransition = () => {
  if (prefersReducedMotion()) return
  const root = document.documentElement
  root.classList.add('theme-transition')
  clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 420)
}

// 将实际生效的明暗同步到 <html>：Element Plus 暗色变量与自定义 token 均以 html.dark 为开关
const applyTheme = (animated) => {
  if (typeof document === 'undefined' || !document?.documentElement) return
  const root = document.documentElement
  const isDark = effectiveTheme.value === THEME_MODE.DARK
  // 在颜色变化前启用过渡，避免浏览器先计算到新主题样式。
  if (animated) runTransition()
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = effectiveTheme.value
  // 与 index.html 内联脚本设置的首帧背景保持同步，避免切换后内联样式遗留旧值
  root.style.background = isDark ? '#141414' : '#f5f7fa'
}

const persistMode = () => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode.value)
  } catch {
    // 隐私模式等存储不可用场景下主题仍可在当前会话内切换
  }
}

// 应用启动早期初始化（main.js 挂载前调用）；index.html 内联脚本已提前设置初始 class 防闪烁
export const initTheme = () => {
  if (initialized || typeof window === 'undefined' || !window
    || typeof document === 'undefined' || !document?.documentElement) return
  initialized = true
  applyTheme(false)
}

// 销毁/HMR 时移除过渡计时器与临时类。
export const disposeTheme = () => {
  clearTimeout(transitionTimer)
  transitionTimer = null
  if (typeof document !== 'undefined') document?.documentElement?.classList.remove('theme-transition')
  initialized = false
}

export const setThemeMode = (nextMode) => {
  if (!VALID_MODES.includes(nextMode)) return
  const changed = nextMode !== mode.value
  mode.value = nextMode
  // 显式选择当前模式也要保存，支持首次选择默认的浅色模式。
  persistMode()
  applyTheme(changed)
}

// 组件统一入口：返回模块级单例 ref，任意组件读取到的都是同一份主题状态
export const useTheme = () => ({
  themeMode: mode,
  effectiveTheme,
  setThemeMode,
})

if (import.meta.hot) import.meta.hot.dispose(disposeTheme)
