/**
 * 题目列表的纯数据策略。
 *
 * 该文件不依赖 Vue、Axios 或浏览器环境，集中负责请求参数校验与响应字段适配，
 * 既避免组件和接口层重复处理，也便于使用 Node 内置测试直接验证接口契约。
 */

export const PARAM_VALIDATION_CODE = 3002

export const BASE_DIFFICULTY_OPTIONS = Object.freeze([
  Object.freeze({ value: 1, label: '简单', tagType: 'success' }),
  Object.freeze({ value: 2, label: '中等', tagType: 'warning' }),
  Object.freeze({ value: 3, label: '困难', tagType: 'danger' }),
])

const createValidationError = (message) => {
  const error = new Error(message)
  error.code = PARAM_VALIDATION_CODE
  return error
}

const normalizeInteger = (value, fallback, label, max) => {
  const candidate = value ?? fallback
  const isScalar = typeof candidate === 'number' || typeof candidate === 'string'
  const number = isScalar && String(candidate).trim() !== '' ? Number(candidate) : Number.NaN

  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw createValidationError(`${label}必须是 1-${max} 之间的整数`)
  }
  return number
}

/**
 * 将前端通用分页参数转换为后端 QuestionQueryDto 参数。
 * 空的可选条件不会下发，避免空字符串与有效条件混淆。
 */
export function normalizeProblemQuery(params = {}) {
  const query = {
    pageNum: normalizeInteger(params.current ?? params.pageNum, 1, '页码', 1000000),
    pageSize: normalizeInteger(params.size ?? params.pageSize, 10, '每页条数', 500),
  }

  if (params.title != null) {
    if (typeof params.title !== 'string') {
      throw createValidationError('题目标题必须是文本')
    }
    const title = params.title.trim()
    if (title.length > 100) {
      throw createValidationError('题目标题不能超过 100 个字符')
    }
    if (title) query.title = title
  }

  const rawDifficult = params.difficult ?? params.difficulty
  if (rawDifficult !== '' && rawDifficult != null) {
    query.difficult = normalizeInteger(rawDifficult, undefined, '题目难度', 3)
  }

  return query
}

/** 后端 QuestionVO → 前端表格视图模型。 */
export function mapProblemFromApi(raw = {}) {
  const rawDifficult = raw.difficult ?? raw.difficulty
  let difficulty = ''
  if (rawDifficult !== '' && rawDifficult != null) {
    const numeric = Number(rawDifficult)
    difficulty = Number.isNaN(numeric) ? rawDifficult : numeric
  }

  return {
    // 雪花 ID 可超过 JavaScript 安全整数范围，页面始终使用字符串。
    id: raw.questionId == null ? (raw.id == null ? '' : String(raw.id)) : String(raw.questionId),
    title: raw.title ?? '',
    difficulty,
    createUser: raw.createName ?? raw.createUser ?? raw.creator ?? raw.createUserName ?? '',
    createTime: raw.createTime ?? raw.gmtCreate ?? '',
  }
}

/**
 * 将动态表单值转换为后端 QuestionAddDto / QuestionEditDto 请求体。
 * 仅允许后端契约中的字段通过，避免把编辑器语言等纯 UI 状态一并提交。
 */
export function buildProblemMutationPayload(problem = {}) {
  const body = {
    title: typeof problem.title === 'string' ? problem.title.trim() : problem.title,
    difficult:
      problem.difficulty == null || problem.difficulty === '' ? null : Number(problem.difficulty),
    timeLimit: problem.timeLimit == null ? null : Number(problem.timeLimit),
    spaceLimit: problem.spaceLimit == null ? null : Number(problem.spaceLimit),
    content: problem.content,
    questionCase: problem.questionCase || '',
    defaultCode: problem.defaultCode || '',
    mainFac: problem.mainFac,
  }

  // 编辑时带上字符串形式的雪花 ID；新增时由后端生成，不发送空 ID。
  if (problem.id) body.questionId = String(problem.id)
  return body
}

/**
 * 新增接口尚未返回完整 QuestionVO 时，先生成可展示的本地记录。
 * 后续列表刷新会用服务端记录替换它；pendingSync 用于暂时禁用编辑/删除操作。
 */
export function createOptimisticProblemRecord(values = {}, response = {}, now = new Date()) {
  const raw = response && typeof response === 'object' ? response : {}
  const record = mapProblemFromApi({
    questionId: raw.questionId ?? raw.id,
    title: raw.title ?? (typeof values.title === 'string' ? values.title.trim() : values.title),
    difficult: raw.difficult ?? raw.difficulty ?? values.difficulty,
    createName: raw.createName ?? raw.createUser,
    createTime: raw.createTime ?? formatProblemCreateTime(now),
  })

  return {
    ...record,
    pendingSync: !record.id,
  }
}

const padDatePart = (value) => String(value).padStart(2, '0')

const formatDateParts = (year, month, day, hour = 0, minute = 0, second = 0) => {
  const parts = [year, month, day, hour, minute, second].map(Number)
  if (parts.some((part) => !Number.isInteger(part))) return '—'

  const [y, m, d, h, min, s] = parts
  const date = new Date(y, m - 1, d, h, min, s)
  const valid =
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d &&
    date.getHours() === h &&
    date.getMinutes() === min &&
    date.getSeconds() === s
  if (!valid) return '—'

  return (
    `${String(y).padStart(4, '0')}-${padDatePart(m)}-${padDatePart(d)}` +
    ` ${padDatePart(h)}:${padDatePart(min)}:${padDatePart(s)}`
  )
}

/**
 * 统一题目创建时间为 YYYY-MM-DD HH:mm:ss。
 * 兼容 Java LocalDateTime 字符串、Jackson 数组以及 Date/时间戳；无效值显示占位符。
 */
export function formatProblemCreateTime(value) {
  if (value == null || value === '') return '—'

  if (Array.isArray(value)) {
    return value.length >= 3 ? formatDateParts(...value.slice(0, 6)) : '—'
  }

  if (value instanceof Date || typeof value === 'number') {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return formatDateParts(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    )
  }

  const text = typeof value === 'string' ? value.trim() : ''
  const match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.\d{1,9})?)?)?$/,
  )
  return match
    ? formatDateParts(match[1], match[2], match[3], match[4] ?? 0, match[5] ?? 0, match[6] ?? 0)
    : '—'
}

/** 兼容 TableDataInfo 以及历史分页结构，统一输出 records/total。 */
export function normalizeProblemPage(response) {
  if (Array.isArray(response)) {
    return { records: response.map(mapProblemFromApi), total: response.length }
  }

  const rawList = response?.rows ?? response?.records ?? response?.list ?? response?.data ?? []
  const records = (Array.isArray(rawList) ? rawList : []).map(mapProblemFromApi)
  const rawTotal = Number(
    response?.total ?? response?.totalCount ?? response?.count ?? records.length,
  )

  return {
    records,
    total: Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : records.length,
  }
}
