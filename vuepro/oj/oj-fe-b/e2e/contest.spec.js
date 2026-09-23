import { expect, test } from '@playwright/test'

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})
const contests = Array.from({ length: 12 }, (_, index) => ({
  examId: String(9007199254740993000n + BigInt(index)),
  title: `竞赛${index + 1}`,
  startTime: '2999-09-22T09:00:00',
  endTime: '2999-09-22T11:00:00',
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
  await expect(page.getByRole('button', { name: '编辑' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '删除竞赛 竞赛11' })).toBeEnabled()
  await page.getByRole('button', { name: '添加竞赛' }).click()
  await expect(page).toHaveURL('/admin/contest/new')
  await expect(page.getByRole('button', { name: '保存基本信息' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '发布', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '暂不发布' })).toBeEnabled()
  await expect(page.getByLabel('竞赛标题')).toBeVisible()
})

test('发布与撤销发布防止重复提交并即时切换列表状态', async ({ page }) => {
  await setup(page)
  const publicationRequests = []
  await page.route('**/system/exam/publish?*', async (route) => {
    const url = new URL(route.request().url())
    publicationRequests.push({
      action: 'publish',
      method: route.request().method(),
      examId: url.searchParams.get('examId'),
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    return route.fulfill(json({ code: 1000, data: null }))
  })
  await page.route('**/system/exam/cancelPublish?*', async (route) => {
    const url = new URL(route.request().url())
    publicationRequests.push({
      action: 'cancel',
      method: route.request().method(),
      examId: url.searchParams.get('examId'),
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    return route.fulfill(json({ code: 1000, data: null }))
  })

  await page.goto('/admin/contest')
  const unpublishedRow = page
    .locator('.manage-table .el-table__body tr')
    .filter({ has: page.getByText('竞赛1', { exact: true }) })
  const publishButton = unpublishedRow.getByRole('button', { name: '发布竞赛 竞赛1' })
  await publishButton.click()
  await publishButton.click({ force: true })
  await expect(unpublishedRow.getByRole('button', { name: '撤销发布竞赛 竞赛1' })).toBeVisible()
  await expect(page.getByText('竞赛发布成功')).toBeVisible()

  const publishedRow = page
    .locator('.manage-table .el-table__body tr')
    .filter({ has: page.getByText('竞赛2', { exact: true }) })
  await publishedRow.getByRole('button', { name: '撤销发布竞赛 竞赛2' }).click()
  await expect(publishedRow.getByRole('button', { name: '发布竞赛 竞赛2' })).toBeVisible()
  await expect(page.getByText('竞赛已撤销发布')).toBeVisible()

  expect(publicationRequests).toEqual([
    { action: 'publish', method: 'PUT', examId: contests[0].examId },
    { action: 'cancel', method: 'PUT', examId: contests[1].examId },
  ])
})

test('已开赛竞赛仅显示状态标签且不渲染操作按钮', async ({ page }) => {
  const started = {
    ...contests[0],
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
  }
  await setup(page, () => ({ code: 1000, rows: [started], total: 1 }))
  await page.goto('/admin/contest')

  const row = page
    .locator('.manage-table .el-table__body tr')
    .filter({ has: page.getByText('竞赛1', { exact: true }) })
  await expect(row.locator('.row-actions .terminal-status-tag')).toHaveText('已开赛')
  await expect(row.getByRole('button')).toHaveCount(0)
})

test('删除竞赛支持确认、防重复提交、失败保留和成功后即时移除', async ({ page }) => {
  await setup(page)
  const deleteRequests = []
  let failFirstDelete = true
  await page.route('**/system/exam/delete?*', async (route) => {
    const url = new URL(route.request().url())
    deleteRequests.push({
      method: route.request().method(),
      examId: url.searchParams.get('examId'),
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (failFirstDelete) {
      failFirstDelete = false
      return route.fulfill(json({ code: 2000, msg: '该竞赛存在关联数据，请先移除关联内容' }))
    }
    return route.fulfill(json({ code: 1000, data: null }))
  })

  await page.goto('/admin/contest')
  const targetRow = page
    .locator('.manage-table .el-table__body tr')
    .filter({ has: page.getByText('竞赛1', { exact: true }) })
  await targetRow.getByRole('button', { name: '删除竞赛 竞赛1' }).click()
  const dialog = page.getByRole('dialog', { name: '删除竞赛' })
  await expect(dialog.getByText('确定要删除此竞赛吗？此操作不可撤销')).toBeVisible()
  await expect(dialog.getByText('目标竞赛：竞赛1')).toBeVisible()
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(dialog).toBeHidden()
  expect(deleteRequests).toHaveLength(0)

  await targetRow.getByRole('button', { name: '删除竞赛 竞赛1' }).click()
  await dialog.getByRole('button', { name: '确定' }).click()
  await expect(dialog.getByRole('button', { name: '确定' })).toBeDisabled()
  await expect(page.getByText('删除失败：该竞赛存在关联数据，请先移除关联内容')).toBeVisible()
  await expect(targetRow).toBeVisible()
  expect(deleteRequests).toHaveLength(1)

  await dialog.getByRole('button', { name: '确定' }).click()
  await expect(page.getByText('竞赛删除成功')).toBeVisible()
  await expect(targetRow).toHaveCount(0)
  expect(deleteRequests).toEqual([
    { method: 'DELETE', examId: contests[0].examId },
    { method: 'DELETE', examId: contests[0].examId },
  ])
})

test('从题目编辑入口加载竞赛详情并分页展示题目', async ({ page }) => {
  await setup(page)
  const requestedIds = []
  await page.route('**/system/exam/detail?*', async (route) => {
    requestedIds.push(new URL(route.request().url()).searchParams.get('examId'))
    await new Promise((resolve) => setTimeout(resolve, 300))
    return route.fulfill(
      json({
        code: 1000,
        data: {
          title: '竞赛1',
          startTime: '2999-09-22 09:00:00',
          endTime: '2999-09-22 11:00:00',
          examQuestionList: Array.from({ length: 12 }, (_, index) => ({
            questionId: String(9007199254740994000n + BigInt(index)),
            title: `题目${index + 1}`,
            difficult: (index % 3) + 1,
          })),
        },
      }),
    )
  })
  await page.goto('/admin/contest')
  await page
    .locator('.manage-table .el-table__body tr')
    .first()
    .getByRole('button', { name: '编辑' })
    .click()
  await expect(page).toHaveURL(`/admin/contest/${contests[0].examId}/edit`)
  await expect(page.getByText('正在加载竞赛…')).toBeVisible()
  await expect(page.getByLabel('竞赛标题')).toHaveValue('竞赛1')
  await expect(page.getByLabel('竞赛开始时间')).toHaveValue('2999-09-22 09:00:00')
  await expect(page.getByLabel('竞赛结束时间')).toHaveValue('2999-09-22 11:00:00')
  await expect(page.locator('.question-table .el-table__body tr')).toHaveCount(10)
  await expect(page.locator('.question-table')).toContainText('9007199254740994000')
  await expect(page.locator('.question-table')).toContainText('题目1')
  await expect(page.locator('.question-table')).toContainText('简单')
  await page.locator('.table-pagination .el-pager .number').filter({ hasText: '2' }).click()
  await expect(page.locator('.question-table')).toContainText('题目12')
  expect(requestedIds).toEqual([contests[0].examId])
})

test('编辑页发布展示易懂失败原因，重试成功后返回列表', async ({ page }) => {
  await setup(page)
  await page.route('**/system/exam/detail?*', (route) =>
    route.fulfill(
      json({
        code: 1000,
        data: {
          title: '待发布竞赛',
          startTime: '2999-09-22 09:00:00',
          endTime: '2999-09-22 11:00:00',
          status: 0,
          examQuestionList: [],
        },
      }),
    ),
  )
  let attempts = 0
  await page.route('**/system/exam/publish?*', (route) => {
    attempts += 1
    return route.fulfill(
      json(
        attempts === 1 ? { code: 3204, msg: '为竞赛新增的题目不存在' } : { code: 1000, data: null },
      ),
    )
  })

  await page.goto(`/admin/contest/${contests[0].examId}/edit`)
  const publishButton = page.getByRole('button', { name: '发布', exact: true })
  await expect(publishButton).toBeEnabled()
  await publishButton.click()
  await expect(page.getByText('发布失败：竞赛暂无题目，请先添加至少一道题目后再发布')).toBeVisible()
  await expect(page).toHaveURL(`/admin/contest/${contests[0].examId}/edit`)

  await publishButton.click()
  await expect(page.getByText('竞赛发布成功')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/contest(?:\?|$)/)
  expect(attempts).toBe(2)
})

test('删除竞赛题目支持会话内确认偏好、跨竞赛重置、失败重试和防重复提交', async ({ page }) => {
  await setup(page)
  const questions = [
    { questionId: '9007199254740994000', title: '两数之和', difficult: 1 },
    { questionId: '9007199254740994001', title: '最长子序列', difficult: 2 },
  ]
  const deleteRequests = []
  let failFirstDelete = true

  await page.route('**/system/exam/detail?*', (route) =>
    route.fulfill(
      json({
        code: 1000,
        data: {
          title: '竞赛1',
          startTime: '2999-09-22 09:00:00',
          endTime: '2999-09-22 11:00:00',
          examQuestionList: questions,
        },
      }),
    ),
  )
  await page.route('**/system/exam/question/delete?*', async (route) => {
    const url = new URL(route.request().url())
    deleteRequests.push({
      method: route.request().method(),
      examId: url.searchParams.get('examId'),
      questionId: url.searchParams.get('questionId'),
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (failFirstDelete) {
      failFirstDelete = false
      return route.fulfill(json({ code: 2000, msg: '题目已被其他竞赛流程锁定' }))
    }
    return route.fulfill(json({ code: 1000, data: null }))
  })

  await page.goto(`/admin/contest/${contests[0].examId}/edit`)
  await page.getByRole('button', { name: '删除题目 两数之和' }).click()
  const dialog = page.getByRole('dialog', { name: '删除题目' })
  await expect(dialog.getByText(/确定要删除题目“两数之和”吗？此操作不可撤销/)).toBeVisible()
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(dialog).toBeHidden()
  expect(deleteRequests).toHaveLength(0)

  await page.getByRole('button', { name: '删除题目 两数之和' }).click()
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-checkbox').click()
  await dialog.getByRole('button', { name: '确定' }).click()
  await expect(dialog.getByRole('button', { name: '确定' })).toBeDisabled()
  await expect(page.getByText(/删除题目“两数之和”失败：题目已被其他竞赛流程锁定/)).toBeVisible()
  await expect(page.locator('.question-table')).toContainText('两数之和')
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some(
        (key) =>
          key.startsWith('contestQuestionDeleteSkipConfirmation:') &&
          localStorage.getItem(key) === 'true',
      ),
    ),
  ).toBe(true)

  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.locator('.question-table')).not.toContainText('两数之和')
  await expect(page.getByText('题目“两数之和”已删除')).toBeVisible()

  await page.getByRole('button', { name: '删除题目 最长子序列' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.question-table')).not.toContainText('最长子序列')

  await page.goto(`/admin/contest/${contests[1].examId}/edit`)
  await page.getByRole('button', { name: '删除题目 两数之和' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/确定要删除题目“两数之和”吗？此操作不可撤销/)).toBeVisible()
  await dialog.getByRole('button', { name: '取消' }).click()

  expect(deleteRequests).toEqual([
    {
      method: 'DELETE',
      examId: contests[0].examId,
      questionId: '9007199254740994000',
    },
    {
      method: 'DELETE',
      examId: contests[0].examId,
      questionId: '9007199254740994000',
    },
    {
      method: 'DELETE',
      examId: contests[0].examId,
      questionId: '9007199254740994001',
    },
  ])
})

test('竞赛详情失败显示后端原因并允许重试', async ({ page }) => {
  await setup(page)
  let requests = 0
  await page.route('**/system/exam/detail?*', async (route) => {
    requests += 1
    return route.fulfill(
      json(
        requests === 1
          ? { code: 2000, msg: '竞赛不存在' }
          : {
              code: 1000,
              data: {
                title: '竞赛1',
                startTime: '2999-09-22 09:00:00',
                endTime: '2999-09-22 11:00:00',
                examQuestionList: [],
              },
            },
      ),
    )
  })
  await page.goto('/admin/contest')
  await page
    .locator('.manage-table .el-table__body tr')
    .first()
    .getByRole('button', { name: '编辑' })
    .click()
  await expect(page.getByText('竞赛详情加载失败：竞赛不存在')).toBeVisible()
  await expect(page.getByLabel('竞赛标题')).toHaveCount(0)
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByLabel('竞赛标题')).toHaveValue('竞赛1')
  expect(requests).toBe(2)
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
  ].map((contest, index) => ({
    ...contest,
    examId: String(9007199254740993000n + BigInt(index)),
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
        .getByText(label, { exact: true })
        .first(),
    ).toBeVisible()
  }
  await expect(
    page
      .locator('.el-table__body tr')
      .filter({ hasText: '未来赛' })
      .getByRole('button', { name: '编辑' }),
  ).toBeEnabled()
  for (const [title, label] of [
    ['进行赛', '已开赛'],
    ['结束赛', '已结束'],
  ]) {
    const terminalRow = page.locator('.el-table__body tr').filter({ hasText: title })
    await expect(terminalRow.locator('.row-actions .terminal-status-tag')).toHaveText(label)
    await expect(terminalRow.getByRole('button')).toHaveCount(0)
  }
  const invalidRow = page.locator('.el-table__body tr').filter({ hasText: '异常赛' })
  await expect(invalidRow.locator('.terminal-status-tag')).toHaveCount(0)
  await expect(invalidRow.locator('.row-actions button')).toHaveCount(3)
})

test('直接访问已开赛或已结束竞赛只显示信息和精确状态标签', async ({ page }) => {
  await setup(page)
  await page.route('**/system/exam/detail?*', (route) => {
    const examId = new URL(route.request().url()).searchParams.get('examId')
    const ended = examId === contests[1].examId
    return route.fulfill(
      json({
        code: 1000,
        data: {
          title: ended ? '已结束竞赛' : '已开赛竞赛',
          startTime: '2000-01-01 09:00:00',
          endTime: ended ? '2000-01-01 11:00:00' : '2999-01-01 09:00:00',
          examQuestionList: [
            { questionId: '9007199254740994000', title: '两数之和', difficult: 1 },
          ],
        },
      }),
    )
  })
  await page.goto(`/admin/contest/${contests[0].examId}/edit`)
  await expect(page.getByText('竞赛已开赛，无法修改基本信息或题目')).toBeVisible()
  await expect(page.locator('.form-card .terminal-status-tag')).toHaveText('已开赛')
  await expect(page.getByLabel('竞赛标题')).toBeDisabled()
  await expect(page.getByLabel('竞赛开始时间')).toBeDisabled()
  await expect(page.getByLabel('竞赛结束时间')).toBeDisabled()
  await expect(page.locator('.question-table')).toContainText('两数之和')
  for (const name of ['保存基本信息', '添加题目', '删除题目 两数之和', '发布', '暂不发布'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)

  await page.goto(`/admin/contest/${contests[1].examId}/edit`)
  await expect(page.getByText('竞赛已结束，无法修改基本信息或题目')).toBeVisible()
  await expect(page.locator('.form-card .terminal-status-tag')).toHaveText('已结束')
  for (const name of ['保存基本信息', '添加题目', '删除题目 两数之和', '发布', '暂不发布'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
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
test('opening the list shows the newest contest despite saved ascending sort and page', async ({
  page,
}) => {
  const requests = []
  await setup(page, (url) => {
    requests.push(url)
    return {
      code: 1000,
      rows: [
        { ...contests[0], title: 'Older', createTime: '2026-09-20 10:00:00' },
        { ...contests[1], title: 'Newest', createTime: '2026-09-21 10:00:00' },
      ],
      total: 2,
    }
  })
  await page.addInitScript(() =>
    localStorage.setItem(
      'contestManageQuery',
      JSON.stringify({ current: 3, size: 10, sortField: 'title', sortOrder: 'asc' }),
    ),
  )
  await page.goto('/admin/contest')
  await expect(page.locator('.manage-table .el-table__body tr').first()).toContainText('Newest')
  expect(requests[0].searchParams.get('pageNum')).toBe('1')
  await expect(page).toHaveURL(/sortField=createTime/)
  await expect(page).toHaveURL(/sortOrder=desc/)
})

test('创建竞赛后选择题目，失败时保留选择并可重试', async ({ page }) => {
  const requests = []
  let failAdd = true
  await page.addInitScript(() => localStorage.setItem('Admin-oj-b-key', 'e2e-token'))
  await page.route('**/system/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/sysuser/info'))
      return route.fulfill(json({ code: 1000, data: { nickName: '管理员' } }))
    if (path.endsWith('/exam/add')) {
      requests.push(JSON.parse(route.request().postData()))
      return route.fulfill(json({ code: 1000, data: { examId: '9007199254740993123' } }))
    }
    if (path.endsWith('/exam/detail'))
      return route.fulfill(
        json({
          code: 1000,
          data: {
            title: '前端集成赛',
            startTime: '2999-09-22 09:00:00',
            endTime: '2999-09-22 11:00:00',
            examQuestionList: failAdd
              ? []
              : [{ questionId: '9007199254740993124', title: '两数之和', difficult: 1 }],
          },
        }),
      )
    if (path.endsWith('/question/list'))
      return route.fulfill(
        json({
          code: 1000,
          rows: [{ questionId: '9007199254740993124', title: '两数之和', difficult: 1 }],
          total: 1,
        }),
      )
    if (path.endsWith('/exam/question/add')) {
      requests.push(JSON.parse(route.request().postData()))
      if (failAdd) {
        failAdd = false
        return route.fulfill(json({ code: 2000, msg: '暂时无法添加' }))
      }
      return route.fulfill(json({ code: 1000, data: null }))
    }
    throw new Error(`Unexpected API request: ${path}`)
  })
  await page.goto('/admin/contest/new')
  await page.getByLabel('竞赛标题').fill('前端集成赛')
  await page.getByLabel('竞赛开始时间').fill('2999-09-22 09:00:00')
  await page.getByLabel('竞赛结束时间').fill('2999-09-22 11:00:00')
  await page.getByRole('button', { name: '保存基本信息' }).click()
  await expect(page).toHaveURL('/admin/contest/9007199254740993123/edit')
  expect(requests[0]).toMatchObject({ title: '前端集成赛', startTime: '2999-09-22 09:00:00' })
  await page.getByRole('button', { name: '添加题目' }).click()
  await page.locator('.el-dialog .el-checkbox').click()
  await page.getByRole('button', { name: '确认添加' }).click()
  await expect(
    page.getByRole('dialog', { name: '选择题目' }).getByText('暂时无法添加'),
  ).toBeVisible()
  await expect(page.getByRole('checkbox', { name: '选择题目 两数之和' })).toBeChecked()
  await page.getByRole('button', { name: '确认添加' }).click()
  await expect(page.locator('.question-table').getByText('两数之和')).toBeVisible()
  expect(requests.at(-1)).toEqual({
    examId: '9007199254740993123',
    questionIdSet: ['9007199254740993124'],
  })
  await page.reload()
  await expect(page.locator('.question-table').getByText('两数之和')).toBeVisible()
})

test('创建接口不返回 ID 时保留已创建状态并阻止重复提交', async ({ page }) => {
  let addCount = 0
  await page.addInitScript(() => localStorage.setItem('Admin-oj-b-key', 'e2e-token'))
  await page.route('**/system/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/sysuser/info'))
      return route.fulfill(json({ code: 1000, data: { nickName: '管理员' } }))
    if (path.endsWith('/exam/add')) {
      addCount += 1
      return route.fulfill(json({ code: 1000, data: null }))
    }
    throw new Error(`Unexpected API request: ${path}`)
  })
  await page.goto('/admin/contest/new')
  await page.getByLabel('竞赛标题').fill('无 ID 竞赛')
  await page.getByLabel('竞赛开始时间').fill('2999-09-22 09:00:00')
  await page.getByLabel('竞赛结束时间').fill('2999-09-22 11:00:00')
  await page.getByRole('button', { name: '保存基本信息' }).click()
  await expect(page.getByText(/创建接口未返回竞赛 ID/)).toBeVisible()
  await expect(page.getByRole('button', { name: '保存基本信息' })).toBeDisabled()
  await page.reload()
  await expect(page.getByLabel('竞赛标题')).toHaveValue('无 ID 竞赛')
  await expect(page.getByText(/创建接口未返回竞赛 ID/)).toBeVisible()
  expect(addCount).toBe(1)
})

test('基本信息实时校验、草稿恢复和离开提醒', async ({ page }) => {
  let addCount = 0
  await page.addInitScript(() => localStorage.setItem('Admin-oj-b-key', 'e2e-token'))
  await page.route('**/system/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/sysuser/info'))
      return route.fulfill(json({ code: 1000, data: { nickName: '管理员' } }))
    if (path.endsWith('/exam/add')) {
      addCount += 1
      return route.fulfill(json({ code: 1000, data: null }))
    }
    if (path.endsWith('/exam/list')) return route.fulfill(json({ code: 1000, rows: [], total: 0 }))
    throw new Error(`Unexpected API request: ${path}`)
  })
  await page.goto('/admin/contest/new')
  await page.getByLabel('竞赛标题').fill('待保存竞赛')
  await page.getByLabel('竞赛开始时间').fill('2999-09-22 11:00:00')
  await page.getByLabel('竞赛结束时间').fill('2999-09-22 09:00:00')
  await page.getByLabel('竞赛结束时间').press('Tab')
  await expect(page.getByText('结束时间必须晚于开始时间')).toBeVisible()
  await page.getByRole('button', { name: '保存基本信息' }).click()
  expect(addCount).toBe(0)
  await page.reload()
  await expect(page.getByLabel('竞赛标题')).toHaveValue('待保存竞赛')
  await page.getByRole('button', { name: '返回列表' }).click()
  await expect(page.getByText('基本信息尚未保存，确定离开吗？')).toBeVisible()
  await page.getByRole('button', { name: '继续编辑' }).click()
  await expect(page).toHaveURL('/admin/contest/new')
})
