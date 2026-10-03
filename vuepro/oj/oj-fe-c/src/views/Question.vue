<template>
  <main class="question-page" aria-labelledby="question-title">
    <PageHeader
      id="question-title"
      eyebrow="PROBLEM LIBRARY"
      title="探索题库"
      description="从基础到进阶，按难度筛选并开始一次专注练习。"
    >
      <div class="learning-stat" aria-label="题库概览">
        <strong>{{ total }}</strong><span>道可练习题目</span>
      </div>
    </PageHeader>

    <PreviewNotice v-if="previewMode" class="preview-banner" />

    <section class="question-layout">
      <div class="question-panel">
        <form class="filter-bar" role="search" @submit.prevent="search">
          <label class="search-field">
            <el-icon aria-hidden="true"><Search /></el-icon>
            <input v-model.trim="filters.keyword" placeholder="搜索题目标题或知识点" maxlength="50">
          </label>
          <QuestionSelector v-model="filters.difficulty" class="difficulty-select" />
          <button class="primary-button" type="submit" :disabled="loading">搜索</button>
          <button class="reset-button" type="button" :disabled="loading || !hasFilter" @click="reset">重置</button>
        </form>

        <div class="table-head" aria-hidden="true">
          <span>状态</span><span>题目</span><span>难度</span><span>通过率</span><span></span>
        </div>

        <div v-if="loading" class="skeleton-list" aria-label="题目正在加载">
          <el-skeleton v-for="index in 7" :key="index" animated :rows="1" />
        </div>

        <div v-else-if="!questions.length" class="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>没有找到匹配的题目</h2>
          <p>换一个关键词或清除难度筛选后再试试。</p>
          <button type="button" @click="reset">清除筛选</button>
        </div>

        <ol v-else class="question-list">
          <li v-for="question in questions" :key="question.questionId">
            <span class="question-state" :class="{ 'is-solved': question.solved }" :title="question.solved ? '已通过' : '未作答'">
              {{ question.solved ? '✓' : '·' }}
            </span>
            <div class="question-name">
              <button type="button" @click="openQuestion(question)">{{ question.title }}</button>
              <div class="tag-list">
                <span v-for="tag in question.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <span class="difficulty" :class="`is-${question.difficulty}`">{{ difficultyLabel(question.difficulty) }}</span>
            <span class="acceptance">{{ question.acceptedRate }}%</span>
            <button class="practice-button" type="button" @click="openQuestion(question)">
              {{ isAuthenticated ? '开始答题' : '登录后答题' }}
            </button>
          </li>
        </ol>

        <el-pagination
          v-if="total > filters.pageSize"
          class="pagination"
          background
          layout="prev, pager, next"
          :current-page="filters.pageNum"
          :page-size="filters.pageSize"
          :total="total"
          @current-change="changePage"
        />
      </div>

      <aside class="question-aside">
        <section class="daily-card">
          <p class="aside-eyebrow">DAILY PRACTICE</p>
          <h2>今天也要进步一点</h2>
          <p>{{ currentDate }}</p>
          <div class="week-row" aria-label="本周练习进度">
            <span v-for="day in weekDays" :key="day.label" :class="{ 'is-today': day.today, 'is-past': day.past }">
              <small>{{ day.label }}</small><b>{{ day.date }}</b>
            </span>
          </div>
        </section>

        <section class="hot-card">
          <div class="aside-title"><div><p class="aside-eyebrow">TRENDING</p><h2>热门题目</h2></div><span>TOP 5</span></div>
          <ol>
            <li v-for="(question, index) in hotQuestions" :key="question.questionId">
              <b :class="{ 'is-top': index < 3 }">{{ String(index + 1).padStart(2, '0') }}</b>
              <button type="button" @click="openQuestion(question)">{{ question.title }}</button>
              <span>{{ difficultyLabel(question.difficulty) }}</span>
            </li>
          </ol>
        </section>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PreviewNotice from '@/components/PreviewNotice.vue'
import QuestionSelector from '@/components/QuestionSelector.vue'
import { getHotQuestionListService, getQuestionListService } from '@/apis/question'
import { demoQuestions } from '@/data/demoData'
import { userState } from '@/stores/user'
import { withPreviewFallback } from '@/utils/previewFallback'
import { filterQuestionSummaries, getDifficultyLabel, normalizeQuestionSummary } from '@/utils/question'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const previewMode = ref(false)
const questions = ref([])
const hotQuestions = ref([])
const total = ref(0)
const filters = reactive({ pageNum: 1, pageSize: 10, difficulty: '', keyword: '' })
let controller
let requestSequence = 0

const isAuthenticated = computed(() => userState.isAuthenticated)
const hasFilter = computed(() => Boolean(filters.keyword || filters.difficulty))
const currentDate = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
const weekDays = computed(() => {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  return ['一', '二', '三', '四', '五', '六', '日'].map((label, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - mondayOffset + index)
    date.setHours(0, 0, 0, 0)
    const today = date.toDateString() === now.toDateString()
    return { label: `周${label}`, date: date.getDate(), today, past: date < new Date(now.toDateString()) }
  })
})

