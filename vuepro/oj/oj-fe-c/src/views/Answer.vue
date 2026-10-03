<template>
  <main class="answer-page">
    <header class="ide-header">
      <div class="contest-brand"><img src="@/assets/logo.png" alt=""><div><span>{{ contestMode ? 'CONTEST WORKSPACE' : 'PRACTICE WORKSPACE' }}</span><strong>{{ pageTitle }}</strong></div></div>
      <div v-if="contestMode && remainingTime" class="countdown"><small>距离结束</small><strong>{{ remainingTime }}</strong></div>
      <div class="ide-actions"><span v-if="previewMode" class="preview-pill">预览模式</span><button class="submit-button" type="button" :disabled="loading || submitting || !code.trim()" @click="submitCode">{{ submitting ? '评测中…' : '提交代码' }}</button><button class="exit-button" type="button" @click="goBack">退出</button></div>
    </header>

    <div class="ide-main">
      <section class="problem-pane">
        <header class="pane-toolbar">
          <div class="pane-title"><span>题目描述</span><small>#{{ question.questionId }}</small></div>
          <div class="question-nav"><button type="button" :disabled="loading" @click="navigateQuestion('previous')">← 上一题</button><button type="button" :disabled="loading" @click="navigateQuestion('next')">下一题 →</button></div>
        </header>

        <div v-if="loading" class="problem-loading"><el-skeleton animated :rows="10" /></div>
        <article v-else class="problem-content">
          <div class="problem-heading"><h1>{{ question.title }}</h1><span class="difficulty" :class="`is-${question.difficulty}`">{{ difficultyLabel }}</span></div>
          <div class="problem-meta"><span>时间限制 {{ question.timeLimit }} ms</span><span>内存限制 {{ formatMemory(question.spaceLimit) }}</span><span v-for="tag in question.tags" :key="tag">{{ tag }}</span></div>
          <section><h2>题目描述</h2><p>{{ question.description }}</p></section>
          <section><h2>输入描述</h2><p>{{ question.inputDescription }}</p></section>
          <section><h2>输出描述</h2><p>{{ question.outputDescription }}</p></section>
          <section v-for="(example, index) in question.examples" :key="index" class="example-section">
            <h2>示例 {{ index + 1 }}</h2>
            <div class="example-grid"><div><span>输入</span><pre>{{ example.input }}</pre></div><div><span>输出</span><pre>{{ example.output }}</pre></div></div>
            <p v-if="example.explanation" class="example-note">说明：{{ example.explanation }}</p>
          </section>
        </article>
      </section>

      <section class="coding-pane">
        <div class="editor-wrap"><CodeEditor v-model="code" /></div>
        <section class="result-panel">
          <header><div><span class="status-dot" :class="`is-${judgeState}`"></span><strong>执行结果</strong></div><span>{{ resultCaption }}</span></header>
          <div v-if="judgeState === 'idle'" class="result-empty"><span aria-hidden="true">⌁</span><p>提交代码后，评测结果会显示在这里</p></div>
          <div v-else-if="judgeState === 'running'" class="result-running"><i></i><div><strong>正在评测</strong><p>代码已进入评测队列，请稍候…</p></div></div>
          <div v-else class="result-content" :class="`is-${judgeState}`">
            <div class="result-summary"><span>{{ judgeState === 'accepted' ? '✓' : '!' }}</span><div><strong>{{ judgeState === 'accepted' ? '答案正确' : '未通过' }}</strong><p>{{ resultMessage }}</p></div><dl><div><dt>用时</dt><dd>{{ judgeResult.time || '--' }} ms</dd></div><div><dt>内存</dt><dd>{{ judgeResult.memory || '--' }} KB</dd></div></dl></div>
            <table v-if="judgeResult.cases?.length"><thead><tr><th>测试点</th><th>状态</th><th>用时</th></tr></thead><tbody><tr v-for="item in judgeResult.cases" :key="item.name"><td>{{ item.name }}</td><td><span class="case-pass">{{ item.status }}</span></td><td>{{ item.time }} ms</td></tr></tbody></table>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CodeEditor from '@/components/CodeEditor.vue'
