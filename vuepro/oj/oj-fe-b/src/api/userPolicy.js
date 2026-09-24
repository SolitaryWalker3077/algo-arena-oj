/**
 * 用户管理的纯数据适配策略。
 *
 * 这里不依赖 Vue 或 Axios，集中处理分页参数、雪花 ID 和后端字段映射，
 * 便于对接口契约做独立单元测试。
 */

export const USER_QUERY_VALIDATION_CODE = 3002

const createValidationError = (message) => {
  const error = new Error(message)
  error.code = USER_QUERY_VALIDATION_CODE
  return error
}

const normalizeInteger = (value, fallback, label, max) => {
  const candidate = value ?? fallback
  const number = String(candidate).trim() === '' ? Number.NaN : Number(candidate)
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw createValidationError(`${label}必须是 1-${max} 之间的整数`)
  }
  return number
}

/** 将页面查询条件转换为后端 UserQueryDto 参数。 */
export function normalizeUserQuery(params = {}) {
  const query = {
    pageNum: normalizeInteger(params.current ?? params.pageNum, 1, '页码', 1000000),
    pageSize: normalizeInteger(params.size ?? params.pageSize, 10, '每页条数', 500),
  }

  if (params.userId != null && String(params.userId).trim() !== '') {
    const userId = String(params.userId).trim()
    if (!/^\d{1,19}$/.test(userId) || BigInt(userId) > 9223372036854775807n) {
      throw createValidationError('用户ID必须是 1-19 位有效数字')
    }
    query.userId = userId
  }

  const nickName = params.nickName ?? params.userName
  if (nickName != null && String(nickName).trim() !== '') {
    query.nickName = String(nickName).trim()
  }

  if (params.phone != null && String(params.phone).trim() !== '') {
    query.phone = String(params.phone).trim()
  }

  if (params.status !== '' && params.status != null) {
    const status = Number(params.status)
    if (![0, 1].includes(status)) {
      throw createValidationError('用户状态无效')
    }
    query.status = status
  }

  return query
}

/** 后端 UserVo → 页面视图模型。 */
export function mapUserFromApi(raw = {}) {
  const rawStatus = raw.status ?? raw.userStatus ?? raw.state
  return {
    id: raw.userId == null ? (raw.id == null ? '' : String(raw.id)) : String(raw.userId),
    userAccount: raw.userAccount ?? raw.account ?? '',
    userName: raw.nickName ?? raw.userName ?? raw.nickname ?? '',
    sex: raw.sex == null || raw.sex === '' ? null : Number(raw.sex),
    phone: raw.phone ?? raw.mobile ?? raw.telephone ?? '',
    email: raw.email ?? raw.mail ?? '',
    wechatId: raw.wechat ?? raw.wechatId ?? raw.wechatNo ?? '',
    school: raw.schoolName ?? raw.school ?? '',
    major: raw.majorName ?? raw.major ?? '',
    intro: raw.introduce ?? raw.intro ?? raw.introduction ?? raw.description ?? '',
    status: Number(rawStatus ?? 1),
    createTime: raw.createTime ?? raw.gmtCreate ?? '',
  }
}

/** 兼容 TableDataInfo 与历史分页结构。 */
export function normalizeUserPage(response) {
  if (Array.isArray(response)) {
    return { records: response.map(mapUserFromApi), total: response.length }
  }

  const rawList = response?.rows ?? response?.records ?? response?.list ?? response?.data ?? []
  const records = (Array.isArray(rawList) ? rawList : []).map(mapUserFromApi)
  const rawTotal = Number(
    response?.total ?? response?.totalCount ?? response?.count ?? records.length,
  )

  return {
    records,
    total: Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : records.length,
  }
}
