import test from 'node:test'
import assert from 'node:assert/strict'
import { filterQuestionSummaries, getDifficultyLabel, normalizeQuestionSummary } from '../src/utils/question.js'

test('兼容后端 difficult 字段并规范化题目摘要', () => {
  const result = normalizeQuestionSummary({ questionId: 9, title: '示例', difficult: 2, passRate: 48 })
  assert.equal(result.questionId, '9')
  assert.equal(result.difficulty, 2)
  assert.equal(result.acceptedRate, 48)
  assert.deepEqual(result.tags, [])
})

test('题目搜索同时匹配标题、标签和难度', () => {
  const rows = [
    { title: '两数之和', difficulty: 1, tags: ['数组'] },
    { title: '编辑距离', difficulty: 3, tags: ['动态规划'] },
  ]
  assert.deepEqual(filterQuestionSummaries(rows, { keyword: '动态', difficulty: 3 }), [rows[1]])
  assert.deepEqual(filterQuestionSummaries(rows, { keyword: '数组' }), [rows[0]])
})

test('未知难度返回稳定文案', () => {
  assert.equal(getDifficultyLabel(3), '困难')
  assert.equal(getDifficultyLabel(99), '未知')
})