import {
  getAdjacentQuestionService,
  getFirstExamQuestionService,
  getQuestionDetailService,
  getQuestionResultService,
  submitQuestionService,
} from '@/apis/question'
import { createDemoQuestion, demoQuestions } from '@/data/demoData'
import { withPreviewFallback } from '@/utils/previewFallback'
import { getDifficultyLabel } from '@/utils/question'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const previewMode = ref(false)
const code = ref('')
const judgeState = ref('idle')
const judgeResult = reactive({ time: '', memory: '', cases: [] })
const resultMessage = ref('')
const now = ref(Date.now())
const question = reactive(createDemoQuestion(route.query.questionId))
let questionId = String(route.query.questionId || '')
const examId = computed(() => String(route.params.examId || route.query.examId || ''))
const contestMode = computed(() => route.meta.contestMode || (examId.value ? 'answer' : ''))
let controller
let clockTimer
let pollTimer
let submissionTime = ''

const pageTitle = computed(() => typeof route.query.title === 'string' && route.query.title ? route.query.title : (contestMode.value ? '算法竞赛' : '精选题库'))
const difficultyLabel = computed(() => getDifficultyLabel(question.difficulty))
const resultCaption = computed(() => ({ idle: '等待提交', running: '评测队列处理中', accepted: 'Accepted', failed: 'Wrong Answer' })[judgeState.value])
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

function plainText(value) {
  if (!value) return ''
  const element = document.createElement('div')
  element.innerHTML = String(value)
  return element.textContent?.trim() || ''
}

function normalizeQuestion(payload) {
  const data = payload?.data || payload || {}
  const fallback = createDemoQuestion(questionId)
  const difficulty = Number(data.difficulty ?? data.difficult ?? fallback.difficulty)
  return {
    ...fallback,
    ...data,
    questionId: String(data.questionId ?? questionId ?? fallback.questionId),
    difficulty,
    description: plainText(data.description || data.content) || fallback.description,
    inputDescription: plainText(data.inputDescription) || fallback.inputDescription,
    outputDescription: plainText(data.outputDescription) || fallback.outputDescription,
    examples: Array.isArray(data.examples) && data.examples.length ? data.examples : fallback.examples,
    tags: Array.isArray(data.tags) ? data.tags : fallback.tags,
    defaultCode: data.defaultCode || fallback.defaultCode,
  }
}

async function resolveQuestionId() {
  if (questionId || !examId.value) return
  const result = await withPreviewFallback(() => getFirstExamQuestionService(examId.value, { signal: controller.signal }), '1001')
  previewMode.value = previewMode.value || result.preview
  questionId = String(result.data?.data || result.data || '1001')
}

async function loadQuestion() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    await resolveQuestionId()
    if (!questionId) questionId = '1001'
    const result = await withPreviewFallback(
      () => getQuestionDetailService(questionId, { signal: controller.signal }),
      { data: createDemoQuestion(questionId) },
    )
    previewMode.value = previewMode.value || result.preview
    Object.assign(question, normalizeQuestion(result.data))
    code.value = question.defaultCode
    judgeState.value = 'idle'
  } finally {
    loading.value = false
  }
}

async function navigateQuestion(direction) {
  if (loading.value) return
  if (!previewMode.value) {
    try {
      const result = await getAdjacentQuestionService(direction, questionId, examId.value, { signal: controller.signal })
      questionId = String(result.data)
      await updateQuestionRoute()
      return
    } catch (error) {
      if (error?.code === 3001) return
      previewMode.value = true
    }
  }

  const index = Math.max(0, demoQuestions.findIndex((item) => String(item.questionId) === questionId))
  const step = direction === 'previous' ? -1 : 1
  const target = demoQuestions[(index + step + demoQuestions.length) % demoQuestions.length]
  questionId = String(target.questionId)
  await updateQuestionRoute()
}

async function updateQuestionRoute() {
  await router.replace({ query: { ...route.query, questionId } })
  await loadQuestion()
}

async function submitCode() {
  if (!code.value.trim() || submitting.value) return
  submitting.value = true
  judgeState.value = 'running'
  Object.assign(judgeResult, { time: '', memory: '', cases: [] })
  try {
    if (!previewMode.value) {
      try {
        await submitQuestionService({ examId: examId.value || '', questionId, programType: 0, userCode: code.value })
        submissionTime = new Date().toLocaleString('zh-CN', { hour12: false })
        schedulePoll()
        return
      } catch (error) {
        if (error?.code === 3001) throw error
        previewMode.value = true
      }
    }
    pollTimer = window.setTimeout(showDemoResult, 900)
  } finally {
    if (previewMode.value) submitting.value = false
  }
}

function schedulePoll() {
  clearTimeout(pollTimer)
  pollTimer = window.setTimeout(pollResult, 1800)
}

