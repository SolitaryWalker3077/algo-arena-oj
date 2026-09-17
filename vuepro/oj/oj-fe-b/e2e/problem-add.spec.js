import { expect, test } from '@playwright/test'

const metadata = {
  version: 'e2e-1',
  description: 'E2E 动态题目表单',
  layout: { columns: 2, labelWidth: 104 },
  behavior: { closeOnOverlay: true, closeOnEscape: true, autosaveSeconds: 30 },
  fields: [
    {
      name: 'title',
      label: '题目标题',
      type: 'text',
      defaultValue: '',
      colSpan: 2,
      group: 'basic',
      validation: [{ required: true, message: '请输入题目标题' }],
    },
    {
      name: 'difficulty',
      label: '题目难度',
      type: 'radio',
      defaultValue: 1,
      group: 'basic',
      options: [
        { label: '简单', value: 1 },
        { label: '中等', value: 2 },
        { label: '困难', value: 3 },
      ],
      validation: [{ required: true }],
    },
    {
      name: 'language',
      label: '代码语言',
      type: 'select',
      defaultValue: 'java',
      submit: false,
      group: 'basic',
      options: [
        { label: 'Java', value: 'java' },
        { label: 'Python', value: 'python' },
      ],
    },
    {
      name: 'content',
      label: '题目内容',
      type: 'markdown',
      defaultValue: '',
      colSpan: 2,
      group: 'statement',
      validation: [{ required: true, message: '请输入题目内容' }],
    },
    {
      name: 'defaultCode',
      label: '默认代码块',
      type: 'code',
      defaultValue: 'class Solution {}',
      colSpan: 2,
      group: 'code',
      editor: { languageField: 'language', height: 320 },
    },
    {
      name: 'mainFac',
      label: 'main 主方法',
      type: 'code',
      defaultValue: 'public static void main(String[] args) {}',
      colSpan: 2,
      group: 'code',
      editor: { languageField: 'language', height: 320 },
      validation: [{ required: true, message: '请输入 main 主方法' }],
    },
  ],
}

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const openProblemPage = async (page, { onAdd = () => {}, addFailure = '', addDelay = 0 } = {}) => {
  let addedPayload
  await page.addInitScript(() => localStorage.setItem('Admin-oj-b-key', 'e2e-token'))
  await page.route('**/system/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/sysuser/info')) {
      return route.fulfill(json({ code: 1000, data: { nickName: '测试管理员' } }))
    }
    if (path.endsWith('/question/metadata')) {
      return route.fulfill(json({ code: 1000, data: metadata }))
    }
    if (path.endsWith('/question/list')) {
      const rows = addedPayload
        ? [
            {
              questionId: '1967421155619463169',
              title: addedPayload.title,
              difficult: addedPayload.difficult,
              createName: '测试管理员',
              createTime: '2026-09-18 10:20:30',
            },
          ]
        : []
      return route.fulfill(json({ code: 1000, rows, total: rows.length }))
    }
    if (path.endsWith('/question/add')) {
      addedPayload = request.postDataJSON()
      onAdd(addedPayload)
      if (addDelay) await new Promise((resolve) => setTimeout(resolve, addDelay))
      if (addFailure) {
        addedPayload = undefined
        return route.fulfill(json({ code: 5000, msg: addFailure, data: null }))
      }
      return route.fulfill(json({ code: 1000, data: null }))
    }
    return route.fulfill(json({ code: 1000, data: null }))
  })
  await page.goto('/admin/problem')
  await expect(page.getByRole('button', { name: '添加题目' })).toBeVisible()
}

test('抽屉支持关闭按钮、ESC 和遮罩三种关闭方式', async ({ page }) => {
  await openProblemPage(page)
  const addButton = page.getByRole('button', { name: '添加题目' })
  const drawer = page.getByRole('dialog')

  await addButton.click()
  await expect(drawer).toBeVisible()
  await page.getByRole('button', { name: '关闭题目表单' }).click()
  await expect(drawer).toBeHidden()

  await addButton.click()
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  await addButton.click()
  await expect(drawer).toBeVisible()
  await page.locator('.problem-drawer-overlay').click({ position: { x: 8, y: 300 } })
  await expect(drawer).toBeHidden()
})

