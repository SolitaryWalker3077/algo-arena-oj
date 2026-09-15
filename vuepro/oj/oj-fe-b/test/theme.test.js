import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { isRef } from 'vue'

const STORAGE_KEY = 'admin-theme-mode'
let moduleId = 0
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const bootScript = html.match(/<script>([\s\S]*?)<\/script>/)[1]

const createEventTarget = () => {
  const listeners = new Map()
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(handler)
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler) },
    dispatch(type, event = {}) {
      for (const handler of listeners.get(type) ?? []) handler(event)
    },
  }
}

const createBrowser = ({ stored = null, dark = false, reduced = true } = {}) => {
  const classes = new Set()
  const values = new Map(stored === null ? [] : [[STORAGE_KEY, stored]])
  const writes = []
  const queries = []
  const root = {
    style: {},
    themeWrites: 0,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle(name, enabled) {
        root.themeWrites++
        if (enabled) classes.add(name)
        else classes.delete(name)
      },
    },
  }
  const storage = {
    writes,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      writes.push([key, value])
      values.set(key, value)
    },
  }
  const media = { matches: dark, ...createEventTarget() }
  const window = {
    ...createEventTarget(),
    localStorage: storage,
    matchMedia(query) {
      queries.push(query)
      return query === '(prefers-reduced-motion: reduce)' ? { matches: reduced } : media
    },
  }
  const document = { ...createEventTarget(), documentElement: root, visibilityState: 'visible' }
  return { window, document, media, root, storage, queries }
}

const loadTheme = async (t, browser) => {
  const originals = new Map(['window', 'document'].map((key) => [
    key, Object.getOwnPropertyDescriptor(globalThis, key),
  ]))
  for (const [key, value] of Object.entries({ window: browser.window, document: browser.document })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  let theme
  t.after(() => {
    theme?.disposeTheme()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  theme = await import('../src/utils/theme.js?test=' + moduleId++)
  return theme
}

const assertTheme = (theme, browser, expected) => {
  const state = theme.useTheme()
  assert.equal(isRef(state.themeMode), true)
  assert.equal(isRef(state.effectiveTheme), true)
  assert.equal(state.themeMode.value, expected)
  assert.equal(state.effectiveTheme.value, expected)
  assert.equal(browser.root.classList.contains('dark'), expected === 'dark')
  assert.equal(browser.root.style.colorScheme, expected)
  assert.equal(browser.root.style.background, expected === 'dark' ? '#141414' : '#f5f7fa')
}

for (const stored of [null, 'light', 'dark', 'system', 'invalid']) {
  for (const dark of [false, true]) {
    test('首屏及刷新恢复：存储 ' + stored + '，系统 ' + (dark ? 'dark' : 'light'), async (t) => {
      const browser = createBrowser({ stored, dark })
      const expected = stored === 'dark' ? 'dark' : 'light'
      vm.runInNewContext(bootScript, { window: browser.window, document: browser.document })
      const theme = await loadTheme(t, browser)
      assertTheme(theme, browser, expected)
      theme.initTheme()
      assertTheme(theme, browser, expected)
      assert.deepEqual(browser.queries, [])
    })
  }
}

test('手动深浅色切换持久化，系统变化及页面恢复不影响选择', async (t) => {
  const browser = createBrowser({ dark: true })
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  assertTheme(theme, browser, 'light')
  for (const mode of ['dark', 'light']) {
    theme.setThemeMode(mode)
    browser.media.matches = mode !== 'dark'
    browser.media.dispatch('change', { matches: browser.media.matches })
    browser.window.dispatch('pageshow', { persisted: true })
    browser.document.dispatch('visibilitychange')
    assertTheme(theme, browser, mode)
    assert.equal(browser.storage.getItem(STORAGE_KEY), mode)
  }
  assert.equal(browser.window.listeners.size, 0)
  assert.equal(browser.document.listeners.size, 0)
  assert.equal(browser.media.listeners.size, 0)
  assert.ok(browser.queries.every((query) => query === '(prefers-reduced-motion: reduce)'))
})

test('移除 system 模式，传入旧模式及无效值不会更改状态或持久化', async (t) => {
  const browser = createBrowser({ stored: 'dark' })
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  assert.deepEqual(theme.THEME_MODE, { LIGHT: 'light', DARK: 'dark' })
  for (const value of ['system', null, undefined, '', 'auto', 'DARK']) theme.setThemeMode(value)
  assertTheme(theme, browser, 'dark')
  assert.deepEqual(browser.storage.writes, [])
})

test('显式选择默认浅色也保存偏好', async (t) => {
  const browser = createBrowser()
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  theme.setThemeMode('light')
  assertTheme(theme, browser, 'light')
  assert.equal(browser.storage.getItem(STORAGE_KEY), 'light')
})

test('存储读取/写入异常时默认浅色，仍可在当前页面手动切换', async (t) => {
  const browser = createBrowser({ dark: true })
  browser.window.localStorage = {
    getItem() { throw new Error('SecurityError') },
    setItem() { throw new Error('QuotaExceededError') },
  }
  vm.runInNewContext(bootScript, { window: browser.window, document: browser.document })
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  assertTheme(theme, browser, 'light')
  theme.setThemeMode('dark')
  browser.window.dispatch('pageshow', { persisted: true })
  browser.document.dispatch('visibilitychange')
  assertTheme(theme, browser, 'dark')
})

for (const type of ['missing', 'throwing']) {
  test('matchMedia ' + type + ' 不影响手动主题与存储', async (t) => {
    const browser = createBrowser({ stored: 'dark' })
    if (type === 'missing') delete browser.window.matchMedia
    else browser.window.matchMedia = () => { throw new Error('Unsupported query') }
    vm.runInNewContext(bootScript, { window: browser.window, document: browser.document })
    const theme = await loadTheme(t, browser)
    theme.initTheme()
    assertTheme(theme, browser, 'dark')
    theme.setThemeMode('light')
    assertTheme(theme, browser, 'light')
    assert.equal(browser.storage.getItem(STORAGE_KEY), 'light')
  })
}

test('初始化幂等，清理及重新初始化均不注册系统或页面恢复监听', async (t) => {
  const browser = createBrowser({ stored: 'dark' })
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  theme.initTheme()
  assert.equal(browser.root.themeWrites, 1)
  theme.disposeTheme()
  theme.initTheme()
  assertTheme(theme, browser, 'dark')
  assert.equal(browser.root.themeWrites, 2)
  assert.equal(browser.window.listeners.size, 0)
  assert.equal(browser.document.listeners.size, 0)
  assert.deepEqual(browser.queries, [])
})

test('减少动态效果时手动切换不添加过渡类', async (t) => {
  const browser = createBrowser()
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  theme.setThemeMode('dark')
  assertTheme(theme, browser, 'dark')
  assert.equal(browser.root.classList.contains('theme-transition'), false)
})

test('手动切换添加过渡类，销毁清理过渡计时器和类名', async (t) => {
  const browser = createBrowser({ reduced: false })
  const theme = await loadTheme(t, browser)
  theme.initTheme()
  theme.setThemeMode('dark')
  assert.equal(browser.root.classList.contains('theme-transition'), true)
  theme.disposeTheme()
  assert.equal(browser.root.classList.contains('theme-transition'), false)
})

test('无 window/document 时可安全加载和初始化，默认浅色', async (t) => {
  const theme = await loadTheme(t, {})
  assert.doesNotThrow(() => theme.initTheme())
  assert.equal(theme.useTheme().themeMode.value, 'light')
  assert.equal(theme.useTheme().effectiveTheme.value, 'light')
})
