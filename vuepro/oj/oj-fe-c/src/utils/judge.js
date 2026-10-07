// Backend QuestionResType: 0 failed, 1 passed, 2 not submitted, 3 judging.
export function formatSubmissionTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type) => parts.find((part) => part.type === type).value
  return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}:${value('second')}`
}

export function normalizeJudgeResult(payload) {
  const data = payload?.data
  if (!data || ![0, 1, 2, 3].includes(data.pass)) throw new Error('判题结果格式异常，请重新查询')
  const cases = Array.isArray(data.userExeResultList) ? data.userExeResultList.map((item, index) => {
    if (!item || typeof item.output !== 'string' || typeof item.exeOutput !== 'string') {
      throw new Error('测试点结果格式异常，请重新查询')
    }
    return { name: `测试点 ${index + 1}`, input: item.input ?? '', output: item.output,
      exeOutput: item.exeOutput, passed: item.output === item.exeOutput }
  }) : []
  return { pending: data.pass === 2 || data.pass === 3, accepted: data.pass === 1,
    message: data.exeMessage || (data.pass === 1 ? '已通过全部测试用例' : '未通过评测，请检查代码'), cases }
}

function waitForPoll(ms, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException('已停止查询', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve() }, ms)
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort', cancel, { once: true })
  })
}

export async function pollJudgeResult(fetchResult, { signal, maxAttempts = 60, interval = 2000, wait = waitForPoll } = {}) {
  let failures = 0
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    checkCanceled(signal)
    try {
      const result = normalizeJudgeResult(await fetchResult())
      checkCanceled(signal)
      failures = 0
      if (!result.pending) return result
    } catch (error) {
      if (signal?.aborted || !error.retryable || ++failures >= 3) throw error
    }
    if (attempt < maxAttempts - 1) await wait(interval, signal)
  }
  throw new Error('暂未收到判题结果，可继续查询。代码已提交，无需重复提交。')
}

function checkCanceled(signal) {
  if (signal?.aborted) throw new DOMException('已停止查询', 'AbortError')
}