test('动态校验、Markdown/Monaco 编辑器与完整提交链路可用', async ({ page }) => {
  let submitted
  await openProblemPage(page, {
    addDelay: 250,
    onAdd: (payload) => {
      submitted = payload
    },
  })
  await page.getByRole('button', { name: '添加题目' }).click()

  await page.getByRole('button', { name: '创建题目' }).click()
  await expect(page.getByText('请输入题目标题')).toBeVisible()
  await expect(page.getByText('请输入题目内容')).toBeVisible()

  await page.locator('[data-field-name="title"] input').fill('两数之和')
  const markdownInput = page.locator('[data-field-name="content"] .cm-content')
  await markdownInput.fill('重要提示')
  await markdownInput.selectText()
  await page.getByRole('button', { name: '加粗（Ctrl+B）' }).click()
  await expect(markdownInput).toHaveText('**重要提示**')

  const markdownContent =
    '# 两数之和\n\n给定一个整数数组和目标值，返回两个数的下标。\n\n```java\nint answer = 42;\n```'
  await markdownInput.fill(markdownContent)
  await expect(
    page.locator('.preview-pane').getByRole('heading', { name: '两数之和' }),
  ).toBeVisible()
  await expect(page.locator('.preview-pane code.hljs')).toContainText('int answer = 42;')

  await page.locator('[data-field-name="defaultCode"]').scrollIntoViewIfNeeded()
  const editor = page.locator('[data-field-name="defaultCode"] .monaco-editor')
  await expect(editor).toBeVisible({ timeout: 20_000 })
  expect((await editor.boundingBox()).height).toBeGreaterThanOrEqual(300)
  await page.getByRole('button', { name: '全屏编辑' }).first().click()
  await expect(page.locator('.code-editor--fullscreen')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.code-editor--fullscreen')).toBeHidden()
  await expect(page.getByRole('dialog')).toBeVisible()

  const createButton = page.getByRole('button', { name: '创建题目' })
  await createButton.click()
  await expect(createButton).toBeDisabled()
  await expect(page.getByRole('button', { name: '关闭题目表单' })).toBeDisabled()
  await expect.poll(() => submitted).toBeTruthy()
  expect(submitted).toMatchObject({
    title: '两数之和',
    difficult: 1,
    content: markdownContent,
    defaultCode: 'class Solution {}',
    mainFac: 'public static void main(String[] args) {}',
  })
  expect(submitted.language).toBeUndefined()
  await expect(page.getByText('添加成功')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.manage-table tbody tr').first()).toContainText('两数之和')
})

test('创建失败时保留抽屉并明确展示后端原因', async ({ page }) => {
  await openProblemPage(page, { addFailure: '题目标题已存在，请更换标题' })
  await page.getByRole('button', { name: '添加题目' }).click()

  await page.locator('[data-field-name="title"] input').fill('重复题目')
  await page.locator('[data-field-name="content"] .cm-content').fill('这是完整的题目内容')
  await page.getByRole('button', { name: '创建题目' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.submit-alert')).toContainText('题目标题已存在，请更换标题')
  await expect(page.getByRole('button', { name: '创建题目' })).toBeEnabled()

  await page.locator('[data-field-name="title"] input').fill('不重复的题目')
  await expect(page.locator('.submit-alert')).toBeHidden()
})

test('Markdown 编辑器在小屏幕下支持编辑与预览切换', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openProblemPage(page)
  await page.getByRole('button', { name: '添加题目' }).click()

  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  expect((await drawer.boundingBox()).width).toBeGreaterThanOrEqual(380)

  const markdownInput = page.locator('[data-field-name="content"] .cm-content')
  await markdownInput.fill('# 移动端题面\n\n正文内容')
  await expect(page.locator('.preview-pane')).toBeHidden()

  await page.getByRole('button', { name: '仅预览' }).click()
  await expect(page.locator('.editor-pane')).toBeHidden()
  await expect(
    page.locator('.preview-pane').getByRole('heading', { name: '移动端题面' }),
  ).toBeVisible()

  await page.getByRole('button', { name: '仅编辑' }).click()
  await expect(page.locator('.editor-pane')).toBeVisible()
})
