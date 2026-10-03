export const QUESTION_PAGE_SIZES = Object.freeze([10, 20, 30, 50])

const DIFFICULTY_META = Object.freeze({
  1: { label: '简单', tone: 'easy' },
  2: { label: '中等', tone: 'medium' },
  3: { label: '困难', tone: 'hard' },
})

function positiveInteger(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export function normalizeQuestionParams(params = {}) {
  const pageSize = positiveInteger(params.pageSize, 10, 500)
  const normalized = {
    pageNum: positiveInteger(params.pageNum, 1, 1_000_000),
    pageSize,
  }
  const keyword = typeof params.keyword === 'string' ? params.keyword.trim() : ''
  const difficult = Number(params.difficult)

  if (keyword) normalized.keyword = keyword.slice(0, 100)
  if (DIFFICULTY_META[difficult]) normalized.difficult = difficult
  return normalized
}

export function normalizeQuestionList(payload) {
  if (!payload || !Array.isArray(payload.rows)) {
    throw new Error('题目数据格式异常，请稍后重试')
  }

  const rows = payload.rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => ({
      questionId: row.questionId == null ? '' : String(row.questionId),
      title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : '未命名题目',
      difficult: DIFFICULTY_META[Number(row.difficult)] ? Number(row.difficult) : 0,
    }))

  return {
    rows,
    total: Math.max(0, Number(payload.total) || 0),
  }
}

export function getDifficultyMeta(difficult) {
  return DIFFICULTY_META[Number(difficult)] || { label: '未分类', tone: 'unknown' }
}

