import { expect, test } from '@playwright/test'

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})
const contests = Array.from({ length: 12 }, (_, index) => ({
  title: `竞赛${index + 1}`,
  startTime: '2026-09-22T09:00:00',
  endTime: '2026-09-22T11:00:00',
  status: index % 2,
  createName: index % 2 ? '李四' : '张三',
  createTime: '2026-09-21 10:00:00',
}))

const setup = async (page, onList = () => {}) => {
  await page.addInitScript(() => localStorage.setItem('Admin-oj-b-key', 'e2e-token'))
  await page.route('**/system/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/sysuser/info'))
      return route.fulfill(json({ code: 1000, data: { nickName: '测试管理员' } }))
    if (url.pathname.endsWith('/exam/list')) {
      const override = onList(url)
      if (override) return route.fulfill(json(override))
      const title = url.searchParams.get('title') || ''
      const filtered = contests.filter((contest) => contest.title.includes(title))
      const pageNum = Number(url.searchParams.get('pageNum'))
      const pageSize = Number(url.searchParams.get('pageSize'))
      return route.fulfill(
        json({
          code: 1000,
          rows: filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize),
          total: filtered.length,
        }),
      )
    }
    throw new Error(`Unexpected API request: ${url.pathname}`)
  })
}

test('竞赛菜单导航、真实列表参数、筛选和只读操作', async ({ page }) => {
  const requests = []
  await setup(page, (url) => {
    requests.push(url)
    return null
  })
  await page.goto('/admin/home')
  await page.locator('.sidebar .el-menu-item').filter({ hasText: '竞赛管理' }).click()
  await expect(page).toHaveURL(/\/admin\/contest(?:\?|$)/)
  await expect(page.getByText('竞赛1', { exact: true })).toBeVisible()
  expect(requests[0].searchParams.get('pageNum')).toBe('1')
  expect(requests[0].searchParams.get('pageSize')).toBe('10')

  await page.getByRole('textbox', { name: '按竞赛标题搜索' }).fill('竞赛11')
  await expect(page).toHaveURL(/title=%E7%AB%9E%E8%B5%9B11/)
  await expect(page.getByText('竞赛11', { exact: true })).toBeVisible()
  await expect(page.getByText('竞赛1', { exact: true })).toHaveCount(0)
  await page.locator('.search-bar .el-select__wrapper').click()
  await page.getByRole('option', { name: '未发布' }).click()
  await expect(page).toHaveURL(/status=0/)
  await page.reload()
  await expect(page.getByText('竞赛11', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '删除' })).toBeDisabled()
  await page.getByRole('button', { name: '添加竞赛' }).click()
  await expect(page).toHaveURL('/admin/contest/new')
  await expect(page.getByText('当前后端只提供竞赛列表接口，暂无法保存竞赛')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存竞赛' })).toBeDisabled()
})

test('错误码提示和重试，四个响应式断点', async ({ page }) => {
  let fail = true
  await setup(page, () => {
    if (fail) {
      fail = false
      return { code: 2000, msg: '服务暂不可用' }
    }
    return null
  })
  await page.goto('/admin/contest')
  await expect(page.getByText(/错误码 2000.*服务暂不可用/)).toBeVisible()
  await page.getByRole('button', { name: '重试' }).first().click()
  await expect(page.getByText('竞赛1', { exact: true })).toBeVisible()

  for (const width of [320, 768, 1200, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.manage-table')).toBeVisible()
    await page.waitForTimeout(100)
    const dimensions = await page.evaluate(() => {
      const body = document.querySelector('.manage-table .el-table__body-wrapper')
      return {
        viewport: window.innerWidth,
        page: document.documentElement.scrollWidth,
        tableWidth: body?.clientWidth,
        tableContent: body?.scrollWidth,
      }
    })
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1)
    if (width >= 768) expect(dimensions.tableContent).toBeLessThanOrEqual(dimensions.tableWidth + 1)
    const actionButtons = page.locator('.row-actions').first().locator('button')
    await expect(actionButtons).toHaveCount(3)
    const tops = await actionButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().top),
    )
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1)
  }
})

test('自定义每页条数与题目管理共用控件和分页参数', async ({ page }) => {
  const requests = []
  await setup(page, (url) => {
    requests.push(url)
    return null
  })
  await page.goto('/admin/contest')
  await expect(page.getByText('竞赛1', { exact: true })).toBeVisible()
  await page.locator('.pagination-box .el-select__wrapper').click()
  await page.getByRole('textbox', { name: '自定义每页显示条数' }).fill('5')
  await page.getByRole('button', { name: '应用' }).click()
  await expect(page).toHaveURL(/size=5/)
  await expect(page.getByText('竞赛5', { exact: true })).toBeVisible()
  expect(requests.at(-1).searchParams.get('pageSize')).toBe('5')
  expect(requests.at(-1).searchParams.get('pageNum')).toBe('1')
  await page.locator('.pagination-box .el-pager .number').filter({ hasText: '3' }).click()
  await expect(page).toHaveURL(/current=3/)
  await expect(page.getByText('竞赛11', { exact: true })).toBeVisible()
  expect(requests.at(-1).searchParams.get('pageNum')).toBe('3')
})

test('开赛状态按开始与结束时刻展示', async ({ page }) => {
  const localTime = (offsetMs) => {
    const date = new Date(Date.now() + offsetMs)
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }
  const examples = [
    { title: '未来赛', startTime: localTime(3600000), endTime: localTime(7200000) },
    { title: '进行赛', startTime: localTime(-3600000), endTime: localTime(3600000) },
    { title: '结束赛', startTime: localTime(-7200000), endTime: localTime(-3600000) },
    { title: '异常赛', startTime: localTime(7200000), endTime: localTime(3600000) },
  ].map((contest) => ({
    ...contest,
    status: 0,
    createName: '测试管理员',
    createTime: localTime(-86400000),
  }))
  await setup(page, () => ({ code: 1000, rows: examples, total: examples.length }))
  await page.goto('/admin/contest')
  for (const [title, label] of [
    ['未来赛', '未开赛'],
    ['进行赛', '已开赛'],
    ['结束赛', '已结束'],
    ['异常赛', '时间异常'],
  ]) {
    await expect(
      page
        .locator('.el-table__body tr')
        .filter({ hasText: title })
        .getByText(label, { exact: true }),
    ).toBeVisible()
  }
})

test('切页失败时恢复上次成功的页码和列表', async ({ page }) => {
  await setup(page, (url) =>
    url.searchParams.get('pageNum') === '2' ? { code: 2000, msg: '分页暂不可用' } : null,
  )
  await page.goto('/admin/contest')
  await expect(page.getByText('竞赛1', { exact: true })).toBeVisible()
  await page.locator('.pagination-box .el-pager .number').filter({ hasText: '2' }).click()
  await expect(page.getByText(/当前仍展示上次成功获取的数据.*分页暂不可用/)).toBeVisible()
  await expect(page.getByText('竞赛1', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/current=1/)
})
