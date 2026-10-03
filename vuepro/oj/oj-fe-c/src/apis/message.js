import service from '@/utils/request'

export function getMessageListService(params = {}, options = {}) {
  return service({
    url: '/user/message/list',
    method: 'get',
    params,
    signal: options.signal,
  })
}

export function deleteMessageService(messageId) {
  return service({
    url: `/user/message/${encodeURIComponent(messageId)}`,
    method: 'delete',
  })
}

