export const SUCCESS_CODE = 1000
export const UNAUTHORIZED_CODE = 3001
export const LOGIN_PATH = '/system/sysuser/login'

const normalizePath = (url = '') => {
  const rawUrl = String(url)
  try {
    return new URL(rawUrl, 'http://localhost').pathname.replace(/\/+$/, '') || '/'
  } catch {
    return rawUrl.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
  }
}

export const isLoginRequest = (config = {}) => normalizePath(config.url) === LOGIN_PATH

export const shouldRedirectForUnauthorized = (unauthorized, config = {}) => {
  return unauthorized && !config.skipAuthRedirect
}

export const createRequestError = (message, code) => {
  const error = new Error(message)
  error.code = code
  return error
}

export const attachAuthorization = (config, token) => {
  if (isLoginRequest(config)) return config
  if (!token) {
    throw createRequestError('登录状态已失效，请重新登录', UNAUTHORIZED_CODE)
  }

  config.headers = config.headers || {}
  config.headers.Authorization = `Bearer ${token}`
  return config
}

// 后端统一返回 Result { code, msg, data }；业务失败即使 HTTP 为 2xx 也按失败处理。
export const unwrapApiResponse = (response) => {
  const result = response?.data
  if (result?.code === SUCCESS_CODE) return result.data

  const error = createRequestError(result?.msg || '操作失败，请稍后重试', result?.code)
  error.response = response
  throw error
}

export const getHttpError = (error) => {
  const status = error?.response?.status
  const data = error?.response?.data
  const backendMessage = typeof data === 'string' ? data : data?.msg || data?.message
  const timedOut = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')
  const fallbackMessages = {
    400: '请求参数有误，请检查后重试',
    401: '登录状态已失效，请重新登录',
    403: '您没有权限执行此操作',
    404: '请求的资源不存在',
    500: '服务器繁忙，请稍后重试',
  }

  return {
    code: data?.code,
    message: backendMessage
      || fallbackMessages[status]
      || (timedOut
        ? '请求超时，请稍后重试'
        : error?.response
          ? `请求失败（HTTP ${status}）`
          : '网络异常，请检查网络连接或后端服务'),
    unauthorized: status === 401 || data?.code === UNAUTHORIZED_CODE,
  }
}
