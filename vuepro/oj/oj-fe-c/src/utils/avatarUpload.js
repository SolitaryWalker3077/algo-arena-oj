// Reuse the uploaded file when only the update request needs retrying.
export function createAvatarSaveTask(file, { upload, update }) {
  let name = ''
  return async () => {
    if (!name) {
      const result = await upload(file)
      if (result?.data?.success !== true || typeof result.data.name !== 'string' || !result.data.name.trim()) {
        throw new Error('文件上传未返回有效的文件标识，请重试')
      }
      name = result.data.name.trim()
    }
    // Authentication identifies the current user; the DTO expects headImage.
    await update({ headImage: name })
    return name
  }
}

export function resolveAvatarUrl(value, baseUrl = '') {
  if (!value) return ''
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) return value
  if (!baseUrl) return ''
  return baseUrl.replace(/\/$/, '') + '/' + value.split('/').map(encodeURIComponent).join('/')
}
