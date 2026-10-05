import service from '@/utils/request'
import { validateAvatarFile } from '@/utils/profileImage'

export function uploadAvatarService(file) {
  validateAvatarFile(file)
  const data = new FormData()
  data.append('file', file, file.name)
  return service({
    url: '/file/upload', method: 'post', data,
    requireAuth: true,
    // Browser generates the multipart boundary; shared interceptor adds authentication.
    headers: { 'Content-Type': undefined },
    timeout: 60000,
  })
}
