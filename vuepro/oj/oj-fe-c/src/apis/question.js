import service from '@/utils/request'
import { normalizeQuestionList, normalizeQuestionParams } from '@/utils/questionList'

/**
 * 获取 C 端题库列表。搜索、难度筛选与分页都由后端执行。
 */
export async function getQuestionList(params = {}, options = {}) {
  const payload = await service({
    url: '/question/semiLogin/list',
    method: 'get',
    params: normalizeQuestionParams(params),
    signal: options.signal,
  })

  return normalizeQuestionList(payload)
}

