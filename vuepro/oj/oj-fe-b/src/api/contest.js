import request from '@/utils/request'
import {
  formatContestTime,
  getContestPhase,
  normalizeContestPage,
  normalizeContestQuery,
} from './contestPolicy'

const LIST_ENDPOINT = '/system/exam/list'
const CACHE_MS = 30000
let allRowsCache = null

export const clearContestResultsCache = () => {
  allRowsCache = null
}

export const getContestPage = async (query) => {
  const response = await request.get(LIST_ENDPOINT, {
    params: normalizeContestQuery(query),
    timeout: 30000,
  })
  return normalizeContestPage(response)
}

const requireId = (id, label) => {
  const value = String(id ?? '')
  if (!/^\d+$/.test(value)) throw new Error(`${label}无效`)
  return value
}

export const createContest = async (values) => {
  const result = await request.post('/system/exam/add', values)
  const id = result && typeof result === 'object' ? (result.examId ?? result.id) : result
  return id == null || id === '' ? '' : requireId(id, '新竞赛ID')
}

export const updateContest = (id, values) =>
  request.put('/system/exam/edit', { ...values, examId: requireId(id, '竞赛ID') })

export const getContestDetail = async (id) => {
  const detail = await request.get('/system/exam/detail', {
    params: { examId: requireId(id, '竞赛ID') },
  })
  if (
    !detail ||
    typeof detail !== 'object' ||
    Array.isArray(detail) ||
    typeof detail.title !== 'string' ||
    detail.startTime == null ||
    detail.endTime == null ||
    (detail.examQuestionList != null && !Array.isArray(detail.examQuestionList))
  ) {
    throw new Error('竞赛详情数据格式异常，请稍后重试')
  }
  return detail
}

export const addContestQuestions = (id, questionIds) =>
  request.post('/system/exam/question/add', {
    examId: requireId(id, '竞赛ID'),
    questionIdSet: questionIds.map((questionId) => requireId(questionId, '题目ID')),
  })

const requiresClientQuery = (query) =>
  (query.status !== '' && query.status != null) ||
  Boolean(query.createName) ||
  query.sortField !== 'createTime' ||
  query.sortOrder !== 'desc'

/**
 * ExamQueryDto has only title/time filters and fixed createTime DESC ordering.
 * Fetch all matching server pages only when a local status/creator/sort is needed.
 */
export async function getContestResults(query) {
  if (!requiresClientQuery(query)) return getContestPage(query)

  const { pageNum, pageSize } = normalizeContestQuery(query)

  const base = { title: query.title, startTime: query.startTime, endTime: query.endTime }
  const key = JSON.stringify(base)
  let rows
  if (allRowsCache?.key === key && Date.now() - allRowsCache.at < CACHE_MS) {
    rows = allRowsCache.rows
  } else {
    const first = await getContestPage({ ...base, pageNum: 1, pageSize: 500 })
    if (first.total > 50000) throw new Error('竞赛数据量过大，请缩小标题或时间范围后筛选')
    rows = [...first.records]
    const pages = Math.ceil(first.total / 500)
    for (let start = 2; start <= pages; start += 4) {
      const batch = Array.from(
        { length: Math.min(4, pages - start + 1) },
        (_, index) => start + index,
      )
      const results = await Promise.all(
        batch.map((pageNum) => getContestPage({ ...base, pageNum, pageSize: 500 })),
      )
      for (const page of results) rows.push(...page.records)
    }
    allRowsCache = { key, at: Date.now(), rows }
  }

  const filtered = rows.filter(
    (row) =>
      (query.status === '' || query.status == null || row.status === Number(query.status)) &&
      (!query.createName || row.createName.includes(query.createName.trim())),
  )
  const field = [
    'title',
    'startTime',
    'endTime',
    'status',
    'createName',
    'createTime',
    'phase',
  ].includes(query.sortField)
    ? query.sortField
    : 'createTime'
  const direction = query.sortOrder === 'asc' ? 1 : -1
  const now = Date.now()
  const phaseRank = { upcoming: 0, ongoing: 1, ended: 2, invalid: 3, unknown: 4 }
  filtered.sort((left, right) => {
    const a =
      field === 'phase'
        ? phaseRank[getContestPhase(left, now)]
        : field.endsWith('Time')
          ? formatContestTime(left[field], true)
          : left[field]
    const b =
      field === 'phase'
        ? phaseRank[getContestPhase(right, now)]
        : field.endsWith('Time')
          ? formatContestTime(right[field], true)
          : right[field]
    return direction * (typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'zh-CN'))
  })
  const start = (pageNum - 1) * pageSize
  return { records: filtered.slice(start, start + pageSize), total: filtered.length }
}