async function pollResult() {
  try {
    const result = await getQuestionResultService({ examId: examId.value || '', questionId, currentTime: submissionTime }, { signal: controller?.signal })
    const data = result.data || {}
    if (Number(data.pass) === 3) {
      schedulePoll()
      return
    }
    judgeState.value = Number(data.pass) === 1 ? 'accepted' : 'failed'
    resultMessage.value = data.exeMessage || (judgeState.value === 'accepted' ? '已通过全部测试用例' : '请检查代码逻辑后重新提交')
    judgeResult.cases = (data.userExeResultList || []).map((item, index) => ({ name: `测试点 ${index + 1}`, status: item.exeOutput === item.output ? '通过' : '失败', time: item.time || '--' }))
  } catch (error) {
    if (error?.code !== 3001) {
      previewMode.value = true
      showDemoResult()
    }
  } finally {
    if (judgeState.value !== 'running') submitting.value = false
  }
}

function showDemoResult() {
  judgeState.value = 'accepted'
  resultMessage.value = '已通过 8 / 8 个测试用例（预览结果）'
  Object.assign(judgeResult, {
    time: 42,
    memory: 18432,
    cases: Array.from({ length: 4 }, (_, index) => ({ name: `测试点 ${index + 1}`, status: '通过', time: 31 + index * 4 })),
  })
  submitting.value = false
}

