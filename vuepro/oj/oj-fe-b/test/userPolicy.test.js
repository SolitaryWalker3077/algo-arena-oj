import assert from 'node:assert/strict'
import test from 'node:test'
import { mapUserFromApi, normalizeUserPage, normalizeUserQuery } from '../src/api/userPolicy.js'

test('用户列表查询使用后端分页字段并精确传递字符串用户ID', () => {
  assert.deepEqual(
    normalizeUserQuery({
      current: 2,
      size: 20,
      userId: ' 1967421155619463169 ',
      userName: ' 小明 ',
      phone: '13800138000',
      status: 0,
    }),
    {
      pageNum: 2,
      pageSize: 20,
      userId: '1967421155619463169',
      nickName: '小明',
      phone: '13800138000',
      status: 0,
    },
  )
})

test('用户ID拒绝非数字和超出 Java Long 范围的值', () => {
  assert.throws(() => normalizeUserQuery({ userId: '123abc' }), /用户ID/)
  assert.throws(() => normalizeUserQuery({ userId: '9223372036854775808' }), /用户ID/)
})

test('UserVo 字段正确映射到用户管理表格', () => {
  assert.deepEqual(
    mapUserFromApi({
      userId: '1967421155619463169',
      nickName: '小明',
      sex: 1,
      phone: '13800138000',
      email: 'ming@example.com',
      wechat: 'ming-wechat',
      schoolName: '示例大学',
      majorName: '计算机',
      introduce: '保持好奇',
      status: 0,
    }),
    {
      id: '1967421155619463169',
      userAccount: '',
      userName: '小明',
      sex: 1,
      phone: '13800138000',
      email: 'ming@example.com',
      wechatId: 'ming-wechat',
      school: '示例大学',
      major: '计算机',
      intro: '保持好奇',
      status: 0,
      createTime: '',
    },
  )
})

test('TableDataInfo 被归一化为页面分页数据', () => {
  const page = normalizeUserPage({
    code: 1000,
    rows: [{ userId: '1001', nickName: '用户A', sex: 2, status: 1 }],
    total: 11,
  })

  assert.equal(page.total, 11)
  assert.equal(page.records[0].id, '1001')
  assert.equal(page.records[0].userName, '用户A')
  assert.equal(page.records[0].sex, 2)
})
