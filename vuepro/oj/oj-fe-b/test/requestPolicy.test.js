import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCOUNT_KEY,
  clearAuth,
  getToken,
  TOKEN_KEY,
} from '../src/utils/auth.js'
import {
  attachAuthorization,
  getHttpError,
  isLoginRequest,
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

test('token 优先从 localStorage 读取并可统一清理两种存储', () => {
  const originalWindow = globalThis.window
  const localStorage = createMemoryStorage({ [TOKEN_KEY]: 'local-token', [ACCOUNT_KEY]: 'admin' })
  const sessionStorage = createMemoryStorage({ [TOKEN_KEY]: 'session-token', [ACCOUNT_KEY]: 'admin' })
  globalThis.window = { localStorage, sessionStorage }

  try {
    assert.equal(getToken(), 'local-token')
    localStorage.removeItem(TOKEN_KEY)
    assert.equal(getToken(), 'session-token')

    clearAuth()
    assert.equal(localStorage.getItem(ACCOUNT_KEY), null)
    assert.equal(sessionStorage.getItem(TOKEN_KEY), null)
    assert.equal(sessionStorage.getItem(ACCOUNT_KEY), null)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

test('非登录接口自动携带 Bearer token', () => {
  const config = attachAuthorization(
    { method: 'get', url: '/system/sysuser/info', headers: {} },
    'valid-token',
  )

  assert.equal(config.headers.Authorization, 'Bearer valid-token')
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

test('token 过期的业务响应保留后端原因并标记未授权', () => {
  assert.throws(
    () => unwrapApiResponse({
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
