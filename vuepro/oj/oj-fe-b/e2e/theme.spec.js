import { expect, test } from '@playwright/test'

const STORAGE_KEY = 'admin-theme-mode'
const labels = { light: '浅色模式', dark: '深色模式' }
const trigger = (page) => page.getByRole('button', { name: /主题切换/ })

// 等待原生系统主题通知完成，再验证页面保持手动主题。
const changeSystemTheme = async (page, colorScheme) => {
  const notification = page.evaluate((dark) => new Promise((resolve) => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    if (media.matches === dark) return resolve()
    const handler = () => {
      media.removeEventListener('change', handler)
      resolve()
    }
    media.addEventListener('change', handler)
  }), colorScheme === 'dark')
  await page.emulateMedia({ colorScheme })
  await notification
}

const chooseMode = async (page, mode) => {
  await trigger(page).click()
  await page.getByRole('menuitemradio', { name: labels[mode], exact: true }).click()
  await expect(page.getByRole('menu', { name: '选择主题模式' })).toBeHidden()
}

const expectTheme = async (page, theme) => {
  const root = page.locator('html')
  if (theme === 'dark') await expect(root).toHaveClass(/\bdark\b/)
  else await expect(root).not.toHaveClass(/\bdark\b/)
  await expect(root).toHaveCSS('color-scheme', theme)
  await expect(root).toHaveCSS('background-color', theme === 'dark' ? 'rgb(20, 20, 20)' : 'rgb(245, 247, 250)')
  await expect(trigger(page)).toHaveAttribute('aria-label', '主题切换，当前为' + labels[theme])
}

const expectSelectedMode = async (page, mode) => {
  await trigger(page).click()
  await expect(page.getByRole('menuitemradio')).toHaveCount(2)
  await expect(page.getByRole('menuitemradio', { name: '跟随系统', exact: true })).toHaveCount(0)
  for (const [value, label] of Object.entries(labels)) {
    await expect(page.getByRole('menuitemradio', { name: label, exact: true }))
      .toHaveAttribute('aria-checked', String(value === mode))
  }
  await page.getByRole('menuitemradio', { name: labels[mode], exact: true }).press('Escape')
  await expect(page.getByRole('menu', { name: '选择主题模式' })).toBeHidden()
}

test('系统深色时默认仍为浅色，菜单仅提供深浅两种模式', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/oj/login')
  await expectTheme(page, 'light')
  await expectSelectedMode(page, 'light')
  await changeSystemTheme(page, 'light')
  await changeSystemTheme(page, 'dark')
  await expectTheme(page, 'light')
})

test('手动深浅色切换，系统变化不改变页面或读屏状态', async ({ page }) => {
  await page.goto('/oj/login')
  await chooseMode(page, 'dark')
  await changeSystemTheme(page, 'dark')
  await changeSystemTheme(page, 'light')
  await expectTheme(page, 'dark')
  await expect(page.getByRole('status')).toHaveText('已切换为深色模式')
  await chooseMode(page, 'light')
  await changeSystemTheme(page, 'dark')
  await expectTheme(page, 'light')
  await expect(page.getByRole('status')).toHaveText('已切换为浅色模式')
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('light')
})

for (const mode of ['light', 'dark']) {
  test(mode + ' 偏好在刷新和新页面访问后恢复', async ({ page, context }) => {
    await page.goto('/oj/login')
    await chooseMode(page, mode)
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(mode)
    await page.emulateMedia({ colorScheme: mode === 'dark' ? 'light' : 'dark' })
    await page.reload()
    await expectTheme(page, mode)
    await expectSelectedMode(page, mode)
    const newPage = await context.newPage()
    await newPage.emulateMedia({ colorScheme: mode === 'dark' ? 'light' : 'dark' })
    await newPage.goto('/oj/login')
    await expectTheme(newPage, mode)
    await expectSelectedMode(newPage, mode)
  })
}

test('旧版 system 偏好回退浅色，重新选择后保存手动模式', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('admin-theme-mode', 'system'))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/oj/login')
  await expectTheme(page, 'light')
  await expectSelectedMode(page, 'light')
  await chooseMode(page, 'dark')
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('dark')
})

test('缺少 matchMedia 仍支持手动切换及刷新恢复', async ({ page }) => {
  await page.addInitScript(() => { window.matchMedia = undefined })
  await page.goto('/oj/login')
  await chooseMode(page, 'dark')
  await expectTheme(page, 'dark')
  await page.reload()
  await expectTheme(page, 'dark')
})

test('存储不可用时默认浅色，当前页面仍可手动切换', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError') }
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'QuotaExceededError') }
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/oj/login')
  await expectTheme(page, 'light')
  await chooseMode(page, 'dark')
  await expectTheme(page, 'dark')
  await page.reload()
  await expectTheme(page, 'light')
})

test('媒体查询受限时首屏仍恢复手动深色（应用脚本尚未执行）', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('admin-theme-mode', 'dark')
    window.matchMedia = () => { throw new Error('Media queries blocked') }
  })
  await page.route('**/assets/index-*.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }))
  await page.goto('/oj/login')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(20, 20, 20)')
})

test('手动主题过渡结束后移除临时类，减少动态效果时不启用过渡', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/oj/login')
  await chooseMode(page, 'dark')
  await expectTheme(page, 'dark')
  await expect(page.locator('html')).not.toHaveClass(/\btheme-transition\b/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await chooseMode(page, 'light')
  await expectTheme(page, 'light')
  await expect(page.locator('html')).not.toHaveClass(/\btheme-transition\b/)
})
