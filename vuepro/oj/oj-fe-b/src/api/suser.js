import request from '@/utils/request'

/**
 * 管理员登录（网关匹配 /system/** 后转发到 oj-system）
 * @param {Object} data - { userAccount: 账号, password: 密码 }
 * @returns {Promise<string>} 登录成功后返回 JWT
 */
export const userLogin = (data) => {
  return request.post('/system/sysuser/login', data)
}

/**
 * 获取当前管理员信息。token 由请求拦截器统一注入。
 * @returns {Promise<{ nickName: string }>} 当前管理员信息
 */
export const getUserInfo = () => {
  return request.get('/system/sysuser/info')
}
