import axios from 'axios'
import { getToken, removeToken } from './cookie'
import router from '@/router';

//不同的功能，通过axios请求的是不同接⼝的地址
//127.0.0.1:19090
const service = axios.create({
 baseURL:"/dev-api",
 timeout:5000,
})
axios.defaults.headers["Content-Type"] = "application/json;charset=utf-8";

//请求拦截器
service.interceptors.request.use(
 (config) => {
 if (getToken()) {
 config.headers["Authorization"] = "Bearer " + getToken();
 }
 return config;
 },
 (error) => {
 console.log(error)
 Promise.reject(error);
 }
);

//响应拦截器
service.interceptors.response.use(
 (res) => { //res : 响应数据
 // 未设置状态码则默认成功状态
 const code = res.data.code;
 const msg = res.data.msg;
 if (code === 3001) {
 ElMessage.error(msg);
 removeToken()
 router.push('/oj/login')
 return Promise.reject(new Error(msg));
 } else if (code !== 1000) {
 ElMessage.error(msg);
 return Promise.reject(new Error(msg));
 } else {
 return Promise.resolve(res.data);
 }
 },
 (error) => {
 return Promise.reject(error);
 }
);

export default service