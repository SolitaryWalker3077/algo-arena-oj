import assert from 'node:assert/strict'
import test from 'node:test'
import { adjacentQuestionId, normalizeQuestionDetail, questionBoundaryMessage } from '../src/utils/questionDetail.js'

test('题目详情使用后端 content/difficult/defaultCode，缺失字段不混入演示题', () => {
  const detail = normalizeQuestionDetail({ data: {
    questionId: '123456789012345678', title: '真实题目', difficult: 2,
    content: '<p>完整题目内容</p><p>第二段</p>', defaultCode: 'class Main {}',
    options: ['A', { text: 'B' }], timeLimit: 2000, spaceLimit: 262144,
  } }, '123456789012345678')
  assert.equal(detail.questionId, '123456789012345678')
  assert.equal(detail.title, '真实题目')
  assert.equal(detail.difficulty, 2)
  assert.match(detail.description, /完整题目内容\n+第二段/)
  assert.deepEqual(detail.options, ['A', 'B'])
  assert.deepEqual(detail.examples, [])
  assert.equal(detail.inputDescription, '')
  assert.equal(detail.defaultCode, 'class Main {}')
})

test('空详情和编号不匹配均提示错误，不显示错误题目', () => {
  assert.throws(() => normalizeQuestionDetail({ data: null }, '1'), /不存在/)
  assert.throws(() => normalizeQuestionDetail({ data: { questionId: '2', title: '其他题', content: '正文' } }, '1'), /编号不匹配/)
  assert.throws(() => normalizeQuestionDetail({ data: { questionId: '1', title: '空题' } }, '1'), /缺少内容/)
})

test('上一题下一题响应只接受有效编号，保留大整数 ID', () => {
  assert.equal(adjacentQuestionId({ data: '123456789012345678' }), '123456789012345678')
  assert.throws(() => adjacentQuestionId({ data: null }), /编号/)
  assert.throws(() => adjacentQuestionId({ data: 'undefined' }), /编号无效/)
})

test('后端边界错误码转为明确提示，其他错误不冒充边界', () => {
  assert.equal(questionBoundaryMessage('previous', { code: 3501 }), '这是第一题')
  assert.equal(questionBoundaryMessage('next', { code: 3502 }), '这是最后一题')
  assert.equal(questionBoundaryMessage('next', { code: 3501 }), '')
  assert.equal(questionBoundaryMessage('previous', { code: 500 }), '')
})
