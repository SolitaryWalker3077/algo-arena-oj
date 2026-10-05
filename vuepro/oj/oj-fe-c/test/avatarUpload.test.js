import assert from 'node:assert/strict'
import test from 'node:test'
import { createAvatarSaveTask, resolveAvatarUrl } from '../src/utils/avatarUpload.js'
import { validateAvatarFile, MAX_AVATAR_FILE_SIZE } from '../src/utils/profileImage.js'

test('上传完成后将文件标识传给头像接口，而非预览图片', async () => {
  const file = new File(['image'], 'avatar.png', { type: 'image/png' })
  const calls = []
  const save = createAvatarSaveTask(file, {
    upload: async (value) => {
      assert.equal(value, file)
      calls.push('upload')
      return { data: { success: true, name: 'unique.png' } }
    },
    update: async (payload) => {
      calls.push('update')
      assert.deepEqual(payload, { headImage: 'unique.png' })
    },
  })
  assert.equal(await save(), 'unique.png')
  assert.deepEqual(calls, ['upload', 'update'])
})

test('头像更新失败后重试复用已经上传的文件', async () => {
  let uploads = 0
  let updates = 0
  const save = createAvatarSaveTask({}, {
    upload: async () => { uploads++; return { data: { success: true, name: 'id.png' } } },
    update: async () => { if (++updates === 1) throw new Error('服务器异常') },
  })
  await assert.rejects(save(), /服务器异常/)
  assert.equal(await save(), 'id.png')
  assert.equal(uploads, 1)
  assert.equal(updates, 2)
})

test('上传网络失败时不调用头像更新，重试可恢复', async () => {
  let uploads = 0
  let updates = 0
  const save = createAvatarSaveTask({}, {
    upload: async () => {
      if (++uploads === 1) throw new Error('网络异常')
      return { data: { success: true, name: 'id.png' } }
    },
    update: async () => { updates++ },
  })
  await assert.rejects(save(), /网络异常/)
  assert.equal(updates, 0)
  await save()
  assert.equal(uploads, 2)
  assert.equal(updates, 1)
})

test('上传业务失败或响应缺少标识时绝不更新头像', async () => {
  for (const data of [null, {}, { success: false, name: 'id.png' }, { success: true, name: ' ' }, { success: true, name: 123 }]) {
    const save = createAvatarSaveTask({}, {
      upload: async () => ({ data }),
      update: async () => assert.fail('不应更新头像'),
    })
    await assert.rejects(save(), /文件标识/)
  }
})

test('文件校验拒绝空文件、超限文件和非图片，允许大小上界', () => {
  assert.throws(() => validateAvatarFile({ type: 'image/png', size: 0 }), /为空/)
  assert.throws(() => validateAvatarFile({ type: 'image/png', size: MAX_AVATAR_FILE_SIZE + 1 }), /5 MB/)
  assert.throws(() => validateAvatarFile({ type: 'image/svg+xml', size: 100 }), /格式/)
  assert.equal(validateAvatarFile({ type: 'image/jpeg', size: MAX_AVATAR_FILE_SIZE }), true)
})

test('头像文件名使用配置的下载前缀，完整地址和预览不改写', () => {
  assert.equal(resolveAvatarUrl('id.png', 'https://cdn.example.com/file/'), 'https://cdn.example.com/file/id.png')
  assert.equal(resolveAvatarUrl('https://cdn.example.com/id.png'), 'https://cdn.example.com/id.png')
  assert.equal(resolveAvatarUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc')
  assert.equal(resolveAvatarUrl('id.png'), '')
  assert.equal(resolveAvatarUrl(''), '')
})
