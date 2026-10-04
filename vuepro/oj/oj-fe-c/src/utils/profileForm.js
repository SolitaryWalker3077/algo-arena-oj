const LIMITS = {
  nickName: 20,
  schoolName: 50,
  majorName: 50,
  phone: 20,
  email: 80,
  wechat: 30,
  introduce: 200,
}

const EDITABLE_FIELDS = [
  'headImage',
  'nickName',
  'sex',
  'schoolName',
  'majorName',
  'phone',
  'email',
  'wechat',
  'introduce',
]

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function createProfileForm(profile = {}) {
  return {
    headImage: stringValue(profile.headImage),
    nickName: stringValue(profile.nickName),
    sex: [0, 1, 2].includes(Number(profile.sex)) ? Number(profile.sex) : null,
    schoolName: stringValue(profile.schoolName),
    majorName: stringValue(profile.majorName),
    phone: stringValue(profile.phone),
    email: stringValue(profile.email),
    wechat: stringValue(profile.wechat),
    introduce: stringValue(profile.introduce),
  }
}

export function validateProfileField(field, rawValue) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

  const hasLimit = Object.prototype.hasOwnProperty.call(LIMITS, field)
  if (hasLimit && typeof value === 'string' && value.length > LIMITS[field]) {
    return `不能超过 ${LIMITS[field]} 个字符`
  }
  if (field === 'phone' && value && !/^(?:1[3-9]\d{9}|1\d{2}\*{4}\d{4})$/.test(value)) {
    return '请输入有效的 11 位手机号码'
  }
  if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return '请输入有效的邮箱地址'
  }
  if (field === 'wechat' && value && !/^[a-zA-Z][-_a-zA-Z0-9]{5,29}$/.test(value)) {
    return '微信号应以字母开头，长度为 6–30 位'
  }
  if (field === 'sex' && value !== null && ![0, 1, 2].includes(Number(value))) {
    return '请选择有效的性别'
  }
  return ''
}

export function validateProfileForm(form) {
  return Object.fromEntries(
    EDITABLE_FIELDS
      .map((field) => [field, validateProfileField(field, form[field])])
      .filter(([, message]) => Boolean(message)),
  )
}

export function createProfileUpdatePayload(form) {
  const payload = createProfileForm(form)
  return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, payload[field]]))
}

export { LIMITS as PROFILE_FIELD_LIMITS }
