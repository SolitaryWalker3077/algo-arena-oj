import { ref } from 'vue'

// 主题偏好持久化键（index.html 防闪烁内联脚本中硬编码了同名键，修改时需同步）
export const THEME_STORAGE_KEY = 'admin-theme-mode'

// 三种模式：浅色 / 深色 / 跟随系统
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}

const VALID_MODES = [THEME_MODE.LIGHT, THEME_MODE.DARK, THEME_MODE.SYSTEM]

// 系统深浅色偏好媒体查询；不支持 matchMedia 的旧浏览器默认按浅色处理
const systemMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_MODES.includes(stored) ? stored : THEME_MODE.SYSTEM
  } catch {
    return THEME_MODE.SYSTEM
  }
}

// 用户选择的模式（持久化）与当前实际生效的明暗（system 模式下随系统解析）
const mode = ref(readStoredMode())
const effectiveTheme = ref(resolveTheme(mode.value))

let initialized = false
let transitionTimer = null

function resolveTheme(value) {
  if (value === THEME_MODE.DARK || value === THEME_MODE.LIGHT) return value
  return systemMedia?.matches ? THEME_MODE.DARK : THEME_MODE.LIGHT
}

const prefersReducedMotion = () => {
  try {
    return typeof window.matchMedia === 'function'
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
  const root = document.documentElement
  const isDark = effectiveTheme.value === THEME_MODE.DARK
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = effectiveTheme.value
  // 与 index.html 内联脚本设置的首帧背景保持同步，避免切换后内联样式遗留旧值
  root.style.background = isDark ? '#141414' : '#f5f7fa'
  if (animated) runTransition()
}

const persistMode = () => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode.value)
  } catch {
    // 隐私模式等存储不可用场景下主题仍可在当前会话内切换
  }
}

// 跟随系统模式时，操作系统主题变化需实时响应
const onSystemThemeChange = () => {
  if (mode.value !== THEME_MODE.SYSTEM) return
  effectiveTheme.value = resolveTheme(THEME_MODE.SYSTEM)
  applyTheme(true)
}

// 应用启动早期初始化（main.js 挂载前调用）；index.html 内联脚本已提前设置初始 class 防闪烁
export const initTheme = () => {
  if (initialized) return
  initialized = true
  applyTheme(false)
  if (systemMedia) {
    if (typeof systemMedia.addEventListener === 'function') {
      systemMedia.addEventListener('change', onSystemThemeChange)
    } else if (typeof systemMedia.addListener === 'function') {
      // Safari < 14 兼容
      systemMedia.addListener(onSystemThemeChange)
    }
  }
}

export const setThemeMode = (nextMode) => {
  if (!VALID_MODES.includes(nextMode) || nextMode === mode.value) return
  mode.value = nextMode
  effectiveTheme.value = resolveTheme(nextMode)
  persistMode()
  applyTheme(true)
}

// 组件统一入口：返回模块级单例 ref，任意组件读取到的都是同一份主题状态
export const useTheme = () => ({
  themeMode: mode,
  effectiveTheme,
  setThemeMode,
})
