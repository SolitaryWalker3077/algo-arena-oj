const nonEmpty = (value) => typeof value === 'string' ? value.trim() : ''

export function questionBoundaryMessage(direction, error) {
  if (direction === 'previous' && Number(error?.code) === 3501) return '这是第一题'
  if (direction === 'next' && Number(error?.code) === 3502) return '这是最后一题'
  return ''
}

export function adjacentQuestionId(payload) {
  const id = payload?.data
  if (typeof id !== 'string' && typeof id !== 'number') throw new Error('未获取到相邻题目的编号，请重试')
  const result = String(id).trim()
  if (!/^\d+$/.test(result) || result === '0') throw new Error('相邻题目编号无效，请重试')
  return result
}

function plainText(value) {
  if (typeof value !== 'string') return ''
  const marked = value.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|pre|section)\b[^>]*>/gi, '\n')
  const stripped = marked.replace(/<[^>]*>/g, '')
  if (typeof document === 'undefined') return stripped.replace(/\n{3,}/g, '\n\n').trim()
  const decoder = document.createElement('textarea')
  decoder.innerHTML = stripped
  return decoder.value.replace(/\n{3,}/g, '\n\n').trim()
}

export function normalizeQuestionDetail(payload, requestedId) {
  const data = payload?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('题目不存在或详情为空')
  const id = String(data.questionId ?? '').trim()
  if (!/^\d+$/.test(id) || id !== String(requestedId)) throw new Error('服务器返回的题目编号不匹配，请重试')
  const title = nonEmpty(data.title)
  if (!title) throw new Error('题目详情缺少标题，请重试')
  if (!nonEmpty(data.content || data.description) && (!Array.isArray(data.options) || !data.options.length)) throw new Error('题目详情缺少内容，请重试')
  const options = Array.isArray(data.options)
    ? data.options.map((item) => typeof item === 'string' ? item : item?.content ?? item?.text ?? '').map(plainText).filter(Boolean)
    : []
  const examples = Array.isArray(data.examples)
    ? data.examples.map((item) => ({ input: plainText(item?.input), output: plainText(item?.output), explanation: plainText(item?.explanation) }))
    : []
  return {
    questionId: id,
    title,
    difficulty: Number(data.difficult ?? data.difficulty) || 0,
    timeLimit: data.timeLimit ?? null,
    spaceLimit: data.spaceLimit ?? null,
    description: plainText(data.content || data.description),
    inputDescription: plainText(data.inputDescription),
    outputDescription: plainText(data.outputDescription),
    options,
    examples,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === 'string') : [],
    defaultCode: nonEmpty(data.defaultCode),
  }
}
