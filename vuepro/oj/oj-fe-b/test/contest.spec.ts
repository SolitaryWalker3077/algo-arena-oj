import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, deleteRequest } = vi.hoisted(() => ({ get: vi.fn(), deleteRequest: vi.fn() }))
vi.mock('@/utils/request', () => ({ default: { get, delete: deleteRequest } }))

import {
  clearContestResultsCache,
  deleteContestQuestion,
  getContestDetail,
  getContestPage,
  getContestResults,
} from '../src/api/contest'
import {
  formatContestTime,
  getContestPhase,
  hasStarted,
  invalidEndTime,
  normalizeContestPage,
  normalizeContestQuery,
  parseContestTimestamp,
  shortenTitle,
} from '../src/api/contestPolicy'

const row = (title: string, status = 0, createName = '张三') => ({
  title,
  status,
  createName,
  startTime: '2026-09-21T09:00:00',
  endTime: '2026-09-21T11:00:00',
  createTime: '2026-09-20 10:00:00',
})

beforeEach(() => {
  get.mockReset()
  deleteRequest.mockReset()
  clearContestResultsCache()
})

describe('contest backend contract', () => {
  it('deletes a contest question with exact string IDs', async () => {
    deleteRequest.mockResolvedValue(undefined)
    await deleteContestQuestion('9007199254740993123', '9007199254740993124')
    expect(deleteRequest).toHaveBeenCalledWith('/system/exam/question/delete', {
      params: {
        examId: '9007199254740993123',
        questionId: '9007199254740993124',
      },
    })
    expect(() => deleteContestQuestion('bad-id', '1')).toThrow('竞赛ID无效')
    expect(() => deleteContestQuestion('1', 'bad-id')).toThrow('题目ID无效')
  })

  it('requests details with the exact contest ID and validates the payload', async () => {
    const id = '9007199254740993123'
    const detail = {
      title: '算法赛',
      startTime: '2026-09-22 09:00:00',
      endTime: '2026-09-22 11:00:00',
      examQuestionList: [{ questionId: '9007199254740993124', title: '两数之和', difficult: 1 }],
    }
    get.mockResolvedValueOnce(detail).mockResolvedValueOnce({ ...detail, examQuestionList: {} })
    expect(await getContestDetail(id)).toEqual(detail)
    expect(get).toHaveBeenCalledWith('/system/exam/detail', { params: { examId: id } })
    await expect(getContestDetail(id)).rejects.toThrow('数据格式异常')
    await expect(getContestDetail('bad-id')).rejects.toThrow('竞赛ID无效')
  })

  it('orders each returned page by newest creation time', () => {
    const page = normalizeContestPage({
      rows: [
        { ...row('Older'), createTime: '2026-09-20 10:00:00' },
        { ...row('Newest'), createTime: '2026-09-21 10:00:00' },
      ],
      total: 2,
    })
    expect(page.records.map((contest) => contest?.title)).toEqual(['Newest', 'Older'])
  })

  it('refetches advanced-filter results after cache invalidation', async () => {
    get
      .mockResolvedValueOnce({ rows: [row('Older')], total: 1 })
      .mockResolvedValueOnce({ rows: [row('Newest')], total: 1 })
    const query = { status: 0, sortField: 'createTime', sortOrder: 'desc' }
    const first = await getContestResults(query)
    clearContestResultsCache()
    const refreshed = await getContestResults(query)
    expect(first.records[0].title).toBe('Older')
    expect(refreshed.records[0].title).toBe('Newest')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('sends only page, title and time fields supported by ExamQueryDto', async () => {
    get.mockResolvedValue({ code: 1000, rows: [row('算法赛')], total: 1 })
    const page = await getContestPage({
      pageNum: 2,
      pageSize: 20,
      title: ' 算法 ',
      startTime: '2026-09-01 00:00:00',
      endTime: '2026-09-30 23:59:59',
      status: 1,
      createName: '张三',
      sortField: 'title',
    })
    expect(get).toHaveBeenCalledWith('/system/exam/list', {
      params: {
        pageNum: 2,
        pageSize: 20,
        title: '算法',
        startTime: '2026-09-01 00:00:00',
        endTime: '2026-09-30 23:59:59',
      },
      timeout: 30000,
    })
    expect(page).toMatchObject({ total: 1, records: [{ title: '算法赛', status: 0 }] })
  })

  it('filters and sorts across all matching server pages', async () => {
    const many = Array.from({ length: 500 }, (_, index) => row(`赛${index}`, 0))
    get
      .mockResolvedValueOnce({ rows: many, total: 501 })
      .mockResolvedValueOnce({ rows: [row('目标赛', 1, '李四')], total: 501 })
    const page = await getContestResults({
      pageNum: 1,
      pageSize: 10,
      title: 'unique-filter-test',
      status: 1,
      createName: '李',
      sortField: 'title',
      sortOrder: 'asc',
    })
    expect(get).toHaveBeenCalledTimes(2)
    expect(page).toMatchObject({ total: 1, records: [{ title: '目标赛' }] })
  })

  it('sorts numeric status and reuses the complete result for another page', async () => {
    get.mockResolvedValue({ rows: [row('乙赛', 1), row('甲赛', 0)], total: 2 })
    const query = {
      pageNum: 1,
      pageSize: 10,
      title: 'cache-sort-test',
      sortField: 'status',
      sortOrder: 'asc',
    }
    const first = await getContestResults(query)
    const second = await getContestResults({ ...query, pageNum: 2 })
    expect(first.records.map((contest: { status: number }) => contest.status)).toEqual([0, 1])
    expect(second).toEqual({ records: [], total: 2 })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('passes shared pagination state as backend pageNum/pageSize', async () => {
    get.mockResolvedValue({ rows: [], total: 0 })
    await getContestPage({ current: 3, size: 17 })
    expect(get).toHaveBeenCalledWith('/system/exam/list', {
      params: { pageNum: 3, pageSize: 17 },
      timeout: 30000,
    })
  })

  it('sorts contest phases and date columns across the complete result', async () => {
    const future = {
      ...row('未来赛'),
      startTime: '2999-09-21T09:00:00',
      endTime: '2999-09-21T11:00:00',
    }
    const ended = {
      ...row('结束赛'),
      startTime: '2000-09-21T09:00:00',
      endTime: '2000-09-21T11:00:00',
    }
    get.mockResolvedValue({ rows: [ended, future], total: 2 })
    const phases = await getContestResults({
      current: 1,
      size: 10,
      title: 'phase-sort-test',
      sortField: 'phase',
      sortOrder: 'asc',
    })
    expect(phases.records.map((contest: { title: string }) => contest.title)).toEqual([
      '未来赛',
      '结束赛',
    ])
    const dates = await getContestResults({
      current: 1,
      size: 10,
      title: 'phase-sort-test',
      sortField: 'startTime',
      sortOrder: 'desc',
    })
    expect(dates.records.map((contest: { title: string }) => contest.title)).toEqual([
      '未来赛',
      '结束赛',
    ])
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('keeps backend pagination when advanced filters are absent', async () => {
    get.mockResolvedValue({ rows: [row('直接分页')], total: 21 })
    const page = await getContestResults({
      pageNum: 2,
      pageSize: 10,
      sortField: 'createTime',
      sortOrder: 'desc',
    })
    expect(page.total).toBe(21)
    expect(get).toHaveBeenCalledWith('/system/exam/list', {
      params: { pageNum: 2, pageSize: 10 },
      timeout: 30000,
    })
  })

  it('rejects malformed and oversized responses', async () => {
    expect(() => normalizeContestPage({ rows: 'broken', total: 1 })).toThrow('格式异常')
    expect(() => normalizeContestPage({ rows: [], total: -1 })).toThrow('总数')
    get.mockResolvedValue({ rows: [], total: 50001 })
    await expect(
      getContestResults({
        pageNum: 1,
        pageSize: 10,
        status: 0,
        sortField: 'createTime',
        sortOrder: 'desc',
      }),
    ).rejects.toThrow('数据量过大')
  })
})

describe('contest display and query rules', () => {
  it('formats LocalDateTime without changing its wall-clock hour', () => {
    expect(formatContestTime('2026-09-21T09:05:03.123')).toBe('2026-09-21 09:05')
    expect(formatContestTime([2026, 9, 21, 9, 5, 3], true)).toBe('2026-09-21 09:05:03')
    expect(formatContestTime('2026-02-30 09:00:00')).toBe('—')
    expect(formatContestTime('')).toBe('—')
    expect(formatContestTime([2026, 9])).toBe('—')
    expect(formatContestTime('not a date')).toBe('—')
    expect(formatContestTime(Date.UTC(2026, 8, 21, 9, 5, 3), true)).toMatch(
      /^2026-09-21 \d{2}:05:03$/,
    )
  })

  it('shortens 30-character titles and detects invalid dates', () => {
    expect(shortenTitle('甲'.repeat(30))).toBe('甲'.repeat(30))
    expect(shortenTitle('甲'.repeat(31))).toBe(`${'甲'.repeat(30)}…`)
    expect(
      invalidEndTime({ startTime: '2026-09-21T11:00:00', endTime: '2026-09-21T09:00:00' }),
    ).toBe(true)
    expect(
      hasStarted(
        { startTime: '2026-09-21T09:00:00', endTime: '2026-09-21T10:00:00' },
        new Date('2026-09-21T09:01:00').getTime(),
      ),
    ).toBe(true)
  })

  it('classifies the complete time interval at exact boundaries', () => {
    const start = new Date('2026-09-21T09:00:00').getTime()
    const end = new Date('2026-09-21T11:00:00').getTime()
    const contest = { startTime: '2026-09-21T09:00:00', endTime: '2026-09-21T11:00:00' }
    expect(getContestPhase(contest, start - 1)).toBe('upcoming')
    expect(getContestPhase(contest, start)).toBe('ongoing')
    expect(getContestPhase(contest, end - 1)).toBe('ongoing')
    expect(getContestPhase(contest, end)).toBe('ended')
    expect(hasStarted(contest, start - 1)).toBe(false)
    expect(hasStarted(contest, start)).toBe(true)
    expect(hasStarted(contest, end)).toBe(true)
    expect(getContestPhase({ ...contest, endTime: contest.startTime }, start)).toBe('invalid')
    expect(getContestPhase({ ...contest, endTime: 'broken' }, start)).toBe('unknown')
    expect(invalidEndTime({ ...contest, endTime: contest.startTime })).toBe(true)
    expect(hasStarted({ ...contest, endTime: contest.startTime }, start)).toBe(true)
    expect(hasStarted({ ...contest, endTime: 'broken' }, start - 1)).toBe(false)
  })

  it('compares explicit offsets as instants without losing milliseconds', () => {
    const start = '2026-09-21T09:00:00.500+08:00'
    const end = '2026-09-21T09:00:01.000+08:00'
    expect(parseContestTimestamp(start)).toBe(Date.parse('2026-09-21T01:00:00.500Z'))
    expect(
      getContestPhase({ startTime: start, endTime: end }, Date.parse('2026-09-21T01:00:00.999Z')),
    ).toBe('ongoing')
    expect(
      getContestPhase({ startTime: start, endTime: end }, Date.parse('2026-09-21T01:00:01.000Z')),
    ).toBe('ended')
    expect(parseContestTimestamp('2026-02-30T09:00:00Z')).toBeNull()
    expect(parseContestTimestamp('2026-09-21T09:00:00+25:00')).toBeNull()
  })

  it('validates numeric pagination and excludes unsupported filters', () => {
    expect(
      normalizeContestQuery({ pageNum: '2', pageSize: '50', status: 1, createName: '张三' }),
    ).toEqual({ pageNum: 2, pageSize: 50 })
    expect(() => normalizeContestQuery({ pageNum: 0 })).toThrow('页码')
    expect(() => normalizeContestQuery({ pageSize: 501 })).toThrow('每页')
    expect(() => normalizeContestQuery({ pageSize: 'abc' })).toThrow('每页')
    expect(normalizeContestPage([row('数组响应'), null])).toMatchObject({
      total: 1,
      records: [{ title: '数组响应' }],
    })
  })
})
