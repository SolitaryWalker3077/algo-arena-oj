const pad = (value) => String(value).padStart(2, '0')

/** Parse the backend's LocalDateTime as local wall time; explicit offsets are converted. */
export function parseContestTimestamp(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.getTime()
  }
  if (Array.isArray(value)) {
    if (value.length < 5) return null
    value = `${value[0]}-${pad(value[1])}-${pad(value[2])}T${pad(value[3])}:${pad(value[4])}:${pad(value[5] ?? 0)}`
  }
  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/,
  )
  if (!match) return null
  const [, year, month, day, hour, minute, second = '00', fraction = '', zone] = match
  const parts = [year, month, day, hour, minute, second].map(Number)
  const millis = Number(fraction.padEnd(3, '0').slice(0, 3))
  const [y, m, d, h, min, sec] = parts
  const date = zone
    ? new Date(Date.UTC(y, m - 1, d, h, min, sec, millis))
    : new Date(y, m - 1, d, h, min, sec, millis)
  const valid = zone
    ? date.getUTCFullYear() === y &&
      date.getUTCMonth() + 1 === m &&
      date.getUTCDate() === d &&
      date.getUTCHours() === h &&
      date.getUTCMinutes() === min &&
      date.getUTCSeconds() === sec
    : date.getFullYear() === y &&
      date.getMonth() + 1 === m &&
      date.getDate() === d &&
      date.getHours() === h &&
      date.getMinutes() === min &&
      date.getSeconds() === sec
  if (!valid) return null
  if (!zone || zone === 'Z') return date.getTime()
  const offsetMinutes = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))
  if (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59) return null
  return date.getTime() - (zone[0] === '+' ? 1 : -1) * offsetMinutes * 60000
}

/** Backend LocalDateTime values have no timezone; keep their wall-clock time unchanged. */
export function formatContestTime(value, seconds = false) {
  const timestamp = parseContestTimestamp(value)
  if (timestamp == null) return '—'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}${seconds ? `:${pad(date.getSeconds())}` : ''}`
}

export const shortenTitle = (title) =>
  Array.from(String(title ?? '')).length > 30
    ? `${Array.from(String(title)).slice(0, 30).join('')}…`
    : String(title ?? '')

export function mapContest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return {
    id: raw.examId == null ? '' : String(raw.examId),
    title: String(raw.title ?? ''),
    startTime: raw.startTime ?? '',
    endTime: raw.endTime ?? '',
    status: Number(raw.status),
    createName: String(raw.createName ?? ''),
    createTime: raw.createTime ?? '',
  }
}

export function normalizeContestPage(response) {
  const rows = Array.isArray(response) ? response : response?.rows
  if (!Array.isArray(rows)) throw new Error('竞赛列表数据格式异常，请联系技术支持')
  const records = rows.map(mapContest).filter(Boolean)
  records.sort((left, right) => {
    const leftTime = parseContestTimestamp(left.createTime)
    const rightTime = parseContestTimestamp(right.createTime)
    if (leftTime == null) return rightTime == null ? 0 : 1
    if (rightTime == null) return -1
    return rightTime - leftTime
  })
  const total = Number(Array.isArray(response) ? records.length : response.total)
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error('竞赛总数数据格式异常，请联系技术支持')
  return { records, total }
}

/** Only send parameters accepted by the existing ExamQueryDto. */
export function normalizeContestQuery(query = {}) {
  const pageNum = Number(query.current ?? query.pageNum ?? 1)
  const pageSize = Number(query.size ?? query.pageSize ?? 10)
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000000)
    throw new Error('页码格式不正确')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500)
    throw new Error('每页条数格式不正确')
  const result = { pageNum, pageSize }
  if (query.title) result.title = String(query.title).trim()
  if (query.startTime) result.startTime = String(query.startTime)
  if (query.endTime) result.endTime = String(query.endTime)
  return result
}

export const invalidEndTime = (row) => {
  const start = parseContestTimestamp(row.startTime)
  const end = parseContestTimestamp(row.endTime)
  return start != null && end != null && end <= start
}

/** Inclusive start and exclusive end; malformed or reversed ranges are explicit states. */
export const getContestPhase = (row, now = Date.now()) => {
  const start = parseContestTimestamp(row.startTime)
  const end = parseContestTimestamp(row.endTime)
  if (start == null || end == null) return 'unknown'
  if (end <= start) return 'invalid'
  if (now < start) return 'upcoming'
  if (now >= end) return 'ended'
  return 'ongoing'
}

export const hasStarted = (row, now = Date.now()) => {
  const start = parseContestTimestamp(row.startTime)
  return start != null && now >= start
}
