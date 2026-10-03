import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDifficultyMeta,
  normalizeQuestionList,
  normalizeQuestionParams,
} from '../src/utils/questionList.js'

test('题目查询参数会清理空白并校验分页与难度', () => {
  assert.deepEqual(
    normalizeQuestionParams({ keyword: '  二分查找  ', difficult: '2', pageNum: '3', pageSize: '20' }),
    { keyword: '二分查找', difficult: 2, pageNum: 3, pageSize: 20 },
  )
  assert.deepEqual(
    normalizeQuestionParams({ keyword: '  ', difficult: 9, pageNum: 0, pageSize: 9999 }),
    { pageNum: 1, pageSize: 500 },
  )
})

test('题目列表保留大整数 ID 字符串并规范化展示字段', () => {
  const result = normalizeQuestionList({
    rows: [
      { questionId: '9007199254740993124', title: '  两数之和  ', difficult: '1' },
      { questionId: 42, title: '', difficult: 8 },
      null,
    ],
    total: '12',
  })

  assert.deepEqual(result, {
    rows: [
      { questionId: '9007199254740993124', title: '两数之和', difficult: 1 },
      { questionId: '42', title: '未命名题目', difficult: 0 },
    ],
    total: 12,
  })
})

test('异常列表结构会抛出可读错误', () => {
  assert.throws(() => normalizeQuestionList({ data: [] }), /题目数据格式异常/)
})

test('题目难度兼容未知值', () => {
  assert.deepEqual(getDifficultyMeta(3), { label: '困难', tone: 'hard' })
  assert.deepEqual(getDifficultyMeta(99), { label: '未分类', tone: 'unknown' })
})

