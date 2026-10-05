// Explicit opt-in smoke test against a running development backend.
// Credentials stay in environment variables and are never written to reports.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const phone = process.env.OJ_TEST_PHONE
const code = process.env.OJ_TEST_CODE
const existingToken = process.env.OJ_TEST_TOKEN
if (!existingToken && (!phone || !code)) throw new Error('Set OJ_TEST_PHONE and OJ_TEST_CODE, or OJ_TEST_TOKEN for a test account')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', ssr: { noExternal: ['element-plus'] } })
let restore
let originalName
let changed = false
try {
  const { default: service } = await server.ssrLoadModule('/src/utils/request.js')
  // Node-only: local integration traffic must not use the shell HTTP proxy.
  service.defaults.proxy = false
  service.defaults.baseURL = process.env.OJ_TEST_API_URL || 'http://localhost:5173/dev-api'
  const api = await server.ssrLoadModule('/src/apis/user.js')
  const { uploadAvatarService } = await server.ssrLoadModule('/src/apis/file.js')
  const { createAvatarSaveTask } = await server.ssrLoadModule('/src/utils/avatarUpload.js')
  let token = existingToken
  if (!token) {
    await api.sendCodeService({ phone })
    token = (await api.codeLoginService({ phone, code })).data
  }
  assert.equal(typeof token, 'string')
  assert.ok(token)
  globalThis.document = { cookie: 'Oj-user-Token=' + encodeURIComponent(token) }
  const original = (await api.getUserDetailService()).data.headImage || ''
  originalName = /^https?:/.test(original) ? decodeURIComponent(new URL(original).pathname.split('/').pop()) : original
  restore = api.updateHeadImageService
  console.log('PASS: login and authenticated profile read')
  const data = await readFile('src/assets/user/head_image.png')
  const file = new File([data], 'avatar-integration.png', { type: 'image/png' })
  const save = createAvatarSaveTask(file, {
    upload: uploadAvatarService,
    update: async (payload) => { changed = true; return api.updateHeadImageService(payload) },
  })
  const name = await save()
  console.log('PASS: multipart upload followed by avatar update')
  const detail = (await api.getUserDetailService()).data
  const info = (await api.getUserInfoService()).data
  assert.ok(detail.headImage.endsWith('/' + name))
  assert.equal(detail.headImage, info.headImage)
  const image = await fetch(detail.headImage, { signal: AbortSignal.timeout(15000) })
  assert.equal(image.status, 200)
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), data)
  console.log('PASS: fresh profile and navbar URLs match; OSS returns exact uploaded bytes')
} catch (error) {
  // Do not print Axios causes/configuration, which can contain authentication headers.
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
} finally {
  try {
    if (changed && restore) {
      await restore({ headImage: originalName })
      const api = await server.ssrLoadModule('/src/apis/user.js')
      const restored = (await api.getUserDetailService()).data.headImage || ''
      assert.ok(originalName ? restored === originalName || restored.endsWith('/' + originalName) : !restored)
      console.log('PASS: original avatar restored and verified')
    }
  } catch (error) {
    console.error('FAIL: restoring original avatar: ' + error.message)
    process.exitCode = 1
  } finally {
    delete globalThis.document
    await server.close()
  }
}
