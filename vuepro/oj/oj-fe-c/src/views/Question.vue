<template>
  <main class="question-page" aria-labelledby="question-page-title">
    <div class="question-layout">
      <section class="question-panel">
        <header class="page-heading">
          <div class="heading-copy">
            <p class="eyebrow">PROBLEM LIBRARY</p>
            <h1 id="question-page-title">题库</h1>
            <p class="page-description">按关键字或难度找到适合的题目，开始你的算法训练。</p>
          </div>
          <div class="result-summary" aria-live="polite">
            <span class="summary-number">{{ total }}</span>
            <span>道题目</span>
          </div>
        </header>

        <form class="filter-bar" role="search" @submit.prevent="submitSearch">
          <label class="search-field">
            <span class="sr-only">搜索题目</span>
            <el-icon class="field-icon" aria-hidden="true"><Search /></el-icon>
            <input
              v-model="draftKeyword"
              type="search"
              maxlength="100"
              autocomplete="off"
              placeholder="搜索题目名称或内容"
            >
            <button
              v-if="draftKeyword"
              class="clear-keyword"
              type="button"
              aria-label="清空搜索关键字"
              @click="clearKeyword"
            >
              <el-icon aria-hidden="true"><CircleClose /></el-icon>
            </button>
          </label>

          <label class="difficulty-field">
            <span class="sr-only">筛选题目难度</span>
            <el-select v-model="draftDifficulty" placeholder="全部难度" clearable>
              <el-option label="简单" value="1" />
              <el-option label="中等" value="2" />
              <el-option label="困难" value="3" />
            </el-select>
          </label>

          <button class="primary-button" type="submit" :disabled="loading">
            <el-icon aria-hidden="true"><Search /></el-icon>
            <span>搜索</span>
          </button>
          <button class="reset-button" type="button" :disabled="loading || !hasFilters" @click="resetFilters">
            重置
          </button>
        </form>

        <div class="active-filter-row">
          <div class="difficulty-quick-filter" aria-label="快速筛选难度">
            <button
              v-for="option in quickFilters"
              :key="option.value"
              type="button"
              :class="{ 'is-active': appliedDifficulty === option.value }"
              :aria-pressed="appliedDifficulty === option.value"
              @click="applyDifficulty(option.value)"
            >
              <span v-if="option.tone" class="filter-dot" :class="`is-${option.tone}`"></span>
              {{ option.label }}
            </button>
          </div>
          <span v-if="appliedKeyword" class="keyword-result">包含“{{ appliedKeyword }}”的结果</span>
        </div>

        <section class="list-region" :aria-busy="loading">
          <div v-if="loading" class="loading-list" aria-label="正在加载题目">
            <div v-for="index in 8" :key="index" class="skeleton-row">
              <el-skeleton animated>
                <template #template>
                  <div class="skeleton-content">
                    <el-skeleton-item variant="circle" class="skeleton-index" />
                    <el-skeleton-item variant="text" class="skeleton-title" />
                    <el-skeleton-item variant="button" class="skeleton-tag" />
                  </div>
                </template>
              </el-skeleton>
            </div>
          </div>

          <div v-else-if="errorMessage" class="state-card error-state" role="alert">
            <span class="state-icon" aria-hidden="true">!</span>
            <h2>题目加载失败</h2>
            <p>{{ errorMessage }}</p>
            <button type="button" @click="loadQuestions">
              <el-icon aria-hidden="true"><RefreshRight /></el-icon>
              重新加载
            </button>
          </div>

          <div v-else-if="!questions.length" class="state-card empty-state">
            <el-icon class="empty-icon" aria-hidden="true"><Document /></el-icon>
            <h2>{{ hasFilters ? '没有找到匹配的题目' : '题库正在更新' }}</h2>
            <p>{{ hasFilters ? '试试缩短关键字或切换难度' : '新题目准备好后会出现在这里' }}</p>
            <button v-if="hasFilters" type="button" @click="resetFilters">清除筛选</button>
          </div>

          <div v-else>
            <div class="table-wrap">
              <table class="question-table">
                <thead>
                  <tr>
                    <th class="index-column" scope="col">序号</th>
                    <th scope="col">题目</th>
                    <th class="difficulty-column" scope="col">难度</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(question, index) in questions" :key="question.questionId || index">
                    <td class="index-cell">{{ rowNumber(index) }}</td>
                    <td>
                      <div class="question-title-cell">
                        <span class="title-mark" aria-hidden="true">{{ getTitleInitial(question.title) }}</span>
                        <div>
                          <p class="question-title">{{ question.title }}</p>
                          <p v-if="question.questionId" class="question-id">ID {{ question.questionId }}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="difficulty-badge" :class="`is-${difficultyMeta(question).tone}`">
                        <span class="badge-dot" aria-hidden="true"></span>
                        {{ difficultyMeta(question).label }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ul class="mobile-question-list" aria-label="题目列表">
              <li v-for="(question, index) in questions" :key="`mobile-${question.questionId || index}`">
                <span class="mobile-index">{{ rowNumber(index) }}</span>
                <div class="mobile-question-copy">
                  <p>{{ question.title }}</p>
                  <span v-if="question.questionId">ID {{ question.questionId }}</span>
                </div>
                <span class="difficulty-badge" :class="`is-${difficultyMeta(question).tone}`">
                  {{ difficultyMeta(question).label }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <footer v-if="!loading && !errorMessage && total > 0" class="pagination-footer">
          <div class="page-size-control">
            <span>每页显示</span>
            <el-select v-model="pageSize" aria-label="每页显示条数" @change="changePageSize">
              <el-option v-for="size in pageSizes" :key="size" :label="`${size} 条`" :value="size" />
            </el-select>
          </div>
          <el-pagination
            class="question-pagination"
            background
            layout="prev, pager, next"
            :current-page="pageNum"
            :page-size="pageSize"
            :pager-count="5"
            :total="total"
            @current-change="changePage"
          />
        </footer>
      </section>

      <aside class="question-sidebar" aria-label="题库辅助信息">
        <section class="calendar-card" aria-labelledby="calendar-title">
          <header class="calendar-heading">
            <div>
              <p class="sidebar-eyebrow">STUDY CALENDAR</p>
              <h2 id="calendar-title">{{ calendarMonthLabel }}</h2>
            </div>
            <div class="calendar-actions" aria-label="切换月份">
              <button type="button" aria-label="上个月" @click="moveCalendarMonth(-1)">‹</button>
              <button class="today-button" type="button" @click="goToCurrentMonth">今天</button>
              <button type="button" aria-label="下个月" @click="moveCalendarMonth(1)">›</button>
            </div>
          </header>

          <div class="calendar-weekdays" aria-hidden="true">
            <span v-for="weekday in calendarWeekdays" :key="weekday">{{ weekday }}</span>
          </div>
          <div class="calendar-grid" role="grid" :aria-label="calendarMonthLabel">
            <span
              v-for="day in calendarDays"
              :key="day.key"
              class="calendar-day"
              :class="{
                'is-outside': !day.isCurrentMonth,
                'is-today': day.isToday,
              }"
              role="gridcell"
              :aria-current="day.isToday ? 'date' : undefined"
              :aria-label="day.label"
            >
              {{ day.dayOfMonth }}
            </span>
          </div>
          <div class="calendar-footnote">
            <span class="today-legend" aria-hidden="true"></span>
            今天也要保持练习
          </div>
        </section>

        <section class="hot-ranking-card" aria-labelledby="hot-ranking-title">
          <header class="ranking-heading">
            <div class="ranking-title-wrap">
              <span class="ranking-icon" aria-hidden="true">↗</span>
              <div>
                <p class="sidebar-eyebrow">TRENDING NOW</p>
                <h2 id="hot-ranking-title">题目热点排行</h2>
              </div>
            </div>
            <span class="coming-tag">即将上线</span>
          </header>

          <div class="ranking-placeholder">
            <div v-for="rank in 3" :key="rank" class="ranking-preview" aria-hidden="true">
              <span>{{ rank }}</span>
              <div>
                <i></i>
                <i></i>
              </div>
            </div>
            <p>热点接口接入后，将在这里展示近期热门题目</p>
          </div>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CircleClose, Document, RefreshRight, Search } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { getQuestionList } from '@/apis/question'
