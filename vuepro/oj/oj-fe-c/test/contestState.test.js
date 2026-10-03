import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONTEST_ACTION,
  CONTEST_PHASE,
  belongsToContestList,
  formatContestTime,
  getContestPhase,
  getContestPresentation,
  requiresContestAuthentication,
  toContestTimestamp,
} from '../src/utils/contestState.js'

const now = new Date(2026, 9, 3, 12, 0, 0).getTime()
const upcoming = { startTime: '2026-10-03 13:00:00', endTime: '2026-10-03 15:00:00' }
const ongoing = { startTime: '2026-10-03 11:00:00', endTime: '2026-10-03 15:00:00' }
const ended = { startTime: '2026-10-03 09:00:00', endTime: '2026-10-03 11:00:00' }

test('未开赛且未报名时显示报名参赛', () => {
  const state = getContestPresentation({ ...upcoming, enter: false }, now)
  assert.equal(state.phase, CONTEST_PHASE.UPCOMING)
  assert.deepEqual(state.actions.map((item) => item.type), [CONTEST_ACTION.REGISTER])
})

test('未开赛且已报名时仅显示已报名标签', () => {
  const state = getContestPresentation({ ...upcoming, enter: true }, now)
  assert.equal(state.tag.label, '已报名')
  assert.deepEqual(state.actions, [])
})

test('已开赛但未报名时仅显示已开赛标签', () => {
  const state = getContestPresentation({ ...ongoing, enter: false }, now)
  assert.equal(state.tag.label, '已开赛')
  assert.deepEqual(state.actions, [])
})

test('竞赛中且已报名时显示开始答题', () => {
  const state = getContestPresentation({ ...ongoing, enter: true }, now)
  assert.deepEqual(state.actions.map((item) => item.type), [CONTEST_ACTION.ANSWER])
})

test('竞赛结束后显示练习和排名，与报名状态无关', () => {
  for (const enter of [false, true]) {
    const state = getContestPresentation({ ...ended, enter }, now)
    assert.equal(state.phase, CONTEST_PHASE.ENDED)
    assert.deepEqual(
      state.actions.map((item) => item.type),
      [CONTEST_ACTION.PRACTICE, CONTEST_ACTION.RANKING],
    )
  }
})

test('边界时刻分别进入开赛和结束状态', () => {
  assert.equal(getContestPhase(upcoming, toContestTimestamp(upcoming.startTime)), CONTEST_PHASE.ONGOING)
  assert.equal(getContestPhase(ongoing, toContestTimestamp(ongoing.endTime)), CONTEST_PHASE.ENDED)
})

test('结束竞赛只属于历史列表，未结束竞赛只属于未完赛列表', () => {
  assert.equal(belongsToContestList(ended, 'unfinished', now), false)
  assert.equal(belongsToContestList(ended, 'history', now), true)
  assert.equal(belongsToContestList(ongoing, 'unfinished', now), true)
  assert.equal(belongsToContestList(upcoming, 'history', now), false)
})

test('答题、练习和排名入口均要求登录', () => {
  assert.equal(requiresContestAuthentication(CONTEST_ACTION.ANSWER), true)
  assert.equal(requiresContestAuthentication(CONTEST_ACTION.PRACTICE), true)
  assert.equal(requiresContestAuthentication(CONTEST_ACTION.RANKING), true)
  assert.equal(requiresContestAuthentication(CONTEST_ACTION.REGISTER), false)
})

test('兼容 LocalDateTime 数组并格式化到分钟', () => {
  assert.equal(formatContestTime([2026, 10, 3, 9, 5, 8]), '2026-10-03 09:05')
})

