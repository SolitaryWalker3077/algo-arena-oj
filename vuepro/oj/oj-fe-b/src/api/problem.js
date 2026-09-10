import request from '@/utils/request'
import { createTtlCache } from '@/utils/apiCache'

/**
 * 题目管理 API
 * -------------------------------------------------------------
 * 统一复用 @/utils/request 实例（自动注入 Bearer token、解包 Result、统一报错/401）。
 * 网关匹配 /system/** 后转发到 oj-system 服务。
 *
 * 与用户管理模块保持一致的分层：
 *   1. ENDPOINTS              —— 接口路径集中配置
 *   2. 难度选项接口动态加载     —— 下拉配置不写死，后端字典调整时前端零改动
 *   3. mapProblem* 适配层     —— 字段名/结构映射集中处理（雪花 ID 统一转字符串）
 *   4. normalizeProblemPage   —— 分页结构兼容（records/list/rows/数组）
 */

// 1) 接口路径集中配置（后端路径调整只改这里）
export const ENDPOINTS = Object.freeze({
  page: '/system/problem/page',
  add: '/system/problem',
  update: '/system/problem',
  delete: '/system/problem',
  // 难度字典：后端就绪后由该接口下发 [{ value, label, tagType }]
  // tagType 用于表格难度标签配色（success/warning/danger/info）
  difficultyOptions: '/system/problem/difficulty/options',
})

// 2) 难度选项的本地兜底：仅在后端字典接口不可用时使用，保证页面可用。
//    后端接口一旦就绪，以接口返回为准，此兜底不会生效。
const FALLBACK_DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: '简单', tagType: 'success' },
  { value: 'MEDIUM', label: '中等', tagType: 'warning' },
  { value: 'HARD', label: '困难', tagType: 'danger' },
]

/**
 * 归一化难度选项：后端字典可能返回
 *   [{ value, label, tagType }] / [{ code, name }] / ['简单',...] 等
 * 统一成 { value, label, tagType }
 */
function normalizeDifficultyOptions(res) {
  const list = Array.isArray(res) ? res : res?.options ?? res?.data ?? []
  if (!Array.isArray(list) || list.length === 0) return FALLBACK_DIFFICULTY_OPTIONS
  const palette = ['success', 'warning', 'danger', 'info']
  return list.map((item, idx) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { value: String(item), label: String(item), tagType: palette[idx % palette.length] }
    }
    return {
      value: String(item.value ?? item.code ?? item.difficulty ?? item.key ?? idx),
      label: item.label ?? item.name ?? item.text ?? String(item.value),
      tagType: item.tagType ?? item.color ?? palette[idx % palette.length],
    }
  })
}

/**
 * 动态加载难度选项（结果缓存 5 分钟；失败静默使用兜底，不阻断页面）
 * @returns {Promise<Array<{value:string,label:string,tagType:string}>>}
 */
let difficultyPromise = null
export function getDifficultyOptions({ force = false } = {}) {
  if (difficultyPromise && !force) return difficultyPromise
  difficultyPromise = request
    .get(ENDPOINTS.difficultyOptions)
    .then(normalizeDifficultyOptions)
    .catch(() => FALLBACK_DIFFICULTY_OPTIONS)
  // 5 分钟后允许重新拉取
  setTimeout(() => { difficultyPromise = null }, 5 * 60 * 1000)
  return difficultyPromise
}

// 3) 列表缓存：30s TTL；写操作后 clearProblemPageCache 主动失效
const problemPageCache = createTtlCache({ ttl: 30 * 1000 })
const cacheKeyOf = (params) => JSON.stringify(params)

export const clearProblemPageCache = () => problemPageCache.clear()
export const peekProblemPageCache = (params) => problemPageCache.peek(cacheKeyOf(params))
export const isProblemPageCacheFresh = (params) => problemPageCache.isFresh(cacheKeyOf(params))

/**
 * 4) 后端实体 → 前端视图模型
 * - id 统一转字符串：题目 ID 由后端雪花算法生成（18~19 位），
 *   request.js 已在 JSON 解析前把长整数转为字符串，这里再兜底一次。
 * - createUser/createTime 由后端维护，前端只展示不编辑。
 * - 后端字段名若不同（如 creator、gmtCreate），只在此处改映射。
 */
export function mapProblemFromApi(raw = {}) {
  return {
    id: raw.id == null ? '' : String(raw.id),
    title: raw.title ?? '',
    difficulty: raw.difficulty ?? '',
    createUser: raw.createUser ?? raw.creator ?? raw.createUserName ?? '',
    createTime: raw.createTime ?? raw.gmtCreate ?? '',
  }
}

/** 前端视图模型 → 后端提交体（新增/编辑；不提交 createUser/createTime） */
export function mapProblemToApi(problem = {}) {
  const body = {
    title: problem.title,
    difficulty: problem.difficulty,
  }
  // 编辑时带上字符串形式的雪花 ID；新增时不传（由后端雪花算法生成）
  if (problem.id) body.id = String(problem.id)
  return body
}

/** 分页结构兼容：{records,total} / {list,total} / {rows,totalCount} / 数组 */
export function normalizeProblemPage(res) {
  if (Array.isArray(res)) {
    return { records: res.map(mapProblemFromApi), total: res.length }
  }
  const rawList = res?.records ?? res?.list ?? res?.rows ?? res?.data ?? []
  const rawTotal = res?.total ?? res?.totalCount ?? res?.count ?? rawList.length
  return {
    records: (Array.isArray(rawList) ? rawList : []).map(mapProblemFromApi),
    total: Number(rawTotal) || 0,
  }
}

/**
 * 分页查询题目（难度筛选 + 标题模糊搜索 + 排序）
 * @param {Object} params { current, size, title?, difficulty?, sortField?, sortOrder? }
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] true 时跳过缓存
 */
export async function getProblemPage(params, { force = false } = {}) {
  const key = cacheKeyOf(params)
  if (!force) {
    const cached = problemPageCache.get(key)
    if (cached) return cached
  }
  const res = await request.get(ENDPOINTS.page, { params })
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
