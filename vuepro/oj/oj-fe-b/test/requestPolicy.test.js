import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCOUNT_KEY, clearAuth, getToken, TOKEN_KEY } from '../src/utils/auth.js'
import {
  attachAuthorization,
  getHttpError,
  isLoginRequest,
  shouldRedirectForUnauthorized,
  UNAUTHORIZED_CODE,
  unwrapApiResponse,
} from '../src/utils/requestPolicy.js'

const createMemoryStorage = (initialValues = {}) => {
  const values = new Map(Object.entries(initialValues))
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

test('token 优先从 localStorage 读取并统一清理存储与 Cookie', () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const localStorage = createMemoryStorage({ [TOKEN_KEY]: 'local-token', [ACCOUNT_KEY]: 'admin' })
  const sessionStorage = createMemoryStorage({
    [TOKEN_KEY]: 'session-token',
    [ACCOUNT_KEY]: 'admin',
  })
  const cookieWrites = []
  const document = {}
  Object.defineProperty(document, 'cookie', {
    set: (value) => cookieWrites.push(value),
  })
  globalThis.window = { localStorage, sessionStorage }
  globalThis.document = document

  try {
    assert.equal(getToken(), 'local-token')
    localStorage.removeItem(TOKEN_KEY)
    assert.equal(getToken(), 'session-token')

    clearAuth()
    assert.equal(localStorage.getItem(ACCOUNT_KEY), null)
    assert.equal(sessionStorage.getItem(TOKEN_KEY), null)
    assert.equal(sessionStorage.getItem(ACCOUNT_KEY), null)
    assert.match(cookieWrites.at(-1), new RegExp(`^${TOKEN_KEY}=.*Max-Age=0`))
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})

test('非登录接口自动携带 Bearer token', () => {
  const config = attachAuthorization(
    { method: 'get', url: '/system/sysuser/info', headers: {} },
    'valid-token',
  )

  assert.equal(config.headers.Authorization, 'Bearer valid-token')
})

test('题目列表请求自动携带 Bearer token', () => {
  const config = attachAuthorization(
    { method: 'get', url: '/system/question/list', headers: {} },
    'problem-list-token',
  )

  assert.equal(config.headers.Authorization, 'Bearer problem-list-token')
})

test('DELETE 退出请求自动携带 Bearer token', () => {
  const config = attachAuthorization(
    { method: 'delete', url: '/system/sysuser/logout', headers: {} },
    'logout-token',
  )

  assert.equal(config.headers.Authorization, 'Bearer logout-token')
})

test('登录接口不携带 token', () => {
  const config = { method: 'post', url: '/system/sysuser/login?source=admin', headers: {} }

  assert.equal(isLoginRequest(config), true)
  assert.equal(attachAuthorization(config, 'stale-token').headers.Authorization, undefined)
})

test('非登录接口缺少 token 时在发送前拒绝请求', () => {
  assert.throws(
    () => attachAuthorization({ url: '/system/sysuser/info' }, ''),
    (error) => error.code === UNAUTHORIZED_CODE && /重新登录/.test(error.message),
  )
})

test('成功响应提取用户昵称数据', () => {
  const data = unwrapApiResponse({
    status: 200,
    data: { code: 1000, msg: '操作成功', data: { nickName: '算法管理员' } },
  })

  assert.deepEqual(data, { nickName: '算法管理员' })
})

test('成功的 TableDataInfo 分页响应保留 rows 和 total', () => {
  const table = {
    code: 1000,
    msg: '操作成功',
    rows: [{ questionId: '1967421155619463169' }],
    total: 1,
  }

  assert.deepEqual(unwrapApiResponse({ status: 200, data: table }), table)
})

test('token 过期的业务响应保留后端原因并标记未授权', () => {
  assert.throws(
    () =>
      unwrapApiResponse({
        status: 200,
        data: { code: UNAUTHORIZED_CODE, msg: '登录状态已过期', data: null },
      }),
    (error) => error.code === UNAUTHORIZED_CODE && error.message === '登录状态已过期',
  )
})

test('HTTP 401 响应优先展示后端错误原因', () => {
  const failure = getHttpError({
    response: { status: 401, data: { code: UNAUTHORIZED_CODE, msg: '令牌已过期' } },
  })

  assert.deepEqual(failure, {
    code: UNAUTHORIZED_CODE,
    message: '令牌已过期',
    unauthorized: true,
  })
})

test('退出请求失败时保留当前页面，不触发全局未授权跳转', () => {
  assert.equal(shouldRedirectForUnauthorized(true, { skipAuthRedirect: true }), false)
  assert.equal(shouldRedirectForUnauthorized(true), true)
})

test('请求超时返回明确的用户提示', () => {
  assert.deepEqual(getHttpError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }), {
    code: undefined,
    message: '请求超时，请稍后重试',
    unauthorized: false,
  })
})

test('无法连接后端时返回可操作的网络异常提示', () => {
  assert.deepEqual(getHttpError({ request: {}, message: 'Network Error' }), {
    code: undefined,
    message: '网络异常，请检查网络连接或后端服务',
    unauthorized: false,
  })
})
