import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'

let vite
let upstream
let service
let uploadAvatarService
let updateHeadImageService
const requests = []
before(async () => {
  upstream = createHttpServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    requests.push({ url: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/server-error') {
      res.writeHead(503).end(JSON.stringify({ msg: 'unavailable' }))
    } else if (req.url === '/auth-error') {
      res.end(JSON.stringify({ code: 3001, msg: '登录过期' }))
    } else if (req.url === '/business-error') {
      res.end(JSON.stringify({ code: 4000, msg: '上传被拒绝' }))
    } else if (req.url === '/timeout') {
      setTimeout(() => res.end(JSON.stringify({ code: 1000 })), 100)
    } else if (req.url === '/network-error') {
      req.socket.destroy()
    } else {
      res.end(JSON.stringify({ code: 1000, data: { success: true, name: 'test.png' } }))
    }
  })
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', ssr: { noExternal: ['element-plus'] } })
  ;({ default: service } = await vite.ssrLoadModule('/src/utils/request.js'))
  ;({ uploadAvatarService } = await vite.ssrLoadModule('/src/apis/file.js'))
  ;({ updateHeadImageService } = await vite.ssrLoadModule('/src/apis/user.js'))
  // Node-only: local integration traffic must not use the shell HTTP proxy.
  service.defaults.proxy = false
  service.defaults.baseURL = `http://127.0.0.1:${upstream.address().port}`
  globalThis.document = { cookie: 'Oj-user-Token=integration-token' }
})
after(async () => {
  delete globalThis.document
  await vite?.close()
  upstream?.closeAllConnections()
  if (upstream) await new Promise((resolve) => upstream.close(resolve))
})

test('真实 HTTP 请求包含认证头、multipart boundary、file 字段及正确更新 JSON', async () => {
  await uploadAvatarService(new File(['png-test-bytes'], 'avatar.png', { type: 'image/png' }))
  await updateHeadImageService({ headImage: 'test.png' })
  const [upload, update] = requests.slice(-2)
  assert.equal(upload.url, '/file/upload')
  assert.equal(upload.method, 'POST')
  assert.equal(upload.headers.authorization, 'Bearer integration-token')
  assert.match(upload.headers['content-type'], /^multipart\/form-data; boundary=/)
  assert.match(upload.body, /name="file"; filename="avatar.png"/)
  assert.match(upload.body, /Content-Type: image\/png/)
  assert.match(upload.body, /png-test-bytes/)
  assert.equal(update.url, '/user/head-image/update')
  assert.equal(update.method, 'PUT')
  assert.equal(update.headers.authorization, 'Bearer integration-token')
  assert.deepEqual(JSON.parse(update.body), { headImage: 'test.png' })
})

test('HTTP 503、业务失败和连接中断都被转换为可展示的错误', async () => {
  await assert.rejects(service.get('/server-error'), (e) => e.status === 503 && e.retryable && /服务暂时不可用/.test(e.message))
  await assert.rejects(service.get('/business-error'), (e) => e.code === 4000 && e.message === '上传被拒绝')
  await assert.rejects(service.get('/timeout', { timeout: 20 }), (e) => e.retryable && /请求超时/.test(e.message))
  await assert.rejects(service.get('/network-error'), (e) => e.retryable && /网络连接异常/.test(e.message))
})

test('令牌缺失时阻止上传和更新请求，过期响应保留认证错误', async () => {
  document.cookie = ''
  const count = requests.length
  await assert.rejects(uploadAvatarService(new File(['x'], 'avatar.png', { type: 'image/png' })), (e) => e.code === 3001)
  await assert.rejects(updateHeadImageService({ headImage: 'test.png' }), (e) => e.code === 3001)
  assert.equal(requests.length, count)
  document.cookie = 'Oj-user-Token=expired-token'
  await assert.rejects(service.get('/auth-error'), (e) => e.code === 3001 && e.retryable === false)
})
