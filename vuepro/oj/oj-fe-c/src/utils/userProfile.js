const STRING_FIELDS = [
  'nickName',
  'headImage',
  'phone',
  'email',
  'wechat',
  'schoolName',
  'majorName',
  'introduce',
]

export const DEFAULT_NICKNAME = 'OJ用户'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeOptionalString(value, fieldName) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'string') {
    throw createProfileFormatError(`${fieldName} 字段类型错误`)
  }
  return value.trim()
}

function normalizeOptionalInteger(value, fieldName) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue)) {
    throw createProfileFormatError(`${fieldName} 字段类型错误`)
  }
  return numberValue
}

export function createProfileFormatError(detail = '') {
  const error = new Error('个人资料数据格式异常，请稍后重试')
  error.code = 'INVALID_PROFILE_DATA'
  error.detail = detail
  error.retryable = true
  return error
}

export function normalizeUserProfile(data) {
  if (!isRecord(data)) {
    throw createProfileFormatError('响应 data 不是对象')
  }

  const hasUserId = Object.prototype.hasOwnProperty.call(data, 'userId')
  if (!hasUserId || !['string', 'number'].includes(typeof data.userId)) {
    throw createProfileFormatError('缺少有效的 userId')
  }

  const userId = String(data.userId).trim()
  if (!userId) throw createProfileFormatError('userId 不能为空')

  const profile = { userId }
  for (const field of STRING_FIELDS) {
    profile[field] = normalizeOptionalString(data[field], field)
  }

  profile.sex = normalizeOptionalInteger(data.sex, 'sex')
  profile.status = normalizeOptionalInteger(data.status, 'status')
  return profile
}

export function getSexLabel(sex) {
  return ({ 0: '不公开', 1: '男', 2: '女' })[sex] || '未设置'
}

export function getDisplayNickname(nickName) {
  return nickName || DEFAULT_NICKNAME
}

export function getStatusPresentation(status) {
  if (status === 1) return { label: '账号正常', tone: 'normal' }
  if (status === 0) return { label: '账号受限', tone: 'blocked' }
  return { label: '状态未知', tone: 'unknown' }
}
