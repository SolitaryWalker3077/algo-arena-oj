export const CONTEST_PHASE = Object.freeze({
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  ENDED: 'ended',
})

export const CONTEST_ACTION = Object.freeze({
  REGISTER: 'register',
  ANSWER: 'answer',
  PRACTICE: 'practice',
  RANKING: 'ranking',
})

const AUTHENTICATED_ACTIONS = new Set([
  CONTEST_ACTION.ANSWER,
  CONTEST_ACTION.PRACTICE,
  CONTEST_ACTION.RANKING,
])

export function requiresContestAuthentication(action) {
  return AUTHENTICATED_ACTIONS.has(action)
}

/**
 * 后端可能返回 ISO 字符串、`yyyy-MM-dd HH:mm:ss` 或 LocalDateTime 数组。
 */
export function toContestTimestamp(value) {
  if (!value) return null

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime()
    return Number.isFinite(timestamp) ? timestamp : null
  }

  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function formatContestTime(value) {
  const timestamp = toContestTimestamp(value)
  if (timestamp === null) return '时间待定'

  const date = new Date(timestamp)
  const pad = (part) => String(part).padStart(2, '0')
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}

export function getContestPhase(contest, now = Date.now()) {
  const start = toContestTimestamp(contest?.startTime)
  const end = toContestTimestamp(contest?.endTime)

  if (end !== null && now >= end) return CONTEST_PHASE.ENDED
  if (start !== null && now >= start) return CONTEST_PHASE.ONGOING
  return CONTEST_PHASE.UPCOMING
}

/** 保证未完赛与历史竞赛互斥，避免跨越结束时间后仍停留在错误列表。 */
export function belongsToContestList(contest, listType, now = Date.now()) {
  const ended = getContestPhase(contest, now) === CONTEST_PHASE.ENDED
  return listType === 'history' ? ended : !ended
}

/**
 * 设计图中的唯一状态判定入口，卡片与点击校验共用，避免文案和行为漂移。
 */
export function getContestPresentation(contest, now = Date.now()) {
  const phase = getContestPhase(contest, now)
  const entered = Boolean(contest?.enter)

  if (phase === CONTEST_PHASE.ENDED) {
    return {
      phase,
      phaseLabel: '已结束',
      tag: null,
      actions: [
        { type: CONTEST_ACTION.PRACTICE, label: '竞赛练习' },
        { type: CONTEST_ACTION.RANKING, label: '查看排名', secondary: true },
      ],
    }
  }

  if (phase === CONTEST_PHASE.ONGOING) {
    return entered
      ? {
          phase,
          phaseLabel: '进行中',
          tag: null,
          actions: [{ type: CONTEST_ACTION.ANSWER, label: '开始答题' }],
        }
      : {
          phase,
          phaseLabel: '进行中',
          tag: { label: '已开赛', tone: 'started' },
          actions: [],
        }
  }

  return entered
    ? {
        phase,
        phaseLabel: '即将开始',
        tag: { label: '已报名', tone: 'registered' },
        actions: [],
      }
    : {
        phase,
        phaseLabel: '即将开始',
        tag: null,
        actions: [{ type: CONTEST_ACTION.REGISTER, label: '报名参赛' }],
      }
}


