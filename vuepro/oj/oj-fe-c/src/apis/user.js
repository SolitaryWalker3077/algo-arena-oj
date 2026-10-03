import service from '@/utils/request'

export function sendCodeService(params = {}) {
  return service({
    url: '/user/sendCode',
    method: 'post',
    data: params,
  })
}

export function codeLoginService(params = {}) {
  return service({
    url: '/user/code/login',
    method: 'post',
    data: params,
  })
}

export function getUserInfoService() {
  return service({
    url: '/user/info',
    method: 'get',
  })
}

export function logoutService(token) {
  return service({
    url: '/user/logout',
    method: 'delete',
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : undefined,
  })
}

export function getUserDetailService(options = {}) {
  return service({
    url: '/user/detail',
    method: 'get',
    signal: options.signal,
  })
}

export function editUserService(data) {
  return service({
    url: '/user/edit',
    method: 'put',
    data,
  })
}

export function updateHeadImageService(data) {
  return service({
    url: '/user/head-image/update',
    method: 'put',
    data,
  })
}
