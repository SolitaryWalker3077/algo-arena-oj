import assert from 'node:assert/strict'
import test from 'node:test'
import {
  keepPageInRange,
  normalizePageSize,
  PAGE_SIZE_OPTIONS,
} from '../src/utils/pagination.js'

test('每页条数提供标准下拉选项', () => {
  assert.deepEqual(PAGE_SIZE_OPTIONS, [10, 20, 50, 100])
})

test('自定义每页条数支持 1-500 的整数', () => {
  assert.equal(normalizePageSize('1'), 1)
  assert.equal(normalizePageSize(' 256 '), 256)
  assert.equal(normalizePageSize(500), 500)
})

test('非数字、小数和超出范围的条数会给出明确错误', () => {
  assert.throws(() => normalizePageSize('abc'), /必须是整数/)
  assert.throws(() => normalizePageSize('10.5'), /必须是整数/)
  assert.throws(() => normalizePageSize(-1), /1-500/)
  assert.throws(() => normalizePageSize(0), /1-500/)
  assert.throws(() => normalizePageSize(501), /1-500/)
})

test('切换每页条数保留有效当前页，超出时回退到最后页', () => {
  assert.equal(keepPageInRange(3, 1000, 50), 3)
  assert.equal(keepPageInRange(8, 120, 50), 3)
  assert.equal(keepPageInRange(4, 0, 100), 1)
})
