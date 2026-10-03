import service from '@/utils/request'
import { deduplicateContests, toContestTimestamp } from '@/utils/contestState'

const CACHE_TTL = 60 * 1000
const MAX_CACHE_ENTRIES = 24
const cache = new Map()
const pendingRequests = new Map()

function normalizeParams(params = {}) {
  const normalized = {
    type: Number(params.type) === 1 ? 1 : 0,
    pageNum: Math.max(1, Number(params.pageNum) || 1),
    pageSize: Math.min(500, Math.max(1, Number(params.pageSize) || 9)),
  }

  if (params.startTime) normalized.startTime = params.startTime
  if (params.endTime) normalized.endTime = params.endTime
  return normalized
}

function cacheKey(params) {
  return JSON.stringify(params)
}

function normalizeResponse(payload) {
  if (!payload || !Array.isArray(payload.rows)) {
    throw new Error('竞赛数据格式异常，请稍后重试')
  }

  return {
    rows: payload.rows.filter(Boolean),
    total: Math.max(0, Number(payload.total) || 0),
  }
}

function normalizeRows(payload) {
  const data = normalizeResponse(payload)
  const normalizedRows = data.rows.map((row) => ({
    ...row,
    examId: String(row.examId),
    enter: Boolean(row.enter),
  }))
  const rows = deduplicateContests(normalizedRows)
  const duplicateCount = normalizedRows.length - rows.length

  return {
    ...data,
    rows,
    // 兼容修复部署前已被重复写入的缓存页，至少保证当前页数量与卡片一致。
    total: Math.max(rows.length, data.total - duplicateCount),
  }
}

function inTimeRange(exam, params) {
  const startBoundary = toContestTimestamp(params.startTime)
  const endBoundary = toContestTimestamp(params.endTime)
  const examStart = toContestTimestamp(exam.startTime)
  const examEnd = toContestTimestamp(exam.endTime)

  if (startBoundary !== null && (examStart === null || examStart < startBoundary)) return false
  if (endBoundary !== null && (examEnd === null || examEnd > endBoundary)) return false
  return true
}

function saveCache(key, data) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    cache.delete(oldestKey)
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

async function requestExamList(params, signal) {
  // /dev-api 在开发环境代理到 /friend，当前仓库的 ExamController
  // 路由为 /exam/semiLogin/redis/list。同时兼容部署环境中的简化路由。
  const endpoints = ['/exam/semiLogin/redis/list', '/semiLogin/redis/list']
  let lastError

  for (const endpoint of endpoints) {
    try {
      return await service({
        url: endpoint,
        method: 'get',
        params,
        signal,
      })
    } catch (error) {
      lastError = error
      if (error.status !== 404 || endpoint === endpoints[endpoints.length - 1]) throw error
    }
  }

  throw lastError
}

async function loadExamData(query, signal) {
  if (!query.startTime && !query.endTime) {
    return normalizeRows(await requestExamList(query, signal))
  }

  // 当前后端 Redis 列表命中时可能不应用时间条件。筛选场景按后端允许的
  // 最大页长拉取候选集，再在前端复核范围，确保不会展示范围外的数据。
  const batchSize = 500
  const firstPage = normalizeRows(
    await requestExamList({ ...query, pageNum: 1, pageSize: batchSize }, signal),
  )
  const allRows = [...firstPage.rows]
  const pageCount = Math.ceil(firstPage.total / batchSize)

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = normalizeRows(
      await requestExamList({ ...query, pageNum: page, pageSize: batchSize }, signal),
    )
    allRows.push(...nextPage.rows)
  }

  const uniqueRows = [...new Map(allRows.map((row) => [String(row.examId), row])).values()]
  const filteredRows = uniqueRows.filter((row) => inTimeRange(row, query))
  const startIndex = (query.pageNum - 1) * query.pageSize

  return {
    rows: filteredRows.slice(startIndex, startIndex + query.pageSize),
    total: filteredRows.length,
  }
}

async function requestMyExamList(params, signal) {
  return service({
    url: '/user/exam/list',
    method: 'get',
    params,
    signal,
  })
}

async function loadMyExamData(query, signal) {
  if (!query.startTime && !query.endTime) {
    return normalizeRows(await requestMyExamList(query, signal))
  }

  const batchSize = 500
  const firstPage = normalizeRows(
    await requestMyExamList({ ...query, pageNum: 1, pageSize: batchSize }, signal),
  )
  const allRows = [...firstPage.rows]
  const pageCount = Math.ceil(firstPage.total / batchSize)

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = normalizeRows(
      await requestMyExamList({ ...query, pageNum: page, pageSize: batchSize }, signal),
    )
    allRows.push(...nextPage.rows)
  }

  const uniqueRows = [...new Map(allRows.map((row) => [row.examId, row])).values()]
  const filteredRows = uniqueRows.filter((row) => inTimeRange(row, query))
  const startIndex = (query.pageNum - 1) * query.pageSize

  return {
    rows: filteredRows.slice(startIndex, startIndex + query.pageSize),
    total: filteredRows.length,
  }
}

/**
 * 获取竞赛列表。缓存按分类、时间范围和页码隔离，并合并相同的并发请求。
 */
export async function getExamList(params = {}, options = {}) {
  const query = normalizeParams(params)
  const key = cacheKey(query)
  const cached = cache.get(key)

  if (!options.force && cached?.expiresAt > Date.now()) {
    return { ...cached.data, fromCache: true, stale: false }
  }

  if (!options.force && pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }

  const request = loadExamData(query, options.signal)
    .then((data) => {
      saveCache(key, data)
      return { ...data, fromCache: false, stale: false }
    })
    .catch((error) => {
      if (options.signal?.aborted) throw error
      if (cached?.data && error.retryable !== false) {
        return { ...cached.data, fromCache: true, stale: true, cacheError: error }
      }
      throw error
    })
    .finally(() => pendingRequests.delete(key))

  pendingRequests.set(key, request)
  return request
}

/** 获取当前登录用户已经报名的竞赛。 */
export async function getMyExamList(params = {}, options = {}) {
  const query = normalizeParams(params)
  const data = await loadMyExamData(query, options.signal)
  return {
    ...data,
    // 此接口返回的记录本身就是当前用户的报名记录。当前后端 SQL 未显式
    // 映射 enter 字段，因此在接口语义层统一修正为 true。
    rows: data.rows.map((row) => ({ ...row, enter: true })),
  }
}

/** 报名竞赛。后端会再次校验登录状态、竞赛时间和重复报名。 */
export async function enterExam(examId) {
  if (!examId || !/^\d+$/.test(String(examId))) {
    throw new Error('竞赛编号无效，请刷新页面后重试')
  }

  const result = await service({
    url: '/user/exam/enter',
    method: 'post',
    data: { examId: String(examId) },
  })
  clearExamListCache()
  return result
}

export function clearExamListCache() {
  cache.clear()
}
