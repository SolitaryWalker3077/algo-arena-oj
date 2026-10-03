export function getDifficultyLabel(value) {
  return ({ 1: '简单', 2: '中等', 3: '困难' })[Number(value)] || '未知'
}

export function normalizeQuestionSummary(row, index = 0) {
  const difficulty = Number(row?.difficulty ?? row?.difficult) || 1
  return {
    ...row,
    questionId: String(row?.questionId ?? `question-${index}`),
    title: row?.title || '未命名题目',
    difficulty,
    acceptedRate: Math.min(100, Math.max(0, Number(row?.acceptedRate ?? row?.passRate ?? (72 - difficulty * 8 - index)) || 0)),
    tags: Array.isArray(row?.tags) ? row.tags : [],
    solved: Boolean(row?.solved ?? row?.pass),
  }
}

export function filterQuestionSummaries(rows, filters = {}) {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  return rows.filter((item) => {
    const difficulty = Number(item.difficulty ?? item.difficult)
    const matchesDifficulty = !filters.difficulty || difficulty === Number(filters.difficulty)
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : ''
    const haystack = `${item.title || ''} ${tags}`.toLowerCase()
    return matchesDifficulty && (!keyword || haystack.includes(keyword))
  })
}

