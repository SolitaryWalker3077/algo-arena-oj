import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken } from './cookie'
import { notifyAuthExpired } from './authEvents'
import { showAuthExpiredNotice } from './authNotice'

//不同的功能，通过axios请求的是不同接⼝的地址
//127.0.0.1:19090
const service = axios.create({
 baseURL: '/dev-api',
 timeout: 10000,
})
service.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

//请求拦截器
service.interceptors.request.use(
 (config) => {
 if (getToken()) {
 config.headers["Authorization"] = "Bearer " + getToken();
 }
 return config;
 },
 (error) => Promise.reject(error)
);

//响应拦截器
service.interceptors.response.use(
 (res) => { //res : 响应数据
 // 未设置状态码则默认成功状态
 const code = res.data?.code;
 const msg = res.data?.msg || '请求失败，请稍后重试';
 if (code === 3001) {
 removeToken()
 notifyAuthExpired()
 showAuthExpiredNotice()
 const authError = new Error(msg)
 authError.code = code
 return Promise.reject(authError);
 } else if (code !== 1000) {
 const businessError = new Error(msg)
 businessError.code = code
 businessError.retryable = false
 return Promise.reject(businessError);
 } else {
 return Promise.resolve(res.data);
 }
 },
 (error) => {
 const status = error.response?.status
 const responseCode = error.response?.data?.code
 if (status === 401 || status === 403 || responseCode === 3001) {
 const message = error.response?.data?.msg || '登录状态已过期'
 removeToken()
 notifyAuthExpired()
 showAuthExpiredNotice()
 const authError = new Error(message)
 authError.code = 3001
 authError.status = status
 return Promise.reject(authError)
 }

 let message = '请求失败，请稍后重试'
 if (error.code === 'ECONNABORTED') {
 message = '请求超时，请检查网络后重试'
 } else if (!error.response) {
 message = '网络连接异常，请检查网络后重试'
 } else if (error.response.status >= 500) {
 message = '服务暂时不可用，请稍后重试'
 } else if (error.response.data?.msg) {
 message = error.response.data.msg
 }

 const requestError = new Error(message)
 requestError.status = status
 requestError.retryable = !error.response || error.code === 'ECONNABORTED' || status >= 500
 return Promise.reject(requestError);
 }
);

export default service
