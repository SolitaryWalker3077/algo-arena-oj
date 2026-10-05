import axios from 'axios'
import { getToken, removeToken } from './cookie'
import { notifyAuthExpired } from './authEvents'
import { showAuthExpiredNotice } from './authNotice'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/dev-api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
})

service.interceptors.request.use((config) => {
  const token = getToken()
  if (config.requireAuth && !token) throw expireAuthentication('请先登录后重试', 401)
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function expireAuthentication(message, status) {
  removeToken()
  notifyAuthExpired()
  showAuthExpiredNotice()
  const error = new Error(message || '登录状态已过期')
  error.code = 3001
  error.status = status
  error.retryable = false
  return error
}

function createRequestError(error) {
  const status = error.response?.status
  let message = '请求失败，请稍后重试'

  if (error.code === 'ECONNABORTED') message = '请求超时，请检查网络后重试'
  else if (!error.response) message = '网络连接异常，请检查网络后重试'
  else if (status >= 500) message = '服务暂时不可用，请稍后重试'
  else if (error.response.data?.msg) message = error.response.data.msg

  const requestError = new Error(message, { cause: error })
  requestError.status = status
  requestError.code = error.response?.data?.code || error.code
  requestError.retryable = !error.response || error.code === 'ECONNABORTED' || status >= 500
  return requestError
}

service.interceptors.response.use(
  (response) => {
    const payload = response.data
    const code = payload?.code
    if (code === 3001) return Promise.reject(expireAuthentication(payload?.msg, response.status))
    if (code !== 1000) {
      const error = new Error(payload?.msg || '请求失败，请稍后重试')
      error.code = code
      error.status = response.status
      error.retryable = false
      return Promise.reject(error)
    }
    return payload
  },
  (error) => {
    if (error.code === 3001) return Promise.reject(error)
    if (axios.isCancel(error)) return Promise.reject(error)

    const status = error.response?.status
    const responseCode = error.response?.data?.code
    if (status === 401 || status === 403 || responseCode === 3001) {
      return Promise.reject(expireAuthentication(error.response?.data?.msg, status))
    }
    return Promise.reject(createRequestError(error))
  },
)

export default service
