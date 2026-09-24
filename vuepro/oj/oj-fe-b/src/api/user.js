import request from '@/utils/request'
import { createTtlCache } from '@/utils/apiCache'
import { normalizeUserPage, normalizeUserQuery } from '@/api/userPolicy'

export { mapUserFromApi, normalizeUserPage, normalizeUserQuery } from '@/api/userPolicy'

/**
 * 用户管理 API（前台用户，区别于 suser.js 的管理员登录）
 * -------------------------------------------------------------
 * 统一复用 @/utils/request 实例：自动注入 Authorization: Bearer token、
 * 解包后端 Result（code===1000 时返回 data）、统一错误提示与 401 处理。
 * 网关匹配 /system/** 后转发到 oj-system 服务。
 *
 * ★ 适配层：后端数据结构将来若发生变化，原则上只需修改本文件，页面组件无需改动：
 *   1. ENDPOINTS             —— 接口路径集中配置
 *   2. mapUserFromApi/ToApi  —— 字段名/结构映射集中处理
 *   3. normalizeUserPage     —— 分页列表结构兼容（records/list/rows/数组）
 */

// 1) 接口路径集中配置（后端路径调整只改这里）
export const ENDPOINTS = Object.freeze({
  page: '/system/user/list',
  add: '/system/user',
  update: '/system/user',
  updateStatus: '/system/user/updateStatus',
})

// 2) 列表缓存：30s TTL；新增/编辑/启停后调用 clearUserPageCache 主动失效
const PAGE_TTL = 30 * 1000
const userPageCache = createTtlCache({ ttl: PAGE_TTL })
const cacheKeyOf = (params) => JSON.stringify(normalizeUserQuery(params))

export const clearUserPageCache = () => userPageCache.clear()
export const peekUserPageCache = (params) => userPageCache.peek(cacheKeyOf(params))
export const isUserPageCacheFresh = (params) => userPageCache.isFresh(cacheKeyOf(params))

/**
 * 3) 后端实体 → 前端视图模型
 * - id 统一转字符串：雪花 ID 为 18~19 位长整数，request.js 已在 JSON 解析前
 *   把长整数字面量转为字符串，这里再兜底一次，保证页面全程不把 id 当 Number 使用。
 * - 字段缺失时给默认值，避免页面渲染 undefined。
 * - 若后端字段名不同（如 wechat_no、introduction），只在此处改映射即可。
 */
/** 前端视图模型 → 后端提交体（新增/编辑用） */
export function mapUserToApi(user = {}) {
  return {
    userId: user.id || undefined,
    userAccount: user.userAccount,
    nickName: user.userName,
    sex: user.sex,
    phone: user.phone,
    email: user.email,
    wechat: user.wechatId,
    schoolName: user.school,
    majorName: user.major,
    introduce: user.intro,
    status: Number(user.status),
  }
}

/**
 * 4) 分页结构兼容：后端可能返回
 *    - MyBatis-Plus IPage：{ records: [], total: n }
 *    - 自定义：{ list: [], total: n } / { rows: [], totalCount: n }
 *    - 直接返回数组
 * 统一归一为 { records: 用户视图模型[], total: number }
 */
/**
 * 分页查询用户（条件搜索 + 排序）
 * @param {Object} params { current, size, userId?, userName?, phone?, status? }
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] true 时跳过缓存强制请求后端
 * @returns {Promise<{records: Array, total: number}>}
 */
export async function getUserPage(params, { force = false } = {}) {
  const apiParams = normalizeUserQuery(params)
  const key = cacheKeyOf(apiParams)
  if (!force) {
    const cached = userPageCache.get(key)
    if (cached) return cached
  }
  const res = await request.get(ENDPOINTS.page, { params: apiParams })
  const page = normalizeUserPage(res)
  userPageCache.set(key, page)
  return page
}

/** 新增用户（id 由后端雪花算法生成并返回，前端不生成） */
export const addUser = (data) => request.post(ENDPOINTS.add, mapUserToApi(data))

/** 编辑用户 */
export const updateUser = (data) => request.put(ENDPOINTS.update, mapUserToApi(data))

/**
 * 拉黑/解禁用户
 * @param {string|number} id 字符串形式的雪花 ID
 * @param {number} status 1=正常 0=拉黑
 */
export const updateUserStatus = (id, status) =>
  request.put(ENDPOINTS.updateStatus, { userId: String(id), status: Number(status) })
