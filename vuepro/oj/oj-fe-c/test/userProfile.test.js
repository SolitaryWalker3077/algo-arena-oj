import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDisplayNickname,
  getSexLabel,
  getStatusPresentation,
  normalizeUserProfile,
} from '../src/utils/userProfile.js'

test('完整规范化后端个人中心数据并保留大整数用户 ID', () => {
  const result = normalizeUserProfile({
    userId: '9007199254740993124',
    nickName: '  算法新星  ',
    headImage: null,
    sex: 1,
    phone: '138****8888',
    email: 'coder@example.com',
    wechat: '',
    schoolName: '示例大学',
    majorName: '计算机科学',
    introduce: '保持练习',
    status: 1,
  })

  assert.deepEqual(result, {
    userId: '9007199254740993124',
    nickName: '算法新星',
    headImage: '',
    phone: '138****8888',
    email: 'coder@example.com',
    wechat: '',
    schoolName: '示例大学',
    majorName: '计算机科学',
    introduce: '保持练习',
    sex: 1,
    status: 1,
  })
})

test('个人中心响应不是对象或缺少 userId 时抛出可读错误', () => {
  assert.throws(() => normalizeUserProfile(null), /个人资料数据格式异常/)
  assert.throws(() => normalizeUserProfile({ nickName: '用户' }), /个人资料数据格式异常/)
  assert.throws(
    () => normalizeUserProfile({ userId: '1', email: { value: 'wrong' } }),
    /个人资料数据格式异常/,
  )
})

test('性别和账号状态映射为稳定的中文展示', () => {
  assert.equal(getDisplayNickname(''), 'OJ用户')
  assert.equal(getDisplayNickname('算法新星'), '算法新星')
  assert.equal(getSexLabel(1), '男')
  assert.equal(getSexLabel(null), '未设置')
  assert.deepEqual(getStatusPresentation(1), { label: '账号正常', tone: 'normal' })
  assert.deepEqual(getStatusPresentation(0), { label: '账号受限', tone: 'blocked' })
})
