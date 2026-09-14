import request from '@/utils/request'
import { createTtlCache } from '@/utils/apiCache'
import {
  BASE_DIFFICULTY_OPTIONS,
  formatProblemCreateTime,
  mapProblemFromApi,
  normalizeProblemPage,
  normalizeProblemQuery,
} from '@/api/problemPolicy'

export {
  BASE_DIFFICULTY_OPTIONS,
  formatProblemCreateTime,
  mapProblemFromApi,
  normalizeProblemPage,
  normalizeProblemQuery,
} from '@/api/problemPolicy'

/**
 * 题目管理 API
 * -------------------------------------------------------------
 * 统一复用 @/utils/request 实例（自动注入 Bearer token、解包 Result/TableDataInfo、统一报错/401）。
 *
 * 后端真实契约（oj-system / QuestionController）：
 *   GET /question/list?pageNum=1&pageSize=10&title=关键字&difficult=2
 *   返回 TableDataInfo { code, msg, total, rows: QuestionVO[] }
 *   QuestionVO 字段：questionId(雪花长整数字符串)、title、difficult(1简单/2中等/3困难)、
 *                   createName(创建人昵称，可能为 null)
 * 经网关访问路径统一加 /system 前缀（网关剔除前缀后转发）。
 *
 * 分层：ENDPOINTS 集中配置 → 参数校验 → 字段适配 → 分页结构归一。
 */

// 1) 接口路径集中配置（后端路径调整只改这里）
export const ENDPOINTS = Object.freeze({
  page: '/system/question/list',
  add: '/system/problem',
  update: '/system/problem',
  delete: '/system/problem',
})

// 后端 difficult 字段是固定枚举（1 简单 / 2 中等 / 3 困难）。
// 保留异步函数签名以兼容现有调用方，不再请求尚未实现的字典接口。
export const getDifficultyOptions = async () => BASE_DIFFICULTY_OPTIONS.map((option) => ({ ...option }))

// 3) 列表缓存：30s TTL；写操作后 clearProblemPageCache 主动失效
const problemPageCache = createTtlCache({ ttl: 30 * 1000 })
const cacheKeyOf = (params) => JSON.stringify(normalizeProblemQuery(params))

export const clearProblemPageCache = () => problemPageCache.clear()
export const peekProblemPageCache = (params) => problemPageCache.peek(cacheKeyOf(params))
export const isProblemPageCacheFresh = (params) => problemPageCache.isFresh(cacheKeyOf(params))

/** 前端视图模型 → 后端提交体（新增/编辑；不提交创建人/创建时间） */
export function mapProblemToApi(problem = {}) {
  const body = {
    title: problem.title,
    difficult: Number(problem.difficulty),
  }
  // 编辑时带上字符串形式的雪花 ID；新增时不传（由后端雪花算法生成）
  if (problem.id) body.questionId = String(problem.id)
  return body
}

/**
 * 分页查询题目（标题模糊搜索 + 难度筛选，服务端分页）
 * @param {Object} params { current, size, title?, difficulty?(1/2/3) }
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] true 时跳过缓存
 */
export async function getProblemPage(params = {}, { force = false } = {}) {
  const apiParams = normalizeProblemQuery(params)

  const key = cacheKeyOf(apiParams)
  if (!force) {
    const cached = problemPageCache.get(key)
    if (cached) return cached
  }
  const res = await request.get(ENDPOINTS.page, { params: apiParams })
  const page = normalizeProblemPage(res)
  problemPageCache.set(key, page)
  return page
}

/** 新增题目（id 由后端雪花算法生成，前端不传） */
export const addProblem = (data) => request.post(ENDPOINTS.add, mapProblemToApi(data))

/** 编辑题目 */
export const updateProblem = (data) => request.put(ENDPOINTS.update, mapProblemToApi(data))

/**
 * 删除题目
 * @param {string|number} id 字符串形式的雪花 ID
 */
export const deleteProblem = (id) =>
  request.delete(ENDPOINTS.delete, { params: { id: String(id) } })
