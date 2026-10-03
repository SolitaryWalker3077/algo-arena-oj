import service from '@/utils/request'
import { normalizeQuestionList, normalizeQuestionParams } from '@/utils/questionList'

export function getQuestionListService(params = {}, options = {}) {
  const query = { ...params }
  if (query.difficulty !== '' && query.difficulty !== undefined) {
    query.difficult = query.difficulty
  }
  delete query.difficulty
  return service({
    url: '/question/semiLogin/list',
    method: 'get',
    params: query,
    signal: options.signal,
  })
}

/**
 * 保留原项目的规范化题库接口，供其他模块按既有契约复用。
 */
export async function getQuestionList(params = {}, options = {}) {
  const payload = await getQuestionListService(normalizeQuestionParams(params), options)
  return normalizeQuestionList(payload)
}

export function getHotQuestionListService(options = {}) {
  return service({
    url: '/question/semiLogin/hotList',
    method: 'get',
    signal: options.signal,
  })
}

export function getQuestionDetailService(questionId, options = {}) {
  return service({
    url: '/question/detail',
    method: 'get',
    params: { questionId },
    signal: options.signal,
  })
}

export function getAdjacentQuestionService(direction, questionId, examId, options = {}) {
  const inContest = Boolean(examId)
  return service({
    url: inContest
      ? `/exam/${direction === 'previous' ? 'preQuestion' : 'nextQuestion'}`
      : `/question/${direction === 'previous' ? 'preQuestion' : 'nextQuestion'}`,
    method: 'get',
    params: inContest ? { examId, questionId } : { questionId },
    signal: options.signal,
  })
}

export function getFirstExamQuestionService(examId, options = {}) {
  return service({
    url: '/exam/getFirstQuestion',
    method: 'get',
    params: { examId },
    signal: options.signal,
  })
}

export function submitQuestionService(data) {
  return service({
    url: '/user/question/rabbit/submit',
    method: 'post',
    data,
  })
}

export function getQuestionResultService(params, options = {}) {
  return service({
    url: '/user/question/exe/result',
    method: 'get',
    params,
    signal: options.signal,
  })
}
