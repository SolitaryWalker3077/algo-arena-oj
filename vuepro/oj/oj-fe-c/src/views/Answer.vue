<template>
  <main class="answer-page" :aria-busy="loading">
    <header class="ide-header">
      <div class="contest-brand"><img src="@/assets/logo.png" alt=""><div><span>{{ contestMode ? 'CONTEST WORKSPACE' : 'PRACTICE WORKSPACE' }}</span><strong>{{ pageTitle }}</strong></div></div>
      <div v-if="contestMode && remainingTime" class="countdown"><small>距离结束</small><strong>{{ remainingTime }}</strong></div>
      <div class="ide-actions"><span class="language-pill">Java · 自动评测</span><button class="submit-button" type="button" :disabled="loading || submitting || !question || noticeIsError || !code.trim()" @click="submitCode">{{ submitting ? '评测中…' : '提交代码' }}</button><button class="exit-button" type="button" @click="goBack">退出</button></div>
    </header>

    <div class="ide-main">
      <section class="problem-pane">
        <header class="pane-toolbar">
          <div class="pane-title"><span>题目描述</span><small v-if="question">#{{ question.questionId }}</small></div>
          <div class="question-nav"><span v-if="loading && question" class="nav-loading" role="status">正在加载题目…</span><button type="button" :disabled="loading || submitting || !question" @click="navigateQuestion('previous')">← 上一题</button><button type="button" :disabled="loading || submitting || !question" @click="navigateQuestion('next')">下一题 →</button></div>
        </header>

        <div v-if="loading && !question" class="problem-loading" role="status">正在加载题目详情…<el-skeleton animated :rows="10" /></div>
        <div v-if="questionNotice && question" class="question-notice" :class="{ 'is-error': noticeIsError }" role="status" aria-live="polite">{{ questionNotice }}<button v-if="noticeIsError && question" type="button" :disabled="loading" @click="retryQuestion">重试</button></div>
        <article v-if="question" :key="question.questionId" class="problem-content" :class="{ 'is-loading': loading }">
          <div class="problem-heading"><h1>{{ question.title }}</h1><span class="difficulty" :class="`is-${question.difficulty}`">{{ difficultyLabel }}</span></div>
          <div class="problem-meta"><span v-if="question.timeLimit">时间限制 {{ question.timeLimit }} ms</span><span v-if="question.spaceLimit">内存限制 {{ formatMemory(question.spaceLimit) }}</span><span v-for="tag in question.tags" :key="tag">{{ tag }}</span></div>
          <section v-if="question.description"><h2>题目描述</h2><p>{{ question.description }}</p></section>
          <section v-if="question.options.length"><h2>选项</h2><ol class="answer-options"><li v-for="(option, index) in question.options" :key="index">{{ option }}</li></ol></section>
          <section v-if="question.inputDescription"><h2>输入描述</h2><p>{{ question.inputDescription }}</p></section>
          <section v-if="question.outputDescription"><h2>输出描述</h2><p>{{ question.outputDescription }}</p></section>
          <section v-for="(example, index) in question.examples" :key="index" class="example-section">
            <h2>示例 {{ index + 1 }}</h2>
            <div class="example-grid"><div><span>输入</span><pre>{{ example.input }}</pre></div><div><span>输出</span><pre>{{ example.output }}</pre></div></div>
            <p v-if="example.explanation" class="example-note">说明：{{ example.explanation }}</p>
          </section>
        </article>
        <div v-else-if="!loading" class="question-load-error" role="alert"><p>{{ questionNotice || '题目加载失败' }}</p><button type="button" @click="loadQuestion">重新加载</button></div>
      </section>

      <section class="coding-pane">
        <div class="editor-wrap"><CodeEditor v-model="code" :readonly="loading || submitting" /><footer class="editor-footer"><span>使用题目提供的类与方法签名完成代码</span><span>Ctrl / ⌘ + Enter 提交</span></footer></div>
        <section class="result-panel" aria-live="polite" :aria-busy="submitting">
          <header><div><span class="status-dot" :class="`is-${judgeState}`"></span><strong>执行结果</strong></div><span>{{ resultCaption }}</span></header>
          <div v-if="judgeState === 'idle'" class="result-empty"><span aria-hidden="true">⌁</span><p>提交代码后，评测结果会显示在这里</p></div>
          <div v-else-if="judgeState === 'running'" class="result-running"><i></i><div><strong>正在评测</strong><p>代码已进入评测队列，请稍候…</p></div></div>
          <div v-else class="result-content" :class="`is-${judgeState}`">
            <div class="result-summary"><span>{{ judgeState === 'accepted' ? '✓' : '!' }}</span><div><strong>{{ judgeState === 'accepted' ? '答案正确' : judgeState === 'error' ? '查询或提交未完成' : '未通过评测' }}</strong><pre class="judge-message">{{ resultMessage }}</pre></div><span v-if="judgeResult.cases.length" class="case-count">{{ passedCases }} / {{ judgeResult.cases.length }} 通过</span></div>
            <button v-if="judgeState === 'error' && submissionContext" class="retry-result" type="button" @click="resumePolling">继续查询结果</button>
            <p v-if="judgeState === 'error' && submissionContext" class="query-hint">查询不会再次提交代码。</p>
            <div class="case-list">
              <details v-for="item in judgeResult.cases" :key="item.name" :open="!item.passed" class="case-detail">
                <summary><span>{{ item.name }}</span><span :class="item.passed ? 'case-pass' : 'case-fail'">{{ item.passed ? '通过' : '输出不匹配' }}</span></summary>
                <div class="case-outputs"><div><small>输入</small><pre>{{ item.input }}</pre></div><div><small>期望输出</small><pre>{{ item.output }}</pre></div><div><small>实际输出</small><pre>{{ item.exeOutput }}</pre></div></div>
              </details>
            </div>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { useRoute, useRouter } from 'vue-router'