import {
  QUESTION_PAGE_SIZES,
  getDifficultyMeta,
  normalizeQuestionParams,
} from '@/utils/questionList'

const route = useRoute()
const router = useRouter()
const pageSizes = QUESTION_PAGE_SIZES
const quickFilters = [
  { label: '全部', value: '', tone: '' },
  { label: '简单', value: '1', tone: 'easy' },
  { label: '中等', value: '2', tone: 'medium' },
  { label: '困难', value: '3', tone: 'hard' },
]

const draftKeyword = ref('')
const draftDifficulty = ref('')
const appliedKeyword = ref('')
const appliedDifficulty = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const questions = ref([])
const total = ref(0)
const loading = ref(true)
const errorMessage = ref('')
const calendarCursor = ref(new Date())
const calendarWeekdays = ['日', '一', '二', '三', '四', '五', '六']

let activeController
let requestSequence = 0

const hasFilters = computed(() => Boolean(appliedKeyword.value || appliedDifficulty.value))
const calendarMonthLabel = computed(() => (
  `${calendarCursor.value.getFullYear()} 年 ${calendarCursor.value.getMonth() + 1} 月`
))
const calendarDays = computed(() => {
  const year = calendarCursor.value.getFullYear()
  const month = calendarCursor.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstDay.getDay())
  const today = new Date()

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateYear = date.getFullYear()
    const dateMonth = date.getMonth()
    const dayOfMonth = date.getDate()
    const isToday = dateYear === today.getFullYear()
      && dateMonth === today.getMonth()
      && dayOfMonth === today.getDate()

    return {
      key: `${dateYear}-${dateMonth + 1}-${dayOfMonth}`,
      dayOfMonth,
      isCurrentMonth: dateMonth === month,
      isToday,
      label: `${dateYear} 年 ${dateMonth + 1} 月 ${dayOfMonth} 日${isToday ? '，今天' : ''}`,
    }
  })
})

