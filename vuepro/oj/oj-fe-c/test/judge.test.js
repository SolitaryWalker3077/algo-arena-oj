import assert from 'node:assert/strict'
import test from 'node:test'
import { formatSubmissionTime, normalizeJudgeResult, pollJudgeResult } from '../src/utils/judge.js'

test('查询时间采用上海时区 SQL 日期格式，保留提交前时间', () => {
  assert.equal(formatSubmissionTime(new Date('2026-10-08T01:02:03Z')), '2026-10-08 09:02:03')
})

test('真实判题结果保留编译错误与测试点输入输出，不捏造性能数据', () => {
  const result = normalizeJudgeResult({ data: { pass: 0, exeMessage: '编译失败\nMain.java:3', userExeResultList: [
    { input: '1 2', output: '3', exeOutput: '4' },
    { input: '2 2', output: '4', exeOutput: '4' },
  ] } })
  assert.equal(result.accepted, false)
  assert.equal(result.message, '编译失败\nMain.java:3')
  assert.deepEqual(result.cases.map((item) => item.passed), [false, true])
  assert.equal(result.cases[0].exeOutput, '4')
  assert.equal('time' in result, false)
  assert.throws(() => normalizeJudgeResult({ data: {} }), /格式异常/)
  assert.throws(() => normalizeJudgeResult({ data: { pass: null } }), /格式异常/)
  assert.throws(() => normalizeJudgeResult({ data: { pass: 1, userExeResultList: [null] } }), /格式异常/)
})

test('未提交和判题中继续查询，仅最终 pass=1 显示通过', async () => {
  const states = [2, 3, 1]
  const result = await pollJudgeResult(async () => ({ data: { pass: states.shift() } }), { wait: async () => {} })
  assert.equal(result.accepted, true)
  assert.equal(states.length, 0)
})

test('网络短暂故障重试，长期故障或认证错误结束查询', async () => {
  let calls = 0
  const networkError = Object.assign(new Error('网络故障'), { retryable: true })
  const result = await pollJudgeResult(async () => {
    if (++calls < 3) throw networkError
    return { data: { pass: 0, exeMessage: '超时' } }
  }, { wait: async () => {} })
  assert.equal(result.accepted, false)
  assert.equal(calls, 3)
  calls = 0
  await assert.rejects(pollJudgeResult(async () => { calls++; throw networkError }, { wait: async () => {} }), /网络故障/)
  assert.equal(calls, 3)
  calls = 0
  await assert.rejects(pollJudgeResult(async () => { calls++; throw Object.assign(new Error('登录失效'), { code: 3001 }) }), /登录失效/)
  assert.equal(calls, 1)
})

test('判题等待次数有上限，退出页面可取消，迟到结果不会返回', async () => {
  await assert.rejects(pollJudgeResult(async () => ({ data: { pass: 3 } }), { maxAttempts: 2, wait: async () => {} }), /无需重复提交/)
  const controller = new AbortController()
  await assert.rejects(pollJudgeResult(async () => {
    controller.abort()
    return { data: { pass: 1 } }
  }, { signal: controller.signal }), { name: 'AbortError' })
})