import CodeEditor from '@/components/CodeEditor.vue'
import {
  getAdjacentQuestionService,
  getFirstExamQuestionService,
  getQuestionDetailService,
  getQuestionResultService,
  submitQuestionService,
} from '@/apis/question'
import { createSubmissionContext, pollJudgeResult } from '@/utils/judge'
import { adjacentQuestionId, normalizeQuestionDetail, questionBoundaryMessage } from '@/utils/questionDetail'
import { getDifficultyLabel } from '@/utils/question'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const code = ref('')
const judgeState = ref('idle')
const judgeResult = reactive({ cases: [] })
const submissionContext = ref(null)
const resultMessage = ref('')
const now = ref(Date.now())
const question = ref(null)
const questionNotice = ref('')
const noticeIsError = ref(false)
const retryDirection = ref('')
let questionId = ''
const examId = computed(() => String(route.params.examId || route.query.examId || ''))
const contestMode = computed(() => route.meta.contestMode || (examId.value ? 'answer' : ''))
let controller
let clockTimer
let judgeController
const passedCases = computed(() => judgeResult.cases.filter((item) => item.passed).length)

const pageTitle = computed(() => typeof route.query.title === 'string' && route.query.title ? route.query.title : (contestMode.value ? '算法竞赛' : '精选题库'))
const difficultyLabel = computed(() => getDifficultyLabel(question.value?.difficulty))
const resultCaption = computed(() => ({ idle: '等待提交', running: '评测队列处理中', accepted: 'Accepted', failed: '评测未通过', error: '需要重试' })[judgeState.value])
const remainingTime = computed(() => {
  const rawEnd = route.query.endTime
  const numericEnd = Number(rawEnd)
  const end = Number.isFinite(numericEnd) && rawEnd !== ''
    ? numericEnd
    : new Date(String(rawEnd || '')).getTime()
  if (!Number.isFinite(end)) return ''
  const seconds = Math.max(0, Math.floor((end - now.value) / 1000))
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${rest}`
})

function isCanceled(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError'
}

function showQuestionNotice(message, isError = false, direction = '') {
  questionNotice.value = message
  noticeIsError.value = isError
  retryDirection.value = direction
}

async function fetchQuestion(id, signal) {
  const response = await getQuestionDetailService(id, { signal })
  return normalizeQuestionDetail(response, id)
}

function applyQuestion(detail) {
  const oldId = question.value?.questionId
  question.value = detail
  questionId = detail.questionId
  if (oldId !== detail.questionId) {
    judgeController?.abort()
    submissionContext.value = null
    submitting.value = false
    code.value = detail.defaultCode || ''
    judgeState.value = 'idle'
    judgeResult.cases = []
  }
  showQuestionNotice('')
}

async function loadQuestion() {
  controller?.abort()
  const activeController = new AbortController()
  controller = activeController
  loading.value = true
  showQuestionNotice('')
  try {
    let id = String(route.query.questionId || '').trim()
    if (!id && examId.value) {
      const result = await getFirstExamQuestionService(examId.value, { signal: activeController.signal })
      id = adjacentQuestionId(result)
    }
    if (!/^\d+$/.test(id) || id === '0') throw new Error('题目编号无效，请返回题目列表重新选择')
    const detail = await fetchQuestion(id, activeController.signal)
    if (controller !== activeController) return
    applyQuestion(detail)
  } catch (error) {
    if (controller !== activeController || isCanceled(error)) return
    showQuestionNotice(error?.message || '题目加载失败，请重试', true)
  } finally {
    if (controller === activeController) loading.value = false
  }
}

async function navigateQuestion(direction) {
  if (loading.value || submitting.value || !question.value) return
  const activeController = new AbortController()
  controller?.abort()
  controller = activeController
  loading.value = true
  showQuestionNotice('')
  try {
    const adjacent = await getAdjacentQuestionService(direction, questionId, examId.value, { signal: activeController.signal })
    const nextId = adjacentQuestionId(adjacent)
    const detail = await fetchQuestion(nextId, activeController.signal)
    if (controller !== activeController) return
    applyQuestion(detail)
    await router.replace({ query: { ...route.query, questionId: nextId } })
  } catch (error) {
    if (controller !== activeController || isCanceled(error)) return
    const boundary = questionBoundaryMessage(direction, error)
    if (boundary) {
      ElMessage({
        message: error?.message || boundary,
        type: 'error',
        grouping: true,
        duration: 3000,
        offset: 40,
      })
    } else {
      showQuestionNotice(error?.message || '切换题目失败，请重试', true, direction)
    }
  } finally {
    if (controller === activeController) loading.value = false
  }
}

function retryQuestion() {
  if (retryDirection.value) navigateQuestion(retryDirection.value)
  else loadQuestion()
}

async function submitCode() {
  if (loading.value || submitting.value || !question.value || noticeIsError.value || !code.value.trim()) return
  judgeController?.abort()
  const activeController = new AbortController()
  judgeController = activeController
  // Record before enqueueing: a fast judge may finish before the POST returns.
  submissionContext.value = createSubmissionContext({ questionId, examId: examId.value })
  submitting.value = true
  judgeState.value = 'running'
  resultMessage.value = ''
  judgeResult.cases = []
  try {
    const identity = { questionId, ...(examId.value ? { examId: examId.value } : {}) }
    await submitQuestionService({ ...identity, programType: 0, userCode: code.value }, { signal: activeController.signal })
    if (judgeController !== activeController) return
    await receiveResult(activeController)
  } catch (error) {
    if (judgeController !== activeController || isCanceled(error)) return
    if (!error.retryable) submissionContext.value = null
    judgeState.value = 'error'
    resultMessage.value = error?.message || '提交失败，请稍后重试'
  } finally {
    if (judgeController === activeController) submitting.value = false
  }
}

async function receiveResult(activeController) {
  try {
    const params = { ...submissionContext.value }
    const result = await pollJudgeResult(
      () => getQuestionResultService(params, { signal: activeController.signal }),
      { signal: activeController.signal },
    )
    if (judgeController !== activeController) return
    judgeState.value = result.accepted ? 'accepted' : 'failed'
    resultMessage.value = result.message
    judgeResult.cases = result.cases
  } catch (error) {
    if (judgeController !== activeController || isCanceled(error)) return
    judgeState.value = 'error'
    resultMessage.value = error?.message || '结果查询失败，请重试'
    if (error?.code === 3001) submissionContext.value = null
  }
}

async function resumePolling() {
  if (submitting.value || loading.value || !submissionContext.value) return
  judgeController?.abort()
  const activeController = new AbortController()
  judgeController = activeController
  submitting.value = true
  judgeState.value = 'running'
  try {
    await receiveResult(activeController)
  } finally {
    if (judgeController === activeController) submitting.value = false
  }
}

function handleSubmitShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submitCode()
  }
}

function formatMemory(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `${number} MB`
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: examId.value ? 'exam' : 'question' })
}

onMounted(() => {
  window.addEventListener('keydown', handleSubmitShortcut)
  loadQuestion()
  clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
watch(() => [route.query.questionId, examId.value], ([id], [, previousExamId]) => {
  if (String(id || '') !== questionId || examId.value !== previousExamId) {
    judgeController?.abort()
    submitting.value = false
    submissionContext.value = null
    question.value = null
    loadQuestion()
  }
})

onBeforeUnmount(() => {
  controller?.abort()
  clearInterval(clockTimer)
  judgeController?.abort()
  window.removeEventListener('keydown', handleSubmitShortcut)
})
</script>

<style lang="scss" scoped>
.language-pill { color: #647780; font-size: 12px; white-space: nowrap; }
.editor-wrap { display: flex; flex-direction: column; }
.editor-wrap :deep(.code-editor) { flex: 1; min-height: 0 !important; height: auto; }
.editor-wrap :deep(.editor-body), .editor-wrap :deep(textarea) { min-height: 0; }
.editor-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; padding: 8px 14px; border-top: 1px solid #edf1f3; color: #7e8d96; background: #fafcfd; font-size: 11px; }
.result-summary .case-count { width: auto; height: auto; padding: 5px 9px; border-radius: 6px; color: #58716b; background: #eef7f4; font-size: 12px; }
.result-summary .judge-message { max-height: 180px; margin: 7px 0 0; overflow: auto; color: #63727c; font: 12px/1.7 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.case-list { display: grid; gap: 8px; margin-top: 18px; }
.case-detail { border: 1px solid #e4ecef; border-radius: 8px; overflow: hidden; }
.case-detail summary { display: flex; justify-content: space-between; padding: 10px 12px; color: #52636e; background: #f8fafb; font-size: 12px; cursor: pointer; }
.case-detail summary::before { content: '+'; margin-right: 8px; }
.case-detail[open] summary::before { content: '−'; }
.case-detail summary span:first-child { margin-right: auto; }
.case-fail { color: #d25752; }
.case-outputs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 12px; }
.case-outputs small { color: #8a98a0; font-size: 11px; }
.case-outputs pre { max-height: 160px; margin: 6px 0 0; overflow: auto; color: #40515d; font: 12px/1.7 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.retry-result { margin: 16px 0 0 45px; padding: 8px 14px; border: 1px solid #a8ddef; border-radius: 7px; color: #147ca5; background: #eefaff; cursor: pointer; }
.query-hint { margin: 8px 0 0 45px; color: #879298; font-size: 11px; }
.status-dot.is-error { background: #e4a22e; }
.result-content.is-error .result-summary > span { background: #e4a22e; }
.result-content.is-error .result-summary strong { color: #a77622; }
button:focus-visible, summary:focus-visible { outline: 2px solid #23b9f1; outline-offset: 3px; }
@media (max-width: 600px) { .language-pill { display: none; }.case-outputs { grid-template-columns: 1fr; }.result-summary .case-count { grid-column: 2; justify-self: start; }.pane-title small { display: none; } }
.answer-page { position: fixed; z-index: 20; inset: 0; overflow: auto; color: #344249; background: #f2f5f6; }.ide-header { position: sticky; z-index: 3; top: 0; display: flex; height: 64px; align-items: center; justify-content: space-between; gap: 20px; padding: 0 20px; border-bottom: 1px solid #e4eaed; background: rgb(255 255 255 / 96%); backdrop-filter: blur(10px); }.contest-brand { display: flex; min-width: 0; align-items: center; gap: 11px; }.contest-brand img { width: 34px; height: 34px; border-radius: 8px; }.contest-brand div { display: flex; min-width: 0; flex-direction: column; }.contest-brand span { color: #25b9ef; font-size: 8px; font-weight: 750; letter-spacing: .15em; }.contest-brand strong { overflow: hidden; color: #26343b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.countdown { display: flex; align-items: center; gap: 10px; }.countdown small { color: #929da3; }.countdown strong { color: #26343b; font: 600 17px ui-monospace, monospace; letter-spacing: .08em; }.ide-actions { display: flex; align-items: center; gap: 9px; }.preview-pill { padding: 5px 9px; border-radius: 10px; color: #218aac; background: #eaf9ff; font-size: 10px; }.submit-button, .exit-button { height: 36px; padding: 0 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }.submit-button { color: #fff; background: #32c5ff; box-shadow: 0 5px 12px rgb(50 197 255 / 20%); }.submit-button:disabled { cursor: wait; opacity: .55; }.exit-button { color: #6e7b82; border: 1px solid #dce4e7; background: #fff; }
.ide-main { display: grid; height: calc(100vh - 64px); min-height: 640px; grid-template-columns: minmax(360px, 42%) minmax(500px, 58%); gap: 8px; padding: 8px; }.problem-pane, .coding-pane { min-width: 0; overflow: hidden; border: 1px solid #e3e9ec; border-radius: 10px; background: #fff; }.problem-pane { display: flex; flex-direction: column; }.pane-toolbar { display: flex; height: 50px; flex: 0 0 50px; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #edf1f3; background: #fafcfc; }.pane-title { display: flex; align-items: center; gap: 8px; }.pane-title span { color: #2f3d44; font-size: 13px; font-weight: 650; }.pane-title small { color: #a1abb0; }.question-nav { display: flex; align-items: center; gap: 5px; }.nav-loading { margin-right: 5px; color: #218aac; font-size: 11px; white-space: nowrap; }.question-nav button { height: 30px; padding: 0 9px; border-radius: 5px; color: #77858c; cursor: pointer; }.question-nav button:hover:not(:disabled) { color: #1eb9f2; background: #effaff; }.question-nav button:disabled { opacity: .5; cursor: not-allowed; }.problem-content { flex: 1; padding: 25px 26px 55px; overflow: auto; }.problem-heading { display: flex; align-items: center; gap: 12px; }.problem-heading h1 { margin: 0; color: #202d34; font-size: 24px; letter-spacing: -.02em; }.difficulty { padding: 4px 9px; border-radius: 10px; color: #1da579; background: #ebfaf4; font-size: 10px; }.difficulty.is-2 { color: #bc7d20; background: #fff6e8; }.difficulty.is-3 { color: #de5f58; background: #fff0ef; }.problem-meta { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0 28px; }.problem-meta span { padding: 4px 8px; border-radius: 4px; color: #849097; background: #f3f6f7; font-size: 10px; }.problem-content section { margin-top: 26px; }.problem-content h2 { margin: 0 0 10px; color: #344249; font-size: 14px; }.problem-content p { margin: 0; color: #59676e; font-size: 13px; line-height: 1.9; white-space: pre-wrap; }.example-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }.example-grid > div { overflow: hidden; border: 1px solid #e7ecef; border-radius: 7px; }.example-grid span { display: block; padding: 7px 10px; color: #839097; background: #f7f9fa; font-size: 10px; }.example-grid pre { min-height: 54px; margin: 0; padding: 10px; overflow: auto; color: #344249; background: #fcfdfd; font: 12px/1.6 ui-monospace, monospace; }.example-note { margin-top: 8px !important; color: #8d979c !important; font-size: 11px !important; }.problem-loading { padding: 28px; }
.coding-pane { display: grid; grid-template-rows: minmax(360px, 58%) minmax(240px, 42%); gap: 8px; border: 0; background: transparent; }.editor-wrap, .result-panel { min-height: 0; overflow: hidden; border: 1px solid #e3e9ec; border-radius: 10px; background: #fff; }.editor-wrap :deep(.code-editor) { min-height: 100%; border: 0; border-radius: 0; }.result-panel { display: flex; flex-direction: column; }.result-panel > header { display: flex; height: 46px; flex: 0 0 46px; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #edf1f3; background: #fafcfc; }.result-panel > header > div { display: flex; align-items: center; gap: 8px; }.result-panel header strong { color: #344249; font-size: 12px; }.result-panel header > span { color: #9ca6ab; font-size: 10px; }.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbc3c7; }.status-dot.is-running { background: #f1af3f; box-shadow: 0 0 0 4px rgb(241 175 63 / 13%); }.status-dot.is-accepted { background: #2fc18d; }.status-dot.is-failed { background: #ef6e67; }.result-empty { display: grid; flex: 1; place-items: center; align-content: center; color: #a1abb0; }.result-empty > span { font-size: 28px; }.result-empty p { margin: 8px 0 0; font-size: 11px; }.result-running { display: flex; flex: 1; align-items: center; justify-content: center; gap: 14px; }.result-running i { width: 24px; height: 24px; border: 3px solid #dff5fc; border-top-color: #32c5ff; border-radius: 50%; animation: spin .8s linear infinite; }.result-running strong { color: #46545b; font-size: 13px; }.result-running p { margin: 4px 0 0; color: #98a3a8; font-size: 11px; }.result-content { padding: 16px; overflow: auto; }.result-summary { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 11px; }.result-summary > span { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: #fff; background: #2fc18d; }.result-content.is-failed .result-summary > span { background: #ef6e67; }.result-summary strong { color: #299d75; font-size: 14px; }.result-content.is-failed .result-summary strong { color: #db5b55; }.result-summary p { margin: 3px 0 0; color: #879298; font-size: 10px; }.result-summary dl { display: flex; gap: 18px; margin: 0; }.result-summary dl div { text-align: right; }.result-summary dt { color: #9ca6ab; font-size: 9px; }.result-summary dd { margin: 3px 0 0; color: #536169; font-size: 11px; }.result-content table { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: 10px; }.result-content th, .result-content td { padding: 7px 9px; border-bottom: 1px solid #eef1f2; text-align: left; }.result-content th { color: #9ba5aa; background: #f8fafb; }.case-pass { color: #299d75; }
.question-notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 16px 0; padding: 11px 14px; border: 1px solid #bde8d9; border-radius: 8px; color: #177b58; background: #effbf6; font-size: 13px; font-weight: 600; }
.question-notice.is-error { border-color: #f3c5c2; color: #bd5149; background: #fff5f4; }
.question-notice button, .question-load-error button { min-height: 32px; padding: 0 12px; border: 1px solid currentColor; border-radius: 6px; color: inherit; background: transparent; cursor: pointer; white-space: nowrap; }
.question-load-error { display: grid; place-content: center; justify-items: center; gap: 12px; flex: 1; padding: 30px; color: #bd5149; text-align: center; }
.question-load-error p { margin: 0; }
.problem-content.is-loading { opacity: .6; pointer-events: none; transition: opacity .18s ease; }
.answer-options { margin: 0; padding-left: 24px; color: #59676e; font-size: 13px; line-height: 1.9; white-space: pre-wrap; }
.answer-options li { padding: 3px 0; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) { .ide-main { height: auto; min-height: calc(100vh - 64px); grid-template-columns: 1fr; }.problem-pane { min-height: 660px; }.coding-pane { min-height: 740px; }.countdown { display: none; } }
@media (max-width: 600px) { .ide-header { padding: 0 10px; }.contest-brand span { display: none; }.contest-brand strong { max-width: 110px; }.preview-pill { display: none; }.submit-button, .exit-button { padding: 0 11px; }.ide-main { padding: 5px; }.problem-content { padding: 20px 16px 45px; }.example-grid { grid-template-columns: 1fr; }.result-summary { grid-template-columns: 34px 1fr; }.result-summary dl { grid-column: 2; }.question-nav button { min-height: 36px; padding: 0 7px; font-size: 11px; }.nav-loading { display: none; } }
@media (max-width: 600px) { .problem-pane { min-height: 0; max-height: 55vh; }.problem-content { flex: auto; }.coding-pane { height: 740px; }.problem-heading { flex-wrap: wrap; }.problem-heading h1 { overflow-wrap: anywhere; } }
</style>