function moveCalendarMonth(offset) {
  const current = calendarCursor.value
  calendarCursor.value = new Date(current.getFullYear(), current.getMonth() + offset, 1)
}

function goToCurrentMonth() {
  calendarCursor.value = new Date()
}

function routeState() {
  const normalized = normalizeQuestionParams({
    keyword: route.query.keyword,
    difficult: route.query.difficult,
    pageNum: route.query.page,
    pageSize: route.query.pageSize,
  })
  return {
    keyword: normalized.keyword || '',
    difficult: normalized.difficult ? String(normalized.difficult) : '',
    pageNum: normalized.pageNum,
    pageSize: pageSizes.includes(normalized.pageSize) ? normalized.pageSize : 10,
  }
}

function syncStateFromRoute() {
  const state = routeState()
  draftKeyword.value = state.keyword
  draftDifficulty.value = state.difficult
  appliedKeyword.value = state.keyword
  appliedDifficulty.value = state.difficult
  pageNum.value = state.pageNum
  pageSize.value = state.pageSize
}

function updateRoute(overrides = {}) {
  const next = {
    keyword: appliedKeyword.value || undefined,
    difficult: appliedDifficulty.value || undefined,
    page: pageNum.value > 1 ? String(pageNum.value) : undefined,
    pageSize: pageSize.value !== 10 ? String(pageSize.value) : undefined,
    ...overrides,
  }
  return router.replace({ query: next })
}