function formatMemory(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${Math.round(number / 1024)} MB` : '--'
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: examId.value ? 'exam' : 'question' })
}

onMounted(() => {
  loadQuestion()
  clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => {
  controller?.abort()
  clearInterval(clockTimer)
  clearTimeout(pollTimer)
})
</script>

<style lang="scss" scoped>
.answer-page { position: fixed; z-index: 20; inset: 0; overflow: auto; color: #344249; background: #f2f5f6; }.ide-header { position: sticky; z-index: 3; top: 0; display: flex; height: 64px; align-items: center; justify-content: space-between; gap: 20px; padding: 0 20px; border-bottom: 1px solid #e4eaed; background: rgb(255 255 255 / 96%); backdrop-filter: blur(10px); }.contest-brand { display: flex; min-width: 0; align-items: center; gap: 11px; }.contest-brand img { width: 34px; height: 34px; border-radius: 8px; }.contest-brand div { display: flex; min-width: 0; flex-direction: column; }.contest-brand span { color: #25b9ef; font-size: 8px; font-weight: 750; letter-spacing: .15em; }.contest-brand strong { overflow: hidden; color: #26343b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.countdown { display: flex; align-items: center; gap: 10px; }.countdown small { color: #929da3; }.countdown strong { color: #26343b; font: 600 17px ui-monospace, monospace; letter-spacing: .08em; }.ide-actions { display: flex; align-items: center; gap: 9px; }.preview-pill { padding: 5px 9px; border-radius: 10px; color: #218aac; background: #eaf9ff; font-size: 10px; }.submit-button, .exit-button { height: 36px; padding: 0 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }.submit-button { color: #fff; background: #32c5ff; box-shadow: 0 5px 12px rgb(50 197 255 / 20%); }.submit-button:disabled { cursor: wait; opacity: .55; }.exit-button { color: #6e7b82; border: 1px solid #dce4e7; background: #fff; }
.ide-main { display: grid; height: calc(100vh - 64px); min-height: 640px; grid-template-columns: minmax(360px, 42%) minmax(500px, 58%); gap: 8px; padding: 8px; }.problem-pane, .coding-pane { min-width: 0; overflow: hidden; border: 1px solid #e3e9ec; border-radius: 10px; background: #fff; }.problem-pane { display: flex; flex-direction: column; }.pane-toolbar { display: flex; height: 50px; flex: 0 0 50px; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #edf1f3; background: #fafcfc; }.pane-title { display: flex; align-items: center; gap: 8px; }.pane-title span { color: #2f3d44; font-size: 13px; font-weight: 650; }.pane-title small { color: #a1abb0; }.question-nav { display: flex; gap: 5px; }.question-nav button { height: 30px; padding: 0 9px; border-radius: 5px; color: #77858c; cursor: pointer; }.question-nav button:hover { color: #1eb9f2; background: #effaff; }.problem-content { flex: 1; padding: 25px 26px 55px; overflow: auto; }.problem-heading { display: flex; align-items: center; gap: 12px; }.problem-heading h1 { margin: 0; color: #202d34; font-size: 24px; letter-spacing: -.02em; }.difficulty { padding: 4px 9px; border-radius: 10px; color: #1da579; background: #ebfaf4; font-size: 10px; }.difficulty.is-2 { color: #bc7d20; background: #fff6e8; }.difficulty.is-3 { color: #de5f58; background: #fff0ef; }.problem-meta { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0 28px; }.problem-meta span { padding: 4px 8px; border-radius: 4px; color: #849097; background: #f3f6f7; font-size: 10px; }.problem-content section { margin-top: 26px; }.problem-content h2 { margin: 0 0 10px; color: #344249; font-size: 14px; }.problem-content p { margin: 0; color: #59676e; font-size: 13px; line-height: 1.9; white-space: pre-wrap; }.example-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }.example-grid > div { overflow: hidden; border: 1px solid #e7ecef; border-radius: 7px; }.example-grid span { display: block; padding: 7px 10px; color: #839097; background: #f7f9fa; font-size: 10px; }.example-grid pre { min-height: 54px; margin: 0; padding: 10px; overflow: auto; color: #344249; background: #fcfdfd; font: 12px/1.6 ui-monospace, monospace; }.example-note { margin-top: 8px !important; color: #8d979c !important; font-size: 11px !important; }.problem-loading { padding: 28px; }
.coding-pane { display: grid; grid-template-rows: minmax(360px, 58%) minmax(240px, 42%); gap: 8px; border: 0; background: transparent; }.editor-wrap, .result-panel { min-height: 0; overflow: hidden; border: 1px solid #e3e9ec; border-radius: 10px; background: #fff; }.editor-wrap :deep(.code-editor) { min-height: 100%; border: 0; border-radius: 0; }.result-panel { display: flex; flex-direction: column; }.result-panel > header { display: flex; height: 46px; flex: 0 0 46px; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #edf1f3; background: #fafcfc; }.result-panel > header > div { display: flex; align-items: center; gap: 8px; }.result-panel header strong { color: #344249; font-size: 12px; }.result-panel header > span { color: #9ca6ab; font-size: 10px; }.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbc3c7; }.status-dot.is-running { background: #f1af3f; box-shadow: 0 0 0 4px rgb(241 175 63 / 13%); }.status-dot.is-accepted { background: #2fc18d; }.status-dot.is-failed { background: #ef6e67; }.result-empty { display: grid; flex: 1; place-items: center; align-content: center; color: #a1abb0; }.result-empty > span { font-size: 28px; }.result-empty p { margin: 8px 0 0; font-size: 11px; }.result-running { display: flex; flex: 1; align-items: center; justify-content: center; gap: 14px; }.result-running i { width: 24px; height: 24px; border: 3px solid #dff5fc; border-top-color: #32c5ff; border-radius: 50%; animation: spin .8s linear infinite; }.result-running strong { color: #46545b; font-size: 13px; }.result-running p { margin: 4px 0 0; color: #98a3a8; font-size: 11px; }.result-content { padding: 16px; overflow: auto; }.result-summary { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 11px; }.result-summary > span { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: #fff; background: #2fc18d; }.result-content.is-failed .result-summary > span { background: #ef6e67; }.result-summary strong { color: #299d75; font-size: 14px; }.result-content.is-failed .result-summary strong { color: #db5b55; }.result-summary p { margin: 3px 0 0; color: #879298; font-size: 10px; }.result-summary dl { display: flex; gap: 18px; margin: 0; }.result-summary dl div { text-align: right; }.result-summary dt { color: #9ca6ab; font-size: 9px; }.result-summary dd { margin: 3px 0 0; color: #536169; font-size: 11px; }.result-content table { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: 10px; }.result-content th, .result-content td { padding: 7px 9px; border-bottom: 1px solid #eef1f2; text-align: left; }.result-content th { color: #9ba5aa; background: #f8fafb; }.case-pass { color: #299d75; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) { .ide-main { height: auto; min-height: calc(100vh - 64px); grid-template-columns: 1fr; }.problem-pane { min-height: 660px; }.coding-pane { min-height: 740px; }.countdown { display: none; } }
@media (max-width: 600px) { .ide-header { padding: 0 10px; }.contest-brand span { display: none; }.contest-brand strong { max-width: 110px; }.preview-pill { display: none; }.submit-button, .exit-button { padding: 0 11px; }.ide-main { padding: 5px; }.problem-content { padding: 20px 16px 45px; }.example-grid { grid-template-columns: 1fr; }.result-summary { grid-template-columns: 34px 1fr; }.result-summary dl { grid-column: 2; }.question-nav button { font-size: 0; }.question-nav button:first-child::after { content: '←'; font-size: 13px; }.question-nav button:last-child::after { content: '→'; font-size: 13px; } }
</style>

