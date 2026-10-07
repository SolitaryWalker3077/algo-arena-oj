import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { formatSubmissionTime, pollJudgeResult } from '../src/utils/judge.js'

let vite, upstream, submitQuestionService, getQuestionResultService
const requests = []
let pass = 3
before(async () => {
  upstream = createHttpServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const url = new URL(req.url, 'http://localhost')
    requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams),
      method: req.method, authorization: req.headers.authorization, body: Buffer.concat(chunks).toString() })
    res.setHeader('Content-Type', 'application/json')
    // rabbitSubmit returns Result<Void>; exeResult returns the actual verdict.
    res.end(JSON.stringify(url.pathname.endsWith('/rabbit/submit')
      ? { code: 1000, msg: '操作成功' }
      : { code: 1000, data: { pass: pass === 3 ? (pass = 1, 3) : pass,
        exeMessage: '运行成功', userExeResultList: [{ input: '1 2', output: '3', exeOutput: '3' }] } }))
  })
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', ssr: { noExternal: ['element-plus'] } })
  const { default: service } = await vite.ssrLoadModule('/src/utils/request.js')
  ;({ submitQuestionService, getQuestionResultService } = await vite.ssrLoadModule('/src/apis/question.js'))
  service.defaults.proxy = false
  service.defaults.baseURL = `http://127.0.0.1:${upstream.address().port}`
  globalThis.document = { cookie: 'Oj-user-Token=judge-test-token' }
})
after(async () => {
  delete globalThis.document
  await vite?.close()
  upstream?.closeAllConnections()
  if (upstream) await new Promise((resolve) => upstream.close(resolve))
})

test('Java 异步提交和结果查询经过真实 HTTP，练习不发送空 examId', async () => {
  const questionId = '123456789012345678'
  const currentTime = formatSubmissionTime(new Date('2026-10-08T01:02:03Z'))
  const submission = { questionId, programType: 0, userCode: 'public class Main {}' }
  await submitQuestionService(submission)
  const result = await pollJudgeResult(() => getQuestionResultService({ questionId, currentTime }), { wait: async () => {} })
  assert.equal(result.accepted, true)
  assert.equal(requests[0].path, '/user/question/rabbit/submit')
  assert.equal(requests[0].method, 'POST')
  assert.deepEqual(JSON.parse(requests[0].body), submission)
  assert.equal(requests.filter((req) => req.method === 'POST').length, 1)
  for (const req of requests.slice(1)) {
    assert.equal(req.path, '/user/question/exe/result')
    assert.equal(req.method, 'GET')
    assert.deepEqual(req.params, { questionId, currentTime })
  }
  assert.ok(requests.every((req) => req.authorization === 'Bearer judge-test-token'))
})

test('竞赛提交与查询保留相同的大整数 examId', async () => {
  const identity = { questionId: '123456789012345678', examId: '987654321098765432' }
  await submitQuestionService({ ...identity, programType: 0, userCode: 'public class Main {}' })
  await getQuestionResultService({ ...identity, currentTime: '2026-10-08 09:02:03' })
  assert.equal(JSON.parse(requests.at(-2).body).examId, identity.examId)
  assert.equal(requests.at(-1).params.examId, identity.examId)
})