function filterDemoRows() {
  return filterQuestionSummaries(demoQuestions, filters)
}

async function loadQuestions() {
  controller?.abort()
  controller = new AbortController()
  const activeController = controller
  const sequence = ++requestSequence
  loading.value = true
  try {
    const fallbackRows = filterDemoRows()
    const fallbackStart = (filters.pageNum - 1) * filters.pageSize
    const filteredRequest = hasFilter.value
      ? { ...filters, pageNum: 1, pageSize: 500 }
      : filters
    const result = await withPreviewFallback(
      () => getQuestionListService(filteredRequest, { signal: activeController.signal }),
      {
        rows: hasFilter.value
          ? fallbackRows
          : fallbackRows.slice(fallbackStart, fallbackStart + filters.pageSize),
        total: fallbackRows.length,
      },
    )
    if (sequence !== requestSequence) return
    previewMode.value = previewMode.value || result.preview
    const normalizedRows = (Array.isArray(result.data?.rows) ? result.data.rows : []).map(normalizeQuestionSummary)
    if (hasFilter.value) {
      const filteredRows = filterQuestionSummaries(normalizedRows, filters)
      questions.value = filteredRows.slice(fallbackStart, fallbackStart + filters.pageSize)
      total.value = filteredRows.length
    } else {
      questions.value = normalizedRows
      total.value = Math.max(0, Number(result.data?.total) || normalizedRows.length)
    }
  } catch (error) {
    if (error?.name !== 'CanceledError' && error?.name !== 'AbortError' && error?.code !== 3001) throw error
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

async function loadHotQuestions() {
  const result = await withPreviewFallback(
    () => getHotQuestionListService({ signal: controller?.signal }),
    demoQuestions.slice(0, 5),
  )
  previewMode.value = previewMode.value || result.preview
  const rows = Array.isArray(result.data?.data) ? result.data.data : result.data
  hotQuestions.value = (Array.isArray(rows) ? rows : demoQuestions).slice(0, 5).map(normalizeQuestionSummary)
}

function search() {
  filters.pageNum = 1
  loadQuestions()
}

function reset() {
  filters.keyword = ''
  filters.difficulty = ''
  filters.pageNum = 1
  loadQuestions()
}

function changePage(page) {
  filters.pageNum = page
  loadQuestions()
  window.scrollTo({ top: 280, behavior: 'smooth' })
}

function difficultyLabel(value) {
  return getDifficultyLabel(value)
}

function openQuestion(question) {
  const target = { name: 'answer', query: { questionId: question.questionId } }
  if (!isAuthenticated.value) {
    router.push({ name: 'login', query: { redirect: router.resolve(target).fullPath } })
    return
  }
  router.push(target)
}

onMounted(async () => {
  if (typeof route.query.keyword === 'string') filters.keyword = route.query.keyword
  await Promise.all([loadQuestions(), loadHotQuestions()])
})
onBeforeUnmount(() => controller?.abort())
</script>

<style lang="scss" scoped>
.question-page { max-width: 1520px; margin: 0 auto; padding: 30px 0 64px; }
.learning-stat { display: flex; align-items: baseline; gap: 7px; color: #869198; font-size: 13px; }
.learning-stat strong { color: #23b9f1; font-size: 26px; }
.preview-banner { margin-top: 20px; }
.question-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 20px; margin-top: 24px; }
.question-panel, .daily-card, .hot-card { border: 1px solid #edf2f4; border-radius: 14px; background: #fff; box-shadow: 0 10px 30px rgb(38 65 79 / 5%); }
.question-panel { min-width: 0; overflow: hidden; }
.filter-bar { display: flex; align-items: center; gap: 10px; padding: 20px; }
.search-field { display: flex; height: 42px; min-width: 180px; flex: 1; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e1e8eb; border-radius: 8px; background: #f9fbfc; transition: border-color .2s, box-shadow .2s; }
.search-field:focus-within { border-color: #69d2f7; box-shadow: 0 0 0 3px rgb(50 197 255 / 10%); }
.search-field .el-icon { color: #98a4ab; }
.search-field input { width: 100%; outline: 0; color: #313c42; font: inherit; }
.difficulty-select { width: 150px; }
.primary-button, .reset-button, .practice-button, .empty-state button { height: 40px; padding: 0 19px; border-radius: 7px; font-size: 14px; cursor: pointer; transition: .2s ease; }
.primary-button { color: #fff; background: #32c5ff; box-shadow: 0 6px 14px rgb(50 197 255 / 20%); }
.primary-button:hover { background: #20b9f4; transform: translateY(-1px); }
.reset-button { color: #77848b; border-color: #e0e6e9; background: #fff; }
button:disabled { cursor: not-allowed; opacity: .55; }
.table-head, .question-list li { display: grid; grid-template-columns: 54px minmax(260px, 1fr) 100px 100px 120px; align-items: center; }
.table-head { height: 42px; padding: 0 20px; color: #96a0a6; background: #f5fbfd; font-size: 12px; font-weight: 650; }
.question-list { margin: 0; padding: 0 20px; list-style: none; }
.question-list li { min-height: 68px; border-bottom: 1px solid #f0f3f5; }
.question-list li:last-child { border-bottom: 0; }
.question-state { display: grid; width: 22px; height: 22px; place-items: center; border: 1px solid #dbe3e7; border-radius: 50%; color: #aab4b9; font-size: 17px; }
.question-state.is-solved { border-color: #9edfc8; color: #1aa975; background: #eefaf5; font-size: 12px; }
.question-name { min-width: 0; padding: 10px 16px 10px 0; }
.question-name > button { max-width: 100%; overflow: hidden; color: #27343b; font-size: 15px; font-weight: 600; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.question-name > button:hover { color: #20b9f4; }
.tag-list { display: flex; gap: 5px; margin-top: 5px; }
.tag-list span { padding: 2px 6px; border-radius: 4px; color: #839097; background: #f3f6f7; font-size: 10px; }
.difficulty { justify-self: start; padding: 4px 10px; border-radius: 12px; color: #1aa975; background: #ecfaf5; font-size: 12px; }
.difficulty.is-2 { color: #c78017; background: #fff7e9; }
.difficulty.is-3 { color: #e65d56; background: #fff0ef; }
.acceptance { color: #78858c; font-size: 13px; }
.practice-button { width: 100px; height: 34px; padding: 0 10px; border: 1px solid #aee6fa; color: #1eb9f2; background: #f5fcff; }
.practice-button:hover { color: #fff; background: #32c5ff; }
.pagination { justify-content: flex-end; padding: 18px 20px 22px; border-top: 1px solid #f0f3f5; }
.skeleton-list { display: grid; gap: 22px; padding: 24px; }
.empty-state { display: grid; min-height: 380px; place-items: center; align-content: center; color: #9aa5ab; text-align: center; }
.empty-state > span { font-size: 38px; }
.empty-state h2 { margin: 12px 0 5px; color: #4f5c63; font-size: 18px; }
.empty-state p { margin: 0 0 16px; font-size: 13px; }
.empty-state button { color: #1eb9f2; border-color: #aee6fa; }
.question-aside { display: flex; flex-direction: column; gap: 20px; }
.daily-card, .hot-card { padding: 22px; }
.daily-card { overflow: hidden; background: linear-gradient(145deg, #eaf9ff, #fff 55%); }
.aside-eyebrow { margin: 0 0 4px; color: #27b8ed; font-size: 10px; font-weight: 750; letter-spacing: .15em; }
.daily-card h2, .hot-card h2 { margin: 0; color: #27333a; font-size: 18px; }
.daily-card > p:not(.aside-eyebrow) { margin: 8px 0 20px; color: #87939a; font-size: 12px; }
.week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.week-row span { display: flex; height: 54px; align-items: center; justify-content: center; flex-direction: column; gap: 4px; border-radius: 8px; color: #8b979d; background: rgb(255 255 255 / 72%); }
.week-row small { font-size: 9px; }.week-row b { color: #56646b; font-size: 13px; }
.week-row .is-past b { color: #28b98a; }.week-row .is-today { color: #fff; background: #32c5ff; box-shadow: 0 7px 15px rgb(50 197 255 / 25%); }.week-row .is-today b { color: #fff; }
.aside-title { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid #edf1f3; }
.aside-title > span { color: #a6b0b5; font-size: 10px; }
.hot-card ol { margin: 4px 0 0; padding: 0; list-style: none; }
.hot-card li { display: grid; min-height: 52px; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 8px; border-bottom: 1px solid #f1f3f4; }
.hot-card li:last-child { border-bottom: 0; }.hot-card li b { color: #aeb7bc; font-size: 12px; }.hot-card li b.is-top { color: #2bbcf1; }
.hot-card li button { overflow: hidden; color: #46545c; font-size: 13px; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }.hot-card li button:hover { color: #22b8ef; }.hot-card li > span { color: #9ba6ac; font-size: 11px; }
@media (max-width: 1050px) { .question-layout { grid-template-columns: 1fr; }.question-aside { display: grid; grid-template-columns: 1fr 1fr; }.table-head, .question-list li { grid-template-columns: 46px minmax(220px, 1fr) 80px 80px 110px; } }
@media (max-width: 760px) { .question-page { padding-top: 24px; }.filter-bar { flex-wrap: wrap; padding: 14px; }.search-field { flex-basis: 100%; }.difficulty-select { flex: 1; }.table-head { display: none; }.question-list { padding: 0 14px; }.question-list li { grid-template-columns: 34px minmax(0, 1fr) auto; padding: 10px 0; }.acceptance { display: none; }.practice-button { grid-column: 2 / 4; width: 100%; margin-top: 5px; }.question-aside { grid-template-columns: 1fr; }.difficulty { grid-column: 3; grid-row: 1; }.learning-stat { display: none; } }
</style>
