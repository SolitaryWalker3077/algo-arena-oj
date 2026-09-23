import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAuth, getToken } from '@/utils/auth'
import {
  attachAuthorization,
  getHttpError,
  shouldRedirectForUnauthorized,
  UNAUTHORIZED_CODE,
  unwrapApiResponse,
} from '@/utils/requestPolicy'

// 创建 axios 实例；不设置 baseURL，接口函数直接写网关路径（如 /system/sysuser/login），
// 由 vite 代理按路径前缀转发到网关，避免前缀叠加
const request = axios.create({
  timeout: 10000,
  // 覆盖默认 transformResponse：axios 默认用 JSON.parse 解析响应体，
  // 会把超过 Number.MAX_SAFE_INTEGER（9007199254740991，16 位）的整数字面量
  // 截断为不精确的浮点数（如雪花算法 ID 通常 18~19 位）。
  // 这里先对原始文本做预处理：将值位置上 16 位及以上的纯整数字面量加引号转为字符串，
  // 再交给 JSON.parse，从而完整保留长 ID，从数据交互层避免精度丢失。
  transformResponse: [
    (rawData) => {
      if (typeof rawData !== 'string') return rawData
      const safe = rawData.replace(
        /([:\[,]\s*)(-?\d{16,})(?![\d.])/g,
        (_m, prefix, num) => `${prefix}"${num}"`,
      )
      try {
        return JSON.parse(safe)
      } catch {
        // 非 JSON 响应（纯文本等）直接返回原始内容
        return rawData
      }
    },
  ],
})

const redirectToLogin = () => {
  clearAuth()
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'login') return

  const query =
    currentRoute.fullPath && currentRoute.fullPath !== '/'
      ? { redirect: currentRoute.fullPath }
      : undefined
  router.replace({ name: 'login', query }).catch(() => {})
}

const rejectWithMessage = (error, unauthorized = false, config = {}) => {
  const mappedMessage = config?.errorMessageMap?.[error?.code]
  const detail = mappedMessage || error?.message || '操作失败，请稍后重试'
  const prefix = typeof config?.errorMessagePrefix === 'string' ? config.errorMessagePrefix : ''
  const message = prefix && !detail.startsWith(prefix) ? `${prefix}${detail}` : detail
  error.message = message
  ElMessage.error(message)
  if (unauthorized) redirectToLogin()
  error.handled = true
  return Promise.reject(error)
}

// 除登录接口外，所有请求在发出前统一携带 Bearer token。
request.interceptors.request.use(
  (config) => {
    try {
      return attachAuthorization(config, getToken())
    } catch (error) {
      const unauthorized = shouldRedirectForUnauthorized(error.code === UNAUTHORIZED_CODE, config)
      return rejectWithMessage(error, unauthorized, config)
    }
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一处理后端 Result { code, msg, data }
request.interceptors.response.use(
  (response) => {
    try {
      return unwrapApiResponse(response)
    } catch (error) {
      const unauthorized = shouldRedirectForUnauthorized(
        error.code === UNAUTHORIZED_CODE,
        response.config,
      )
      return rejectWithMessage(error, unauthorized, response.config)
    }
  },
  (error) => {
    if (error?.handled) return Promise.reject(error)

    const failure = getHttpError(error)
    const friendlyError = new Error(failure.message)
    friendlyError.code = failure.code
    friendlyError.cause = error
    const unauthorized = shouldRedirectForUnauthorized(failure.unauthorized, error.config)
    return rejectWithMessage(friendlyError, unauthorized, error.config)
  },
)

export default request
