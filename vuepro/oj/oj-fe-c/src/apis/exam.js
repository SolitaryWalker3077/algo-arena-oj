import service from '@/utils/request'

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

function toTimestamp(value) {
  if (!value) return null
  const timestamp = new Date(String(value).replace(' ', 'T')).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function inTimeRange(exam, params) {
  const startBoundary = toTimestamp(params.startTime)
  const endBoundary = toTimestamp(params.endTime)
  const examStart = toTimestamp(exam.startTime)
  const examEnd = toTimestamp(exam.endTime)

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
      if (error.status !== 404 || endpoint === endpoints.at(-1)) throw error
    }
  }

  throw lastError
}

async function loadExamData(query, signal) {
  if (!query.startTime && !query.endTime) {
    return normalizeResponse(await requestExamList(query, signal))
  }

  // 当前后端 Redis 列表命中时可能不应用时间条件。筛选场景按后端允许的
  // 最大页长拉取候选集，再在前端复核范围，确保不会展示范围外的数据。
  const batchSize = 500
  const firstPage = normalizeResponse(
    await requestExamList({ ...query, pageNum: 1, pageSize: batchSize }, signal),
  )
  const allRows = [...firstPage.rows]
  const pageCount = Math.ceil(firstPage.total / batchSize)

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = normalizeResponse(
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

export function clearExamListCache() {
  cache.clear()
}