async function loadQuestions() {
  activeController?.abort()
  activeController = new AbortController()
  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getQuestionList({
      keyword: appliedKeyword.value,
      difficult: appliedDifficulty.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    }, { signal: activeController.signal })
    if (sequence !== requestSequence) return

    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
    if (pageNum.value > lastPage) {
      await updateRoute({ page: lastPage > 1 ? String(lastPage) : undefined })
      return
    }

    questions.value = result.rows
    total.value = result.total
  } catch (error) {
    if (activeController.signal.aborted || sequence !== requestSequence) return
    questions.value = []
    total.value = 0
    errorMessage.value = error.message || '网络连接异常，请检查网络后重试'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function submitSearch() {
  appliedKeyword.value = draftKeyword.value.trim().slice(0, 100)
  appliedDifficulty.value = draftDifficulty.value
  pageNum.value = 1
  updateRoute({
    keyword: appliedKeyword.value || undefined,
    difficult: appliedDifficulty.value || undefined,
    page: undefined,
  })
}

function clearKeyword() {
  draftKeyword.value = ''
}

function applyDifficulty(value) {
  if (appliedDifficulty.value === value && draftDifficulty.value === value) return
  draftDifficulty.value = value
  appliedDifficulty.value = value
  appliedKeyword.value = draftKeyword.value.trim().slice(0, 100)
  pageNum.value = 1
  updateRoute({
    keyword: appliedKeyword.value || undefined,
    difficult: value || undefined,
    page: undefined,
  })
}

function resetFilters() {
  draftKeyword.value = ''
  draftDifficulty.value = ''
  appliedKeyword.value = ''
  appliedDifficulty.value = ''
  pageNum.value = 1
  updateRoute({ keyword: undefined, difficult: undefined, page: undefined })
}

function changePage(page) {
  pageNum.value = page
  updateRoute({ page: page > 1 ? String(page) : undefined })
  document.querySelector('.question-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function changePageSize(size) {
  pageSize.value = size
  pageNum.value = 1
  updateRoute({ page: undefined, pageSize: size === 10 ? undefined : String(size) })
}

function rowNumber(index) {
  return (pageNum.value - 1) * pageSize.value + index + 1
}

function difficultyMeta(question) {
  return getDifficultyMeta(question.difficult)
}

function getTitleInitial(title) {
  return [...String(title || '题')][0]
}

watch(
  () => route.fullPath,
  () => {
    syncStateFromRoute()
    loadQuestions()
  },
  { immediate: true },
)

onBeforeUnmount(() => activeController?.abort())
</script>

<style lang="scss" scoped>
.question-page {
  max-width: 1520px;
  margin: 0 auto;
  padding: 24px 0 48px;
}

.question-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 24px;
}

.question-panel {
  min-height: 580px;
  overflow: hidden;
  border: 1px solid #eaf0f3;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(29 72 91 / 7%);
}

.page-heading {
  display: flex;
  min-height: 132px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 34px 24px;
  background:
    radial-gradient(circle at 92% 24%, rgb(50 197 255 / 13%) 0, transparent 26%),
    linear-gradient(135deg, #fff 45%, #f5fcff 100%);
}

.heading-copy h1 {
  margin: 4px 0 6px;
  color: #17252d;
  font-size: 28px;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.heading-copy { min-width: 0; flex: 1 1 auto; }

.eyebrow {
  margin: 0;
  color: #27b6ee;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.page-description {
  margin: 0;
  color: #7a8790;
  font-size: 14px;
}

.result-summary {
  display: flex;
  min-width: 104px;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  padding: 12px 16px;
  border: 1px solid rgb(50 197 255 / 18%);
  border-radius: 12px;
  color: #82919a;
  background: rgb(255 255 255 / 78%);
  font-size: 13px;
  box-shadow: 0 8px 24px rgb(46 156 198 / 8%);
}

.summary-number {
  color: #17252d;
  font-size: 24px;
  font-weight: 700;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px auto auto;
  gap: 12px;
  padding: 20px 34px;
  border-top: 1px solid #eff3f5;
  border-bottom: 1px solid #eff3f5;
  background: #fbfcfd;
}

.search-field {
  display: flex;
  height: 42px;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  border: 1px solid #dfe7eb;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-field:focus-within {
  border-color: #62cff8;
  box-shadow: 0 0 0 3px rgb(50 197 255 / 11%);
}

.field-icon {
  flex: 0 0 auto;
  color: #a3adb3;
  font-size: 17px;
}

.search-field input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  color: #2d3940;
  outline: 0;
  font: inherit;
}

.search-field input::placeholder { color: #adb7bd; }

.clear-keyword {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: #aab4ba;
  cursor: pointer;
  font-size: 16px;
}

.clear-keyword:hover { color: #62717a; }

.difficulty-field :deep(.el-select) { width: 100%; }
.difficulty-field :deep(.el-select__wrapper) {
  min-height: 42px;
  border: 1px solid #dfe7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.difficulty-field :deep(.el-select__wrapper.is-focused) {
  border-color: #62cff8;
  box-shadow: 0 0 0 3px rgb(50 197 255 / 11%);
}

.primary-button,
.reset-button,
.state-card button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.primary-button {
  border-color: #32c5ff;
  color: #fff;
  background: #32c5ff;
  box-shadow: 0 8px 18px rgb(50 197 255 / 20%);
}
.primary-button:hover { background: #1bb9f4; transform: translateY(-1px); }
.reset-button { border-color: #dbe3e7; color: #65737c; background: #fff; }
.reset-button:hover:not(:disabled) { border-color: #aebbc2; color: #2c3941; }
.primary-button:disabled,
.reset-button:disabled { cursor: not-allowed; opacity: 0.55; transform: none; }

.active-filter-row {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 34px 10px;
}

.difficulty-quick-filter { display: flex; flex-wrap: wrap; gap: 6px; }
.difficulty-quick-filter button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: #738089;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.difficulty-quick-filter button:hover { color: #239fd0; background: #f0faff; }
.difficulty-quick-filter button.is-active { border-color: #c8edfb; color: #168fc0; background: #eaf8fd; font-weight: 600; }
.filter-dot,
.badge-dot { width: 7px; height: 7px; border-radius: 50%; }
.filter-dot.is-easy { background: #29bc88; }
.filter-dot.is-medium { background: #efa945; }
.filter-dot.is-hard { background: #ef6d6a; }
.keyword-result { max-width: 40%; overflow: hidden; color: #8d989f; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }

.list-region { min-height: 360px; padding: 0 34px; }
.table-wrap { overflow-x: auto; border: 1px solid #edf1f3; border-radius: 12px; }
.question-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.question-table th {
  height: 46px;
  padding: 0 22px;
  color: #829099;
  background: #f6fafb;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}
.question-table td {
  height: 68px;
  padding: 9px 22px;
  border-top: 1px solid #f0f3f5;
  color: #58656d;
  font-size: 14px;
}
.question-table tbody tr { transition: background 0.18s ease; }
.question-table tbody tr:hover { background: #f9fdff; }
.index-column { width: 94px; }
.difficulty-column { width: 170px; }
.index-cell { color: #98a3aa !important; font-variant-numeric: tabular-nums; }
.question-title-cell { display: flex; min-width: 0; align-items: center; gap: 13px; }
.question-title-cell > div { min-width: 0; }
.title-mark {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 10px;
  color: #28ace0;
  background: #ebf9fe;
  font-size: 14px;
  font-weight: 700;
}
.question-title { margin: 0 0 3px; overflow: hidden; color: #253139; font-size: 15px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.question-id { margin: 0; color: #a3adb3; font-size: 11px; font-variant-numeric: tabular-nums; }
.difficulty-badge {
  display: inline-flex;
  height: 26px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.difficulty-badge.is-easy { color: #17986b; background: #eaf8f3; }
.difficulty-badge.is-easy .badge-dot { background: #29bc88; }
.difficulty-badge.is-medium { color: #c47a17; background: #fff6e8; }
.difficulty-badge.is-medium .badge-dot { background: #efa945; }
.difficulty-badge.is-hard { color: #d85552; background: #fff0ef; }
.difficulty-badge.is-hard .badge-dot { background: #ef6d6a; }
.difficulty-badge.is-unknown { color: #7f8a91; background: #f0f3f5; }
.difficulty-badge.is-unknown .badge-dot { background: #9ea8ae; }

.loading-list { overflow: hidden; border: 1px solid #edf1f3; border-radius: 12px; }
.skeleton-row { padding: 15px 22px; border-bottom: 1px solid #f0f3f5; }
.skeleton-row:last-child { border-bottom: 0; }
.skeleton-content { display: flex; align-items: center; gap: 18px; }
.skeleton-index { width: 32px; height: 32px; }
.skeleton-title { width: min(420px, 52%); }
.skeleton-tag { width: 58px; height: 24px; margin-left: auto; border-radius: 12px; }

.state-card {
  display: flex;
  min-height: 330px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px dashed #dce7eb;
  border-radius: 12px;
  color: #849098;
  background: #fbfdfe;
  text-align: center;
}
.state-card h2 { margin: 15px 0 6px; color: #3a464d; font-size: 18px; }
.state-card p { max-width: 460px; margin: 0 0 20px; font-size: 14px; }
.state-card button { height: 38px; border-color: #91defb; color: #1facdf; background: #fff; }
.state-card button:hover { color: #fff; background: #32c5ff; }
.state-icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; color: #df625e; background: #fff0ef; font-size: 25px; font-weight: 700; }
.empty-icon { color: #8edbf7; font-size: 44px; }

.pagination-footer {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 34px 20px;
}
.page-size-control { display: flex; align-items: center; gap: 9px; color: #89949b; font-size: 13px; }
.page-size-control :deep(.el-select) { width: 88px; }
.page-size-control :deep(.el-select__wrapper) { min-height: 34px; box-shadow: 0 0 0 1px #e1e7ea inset; }
.question-pagination { margin-left: auto; }
:deep(.question-pagination.is-background .el-pager li.is-active) { background-color: #32c5ff; }

.mobile-question-list { display: none; margin: 0; padding: 0; list-style: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.question-sidebar {
  display: grid;
  position: sticky;
  top: 84px;
  gap: 20px;
}

.calendar-card,
.hot-ranking-card {
  overflow: hidden;
  border: 1px solid #eaf0f3;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(29 72 91 / 7%);
}

.calendar-card { padding: 24px 22px 18px; }

.calendar-heading,
.ranking-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-heading h2,
.ranking-heading h2 {
  margin: 3px 0 0;
  color: #253139;
  font-size: 18px;
  line-height: 1.35;
}

.sidebar-eyebrow {
  margin: 0;
  color: #8dcce5;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.14em;
}

.calendar-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.calendar-actions button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  color: #6f7d86;
  background: #f6f9fa;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease;
}

.calendar-actions button:hover { color: #149ed5; background: #eaf8fd; }
.calendar-actions .today-button { width: auto; padding: 0 7px; font-size: 11px; }

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays {
  margin-top: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f3f5;
}

.calendar-weekdays span {
  color: #9aa5ab;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.calendar-grid { row-gap: 4px; margin-top: 8px; }

.calendar-day {
  display: grid;
  height: 34px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #4d5a62;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.calendar-day.is-outside { color: #c8cfd3; }
.calendar-day.is-today {
  border-color: #32c5ff;
  color: #fff;
  background: #32c5ff;
  font-weight: 700;
  box-shadow: 0 5px 13px rgb(50 197 255 / 25%);
}

.calendar-footnote {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid #f0f3f5;
  color: #9aa4aa;
  font-size: 11px;
}

.today-legend { width: 7px; height: 7px; border-radius: 50%; background: #32c5ff; }

.hot-ranking-card { min-height: 258px; }
.ranking-heading { padding: 22px 20px 18px; border-bottom: 1px solid #eff3f5; }
.ranking-title-wrap { display: flex; min-width: 0; align-items: center; gap: 11px; }
.ranking-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 12px;
  color: #ff785e;
  background: #fff2ee;
  font-size: 21px;
  font-weight: 700;
}

.coming-tag {
  padding: 4px 8px;
  border-radius: 10px;
  color: #9a7770;
  background: #fff5f2;
  font-size: 10px;
  white-space: nowrap;
}

.ranking-placeholder { padding: 12px 20px 18px; }
.ranking-preview { display: flex; height: 37px; align-items: center; gap: 11px; }
.ranking-preview > span {
  width: 20px;
  color: #d4dadd;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  text-align: center;
}
.ranking-preview > div { display: grid; min-width: 0; flex: 1 1 auto; gap: 6px; }
.ranking-preview i {
  display: block;
  height: 6px;
  border-radius: 4px;
  background: linear-gradient(90deg, #edf2f4 25%, #f7f9fa 50%, #edf2f4 75%);
  background-size: 220% 100%;
  animation: ranking-shimmer 1.8s ease-in-out infinite;
}
.ranking-preview i:first-child { width: 76%; }
.ranking-preview i:last-child { width: 42%; height: 5px; }
.ranking-placeholder p { margin: 12px 0 0; color: #9ca6ac; font-size: 11px; line-height: 1.65; text-align: center; }

@keyframes ranking-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@media (max-width: 1080px) {
  .question-layout { grid-template-columns: minmax(0, 1fr); }
  .question-sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); position: static; }
}

@media (max-width: 760px) {
  .question-page { padding: 12px 0 28px; }
  .question-panel { min-height: 520px; border-radius: 12px; }
  .question-layout { gap: 16px; }
  .question-sidebar { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .calendar-card,
  .hot-ranking-card { border-radius: 12px; }
  .calendar-card { padding: 20px 18px 16px; }
  .calendar-day { height: 38px; }
  .page-heading { min-height: 118px; padding: 22px 18px; }
  .heading-copy h1 { font-size: 24px; }
  .page-description { max-width: 240px; line-height: 1.6; }
  .result-summary { min-width: 82px; padding: 10px; }
  .summary-number { font-size: 21px; }
  .filter-bar { grid-template-columns: 1fr 1fr; padding: 16px 18px; }
  .search-field { grid-column: 1 / -1; }
  .difficulty-field { grid-column: 1 / -1; }
  .primary-button,
  .reset-button { width: 100%; }
  .active-filter-row { align-items: flex-start; flex-direction: column; padding: 13px 18px; }
  .keyword-result { max-width: 100%; }
  .list-region { min-height: 300px; padding: 0 18px; }
  .table-wrap { display: none; }
  .mobile-question-list { display: block; overflow: hidden; border: 1px solid #edf1f3; border-radius: 12px; }
  .mobile-question-list li { display: flex; min-height: 72px; align-items: center; gap: 12px; padding: 12px 13px; border-bottom: 1px solid #eef2f4; }
  .mobile-question-list li:last-child { border-bottom: 0; }
  .mobile-index { width: 28px; flex: 0 0 28px; color: #98a3aa; font-size: 12px; text-align: center; }
  .mobile-question-copy { min-width: 0; flex: 1; }
  .mobile-question-copy p { margin: 0 0 5px; overflow: hidden; color: #2c373e; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .mobile-question-copy span { color: #a2adb3; font-size: 10px; }
  .pagination-footer { align-items: stretch; flex-direction: column; padding: 18px; }
  .page-size-control { justify-content: center; }
  .question-pagination { justify-content: center; margin-left: 0; }
}

@media (max-width: 440px) {
  .page-heading { align-items: flex-start; }
  .eyebrow { display: none; }
  .result-summary { flex-direction: column; align-items: center; gap: 0; }
  .difficulty-quick-filter { gap: 3px; }
  .difficulty-quick-filter button { padding: 0 10px; }
  .mobile-question-list li { gap: 8px; padding-right: 10px; padding-left: 9px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
</style>

