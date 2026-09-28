import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

let noticeInstance = null

export function showAuthExpiredNotice() {
  if (noticeInstance) return

  noticeInstance = ElMessage({
    message: '登录状态已过期',
    type: 'error',
    duration: 3000,
    showClose: false,
    onClose: () => {
      noticeInstance = null
    },
  })
}
