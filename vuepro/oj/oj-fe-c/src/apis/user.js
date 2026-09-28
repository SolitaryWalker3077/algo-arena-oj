import service from '@/utils/request'

export function sendCodeService(params = {}) {
  return service({
    url: '/user/sendCode',
    method: 'post',
    data: params,
  });
}

export function codeLoginService(params = {}) {
  return service({
    url: '/user/code/login',
    method: 'post',
    data: params,
  });
}

export function logoutService() {
  return service({
    url: '/user/logout',
    method: 'delete',
  });
}
