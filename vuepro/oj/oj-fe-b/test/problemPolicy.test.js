import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatProblemCreateTime,
  mapProblemFromApi,
  normalizeProblemPage,
  normalizeProblemQuery,
  PARAM_VALIDATION_CODE,
} from '../src/api/problemPolicy.js'

test('题目查询参数转换为后端 QuestionQueryDto 格式并清理标题空白', () => {
  assert.deepEqual(
    normalizeProblemQuery({
      current: 2,
      size: 20,
      title: '  二分查找  ',
      difficulty: '2',
    }),
    {
      pageNum: 2,
      pageSize: 20,
      title: '二分查找',
      difficult: 2,
    },
  )
})

test('空筛选条件不下发且分页使用安全默认值', () => {
  assert.deepEqual(normalizeProblemQuery({ title: '   ', difficulty: '' }), {
    pageNum: 1,
    pageSize: 10,
  })
})

test('页码、每页条数和难度在发送请求前完成边界校验', () => {
  const invalidQueries = [
    { current: 0 },
    { size: 501 },
    { difficulty: 4 },
    { title: '题'.repeat(101) },
  ]

  for (const query of invalidQueries) {
    assert.throws(
      () => normalizeProblemQuery(query),
      (error) => error.code === PARAM_VALIDATION_CODE,
    )
  }
})

test('TableDataInfo 响应正确映射题目字段并保留雪花 ID 精度', () => {
  const page = normalizeProblemPage({
    code: 1000,
    total: 21,
    rows: [
      {
        questionId: '1967421155619463169',
        title: '两数之和',
        difficult: 1,
        createName: '算法管理员',
        createTime: '2026-09-14 20:21:43',
      },
    ],
  })

  assert.deepEqual(page, {
    total: 21,
    records: [
      {
        id: '1967421155619463169',
        title: '两数之和',
        difficulty: 1,
        createUser: '算法管理员',
        createTime: '2026-09-14 20:21:43',
      },
    ],
  })
})

test('题目创建时间统一格式化到秒并处理空值', () => {
  assert.equal(formatProblemCreateTime('2026-09-14T08:09:07.123'), '2026-09-14 08:09:07')
  assert.equal(formatProblemCreateTime('2026-9-4 8:9'), '2026-09-04 08:09:00')
  assert.equal(formatProblemCreateTime([2026, 9, 14, 8, 9, 7]), '2026-09-14 08:09:07')
  assert.equal(formatProblemCreateTime(null), '—')
  assert.equal(formatProblemCreateTime('invalid-date'), '—')
})

test('缺失字段和空列表保持稳定的展示结构', () => {
  assert.deepEqual(mapProblemFromApi({ questionId: null, difficult: null }), {
    id: '',
    title: '',
    difficulty: '',
    createUser: '',
    createTime: '',
  })
  assert.deepEqual(normalizeProblemPage({ rows: [], total: 0 }), {
    records: [],
    total: 0,
  })
})
