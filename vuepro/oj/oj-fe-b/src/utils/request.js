import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例；不设置 baseURL，接口函数直接写网关路径（如 /system/sysuser/login），
// 由 vite 代理按路径前缀转发到网关，避免前缀叠加
const request = axios.create({
  timeout: 10000,
})

// 网关从 Authorization: Bearer <token> 中读取登录令牌。
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理后端 Result { code, msg, data }
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 1000) {
      return res.data
    }
    const message = res.msg || '操作失败'
    if (res.code === 3001) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminAccount')
    }
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  (error) => {
    const message = error.response?.data?.msg || '网络异常，请检查后端服务是否启动'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

export default request
