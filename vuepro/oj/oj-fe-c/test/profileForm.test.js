import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProfileForm,
  createProfileUpdatePayload,
  validateProfileField,
  validateProfileForm,
} from '../src/utils/profileForm.js'
import { validateAvatarFile } from '../src/utils/profileImage.js'

test('编辑表单只生成后端允许更新的字段并清理空白', () => {
  const payload = createProfileUpdatePayload({
    userId: 'cannot-update',
    status: 1,
    nickName: '  算法新星  ',
    phone: ' 13812345678 ',
    sex: '2',
  })

  assert.equal(payload.nickName, '算法新星')
  assert.equal(payload.phone, '13812345678')
  assert.equal(payload.sex, 2)
  assert.equal('userId' in payload, false)
  assert.equal('status' in payload, false)
})

test('手机号、邮箱和微信号返回对应的字段级错误', () => {
  assert.match(validateProfileField('phone', '123'), /手机号码/)
  assert.match(validateProfileField('email', 'wrong@'), /邮箱地址/)
  assert.match(validateProfileField('wechat', '1wrong'), /字母开头/)
  assert.equal(validateProfileField('phone', '13812345678'), '')
})

test('完整表单校验汇总所有错误', () => {
  const form = createProfileForm({ phone: '123', email: 'wrong' })
  const errors = validateProfileForm(form)
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'phone'])
})

test('头像文件限制类型与 5MB 大小', () => {
  assert.equal(validateAvatarFile({ type: 'image/png', size: 1024 }), true)
  assert.throws(() => validateAvatarFile({ type: 'image/gif', size: 1024 }), /JPG/)
  assert.throws(() => validateAvatarFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 }), /5 MB/)
})
