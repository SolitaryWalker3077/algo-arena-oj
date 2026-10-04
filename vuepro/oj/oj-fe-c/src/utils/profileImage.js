export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024
export const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function createAvatarError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function validateAvatarFile(file) {
  if (!file || !ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw createAvatarError('请选择 JPG、JPEG、PNG 或 WebP 格式的图片', 'INVALID_AVATAR_TYPE')
  }
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw createAvatarError('头像原图不能超过 5 MB', 'AVATAR_TOO_LARGE')
  }
  return true
}

function readAsDataUrl(value) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(createAvatarError('图片读取失败，请重新选择', 'AVATAR_READ_FAILED'))
    reader.readAsDataURL(value)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(createAvatarError('图片内容无法识别，请重新选择', 'AVATAR_DECODE_FAILED'))
    image.src = dataUrl
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function compressAvatar(file, options = {}) {
  validateAvatarFile(file)
  const maxDimension = options.maxDimension || 400
  const targetBytes = options.targetBytes || 180 * 1024
  const sourceUrl = await readAsDataUrl(file)
  const image = await loadImage(sourceUrl)
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw createAvatarError('当前浏览器无法处理图片', 'AVATAR_COMPRESS_UNSUPPORTED')
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.82
  let blob = await canvasToBlob(canvas, 'image/webp', quality)
  while (blob && blob.size > targetBytes && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.08)
    blob = await canvasToBlob(canvas, 'image/webp', quality)
  }
  if (!blob) throw createAvatarError('头像压缩失败，请更换图片后重试', 'AVATAR_COMPRESS_FAILED')

  return {
    dataUrl: await readAsDataUrl(blob),
    originalSize: file.size,
    compressedSize: blob.size,
    width,
    height,
  }
}
