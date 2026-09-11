export const TOKEN_KEY = 'Admin-oj-b-key'
export const ACCOUNT_KEY = 'adminAccount'

const getStorage = (name) => {
  if (typeof window === 'undefined') return null
  try {
    return window[name]
  } catch {
    return null
  }
}

const readStorage = (storage, key) => {
  try {
    return storage?.getItem(key)?.trim() || ''
  } catch {
    return ''
  }
}

const removeStorage = (storage, key) => {
  try {
    storage?.removeItem(key)
  } catch {
    // 浏览器禁用存储时不阻断退出或未授权处理流程
  }
}

const removeTokenCookie = () => {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${encodeURIComponent(TOKEN_KEY)}=; Max-Age=0; path=/; SameSite=Lax`
  } catch {
    // Cookie 不可用时仍继续清理其他登录态
  }
}

// 统一读取登录令牌：优先使用持久化登录态，其次使用会话登录态。
export const getToken = () => {
  return readStorage(getStorage('localStorage'), TOKEN_KEY)
    || readStorage(getStorage('sessionStorage'), TOKEN_KEY)
}

export const setToken = (token) => {
  const normalizedToken = typeof token === 'string' ? token.trim() : ''
  if (!normalizedToken) throw new Error('登录接口未返回令牌')

  const localStorage = getStorage('localStorage')
  if (!localStorage) throw new Error('当前环境无法保存登录令牌')

  localStorage.setItem(TOKEN_KEY, normalizedToken)
  removeStorage(getStorage('sessionStorage'), TOKEN_KEY)
}

export const clearAuth = () => {
  const localStorage = getStorage('localStorage')
  const sessionStorage = getStorage('sessionStorage')

  removeStorage(localStorage, TOKEN_KEY)
  removeStorage(sessionStorage, TOKEN_KEY)
  removeStorage(localStorage, ACCOUNT_KEY)
  removeStorage(sessionStorage, ACCOUNT_KEY)
  removeTokenCookie()
}
