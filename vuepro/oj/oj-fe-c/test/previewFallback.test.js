import test from 'node:test'
import assert from 'node:assert/strict'
import { withPreviewFallback } from '../src/utils/previewFallback.js'

test('请求成功时保留真实数据', async () => {
  const result = await withPreviewFallback(async () => ({ rows: [1] }), { rows: [] })
  assert.equal(result.preview, false)
  assert.deepEqual(result.data, { rows: [1] })
})

test('普通接口错误降级为独立的预览数据副本', async () => {
  const fallback = { rows: [{ id: 1 }] }
  const result = await withPreviewFallback(async () => { throw new Error('not implemented') }, fallback)
  result.data.rows[0].id = 2
  assert.equal(result.preview, true)
  assert.equal(fallback.rows[0].id, 1)
})

test('认证错误不会被预览数据掩盖', async () => {
  const error = new Error('expired')
  error.code = 3001
  await assert.rejects(() => withPreviewFallback(async () => { throw error }, {}), error)
})

