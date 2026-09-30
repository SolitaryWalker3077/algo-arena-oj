<template>
  <main class="exam-page" aria-labelledby="exam-page-title">
    <nav class="exam-tabs" aria-label="竞赛分类">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="exam-tab"
        :class="{ 'is-active': activeType === tab.value }"
        type="button"
        :aria-current="activeType === tab.value ? 'page' : undefined"
        @click="switchType(tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section class="contest-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">ALGORITHM CONTEST</p>
          <h1 id="exam-page-title">{{ activeType === 0 ? '推荐竞赛' : '历史竞赛' }}</h1>
        </div>
        <span class="result-count" aria-live="polite">共 {{ total }} 场</span>
      </div>

      <form class="filter-bar" @submit.prevent="applyFilter(true)">
        <label class="filter-label" for="contest-start-time">竞赛时间</label>
        <el-date-picker
          :id="['contest-start-time', 'contest-end-time']"
          v-model="dateRange"
          class="date-range-picker"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :clearable="true"
          :editable="false"
          @change="applyFilter()"
        />
        <button class="search-button" type="submit" :disabled="loading">
          <el-icon aria-hidden="true"><Search /></el-icon>
          <span>搜索</span>
        </button>
        <button class="reset-button" type="button" :disabled="loading && !dateRange" @click="resetFilter">
          重置
        </button>
      </form>

      <div v-if="staleNotice" class="cache-notice" role="status">
        <el-icon aria-hidden="true"><Warning /></el-icon>
        网络暂时不可用，当前展示上次成功加载的缓存数据。
        <button type="button" @click="loadContests(true)">重新连接</button>
      </div>

      <div v-if="loading" class="contest-grid" aria-label="正在加载竞赛">
        <div v-for="index in 6" :key="index" class="contest-card skeleton-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" class="skeleton-image" />
              <div class="skeleton-lines">
                <el-skeleton-item variant="h3" style="width: 64%" />
                <el-skeleton-item variant="text" />
                <el-skeleton-item variant="text" style="width: 85%" />
                <el-skeleton-item variant="button" style="width: 106px" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <div v-else-if="errorMessage" class="state-card error-state" role="alert">
        <span class="state-icon" aria-hidden="true">!</span>
        <h2>竞赛加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadContests(true)">重新加载</button>
      </div>

      <div v-else-if="!contests.length" class="state-card empty-state">
        <el-icon class="empty-icon" aria-hidden="true"><Calendar /></el-icon>
        <h2>{{ dateRange ? '没有符合时间范围的竞赛' : '暂无竞赛' }}</h2>
        <p>{{ dateRange ? '调整筛选时间后再试试吧' : '新的竞赛正在筹备中，敬请期待' }}</p>
        <button v-if="dateRange" type="button" @click="resetFilter">清除筛选</button>
      </div>

      <div v-else class="contest-grid">
        <article v-for="contest in contests" :key="contest.examId" class="contest-card">
          <div class="cover-wrap">
            <img src="@/assets/images/exam.png" alt="" class="contest-cover">
            <span class="phase-badge" :class="`is-${getPhase(contest)}`">
              {{ phaseLabel(contest) }}
            </span>
          </div>
          <div class="contest-content">
            <h2 :title="contest.title">{{ contest.title || '未命名竞赛' }}</h2>
            <dl class="contest-time">
              <div>
                <dt>开赛时间</dt>
                <dd>{{ formatTime(contest.startTime) }}</dd>
              </div>
              <div>
                <dt>结束时间</dt>
                <dd>{{ formatTime(contest.endTime) }}</dd>
              </div>
            </dl>
            <button
              class="join-button"
              type="button"
              :class="{ 'is-entered': contest.enter }"
              :disabled="getPhase(contest) === 'ended'"
              @click="handleContestAction(contest)"
            >
              {{ actionLabel(contest) }}
            </button>
          </div>
        </article>
      </div>

      <el-pagination
        v-if="!loading && !errorMessage && total > pageSize"
        class="contest-pagination"
        background
        layout="prev, pager, next"
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        @current-change="changePage"
      />
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Calendar, Search, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getExamList } from '@/apis/exam'

const tabs = [
  { label: '未完赛', value: 0 },
  { label: '历史竞赛', value: 1 },
]
const route = useRoute()
const router = useRouter()
const pageSize = 9
const activeType = ref(getTypeFromRoute(route.query.category))
const dateRange = ref(null)
const pageNum = ref(1)
const contests = ref([])
const total = ref(0)
const loading = ref(true)
const errorMessage = ref('')
const staleNotice = ref(false)

let activeController
let requestSequence = 0

function getTypeFromRoute(category) {
  return category === 'history' ? 1 : 0
}

function getRouteCategory(type) {
  return type === 1 ? 'history' : 'unfinished'
}

function buildParams() {
  return {
    type: activeType.value,
    pageNum: pageNum.value,
    pageSize,
    startTime: dateRange.value?.[0],
    endTime: dateRange.value?.[1],
  }
}

async function loadContests(force = false) {
  activeController?.abort()
  activeController = new AbortController()
  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''
  staleNotice.value = false

  try {
    const result = await getExamList(buildParams(), {
      force,
      signal: activeController.signal,
    })
    if (sequence !== requestSequence) return
    contests.value = result.rows
    total.value = result.total
    staleNotice.value = result.stale
  } catch (error) {
    if (activeController.signal.aborted || sequence !== requestSequence) return
    contests.value = []
    total.value = 0
    errorMessage.value = error.message || '网络连接异常，请检查网络后重试'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function switchType(type) {
  if (activeType.value === type) return
  activeType.value = type
  pageNum.value = 1
  router.replace({
    query: {
      ...route.query,
      category: getRouteCategory(type),
    },
  })
  loadContests()
}

function applyFilter(force = false) {
  pageNum.value = 1
  loadContests(force)
}

function resetFilter() {
  if (!dateRange.value) return
  dateRange.value = null
  applyFilter()
}

function changePage(page) {
  pageNum.value = page
  loadContests()
  document.querySelector('.contest-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function parseTime(value) {
  if (!value) return null
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function formatTime(value) {
  if (!value) return '时间待定'
  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute] = value
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  return String(value).replace('T', ' ').slice(0, 16)
}

function getPhase(contest) {
  const now = Date.now()
  const start = parseTime(contest.startTime)
  const end = parseTime(contest.endTime)
  if (end !== null && now >= end) return 'ended'
  if (start !== null && now >= start) return 'ongoing'
  return 'upcoming'
}

function phaseLabel(contest) {
  return { upcoming: '即将开始', ongoing: '进行中', ended: '已结束' }[getPhase(contest)]
}

function actionLabel(contest) {
  const phase = getPhase(contest)
  if (phase === 'ended') return '竞赛已结束'
  if (contest.enter) return phase === 'ongoing' ? '进入竞赛' : '已报名'
  return phase === 'ongoing' ? '进入竞赛' : '报名参赛'
}

function handleContestAction(contest) {
  if (contest.enter && getPhase(contest) === 'ongoing') {
    ElMessage.info('竞赛答题入口即将开放')
    return
  }
  if (contest.enter) {
    ElMessage.success('你已报名该竞赛')
    return
  }
  ElMessage.info('报名功能即将开放')
}

watch(
  () => route.query.category,
  (category) => {
    const routeType = getTypeFromRoute(category)
    if (routeType === activeType.value) return
    activeType.value = routeType
    pageNum.value = 1
    loadContests()
  },
)

onMounted(() => loadContests())
onBeforeUnmount(() => activeController?.abort())
</script>

<style lang="scss" scoped>
.exam-page {
  max-width: 1520px;
  margin: 0 auto;
  padding: 0 0 48px;
}

.exam-tabs {
  display: flex;
  align-items: flex-end;
  gap: 34px;
  height: 64px;
  border-bottom: 1px solid #eef2f5;
}

.exam-tab {
  position: relative;
  height: 64px;
  padding: 0 10px;
  color: #20252a;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.22s ease;
}

.exam-tab::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: #32c5ff;
  content: '';
  opacity: 0;
  transform: scaleX(0.25);
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.exam-tab:hover,
.exam-tab.is-active {
  color: #20b9f4;
}

.exam-tab.is-active::after {
  opacity: 1;
  transform: scaleX(1);
}

.contest-panel {
  min-height: 390px;
  margin-top: 14px;
  padding: 30px 30px 34px;
  border: 1px solid #eef2f5;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 35px rgb(39 74 92 / 6%);
}

.panel-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 26px;
}

.panel-heading h1 {
  margin: 3px 0 0;
  color: #1f2529;
  font-size: 22px;
  line-height: 1.4;
}

.eyebrow {
  margin: 0;
  color: #8fcfe8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.result-count {
  color: #9099a1;
  font-size: 14px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  margin-bottom: 30px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8fafb;
}

.filter-label {
  margin-right: 2px;
  color: #59636b;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.date-range-picker) {
  width: 390px;
}

:deep(.el-date-editor.el-input__wrapper) {
  height: 38px;
  border: 1px solid #e3e9ed;
  background: #fff;
  box-shadow: none;
}

:deep(.el-date-editor.el-input__wrapper:hover),
:deep(.el-date-editor.el-input__wrapper.is-focus) {
  border-color: #73d6fa;
  box-shadow: 0 0 0 3px rgb(50 197 255 / 10%);
}

.search-button,
.reset-button,
.state-card button,
.cache-notice button {
  height: 38px;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.search-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 80px;
  border: 1px solid #9edff8;
  color: #1bb6ef;
  background: #effaff;
}

.search-button:hover {
  border-color: #32c5ff;
  background: #e4f8ff;
}

.reset-button {
  min-width: 66px;
  border: 1px solid #dce2e6;
  color: #68727a;
  background: #fff;
}

.reset-button:hover {
  border-color: #aeb9c0;
  color: #313a40;
}

.search-button:disabled,
.reset-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.cache-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -12px 0 20px;
  padding: 10px 14px;
  border: 1px solid #f6d99c;
  border-radius: 7px;
  color: #96661c;
  background: #fff9eb;
  font-size: 13px;
}

.cache-notice button {
  height: auto;
  margin-left: auto;
  color: #8b5c11;
  text-decoration: underline;
}

.contest-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.contest-card {
  display: flex;
  min-width: 0;
  min-height: 216px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid #f1f4f6;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff, #fbfcfd);
  box-shadow: 0 8px 24px rgb(46 71 84 / 6%);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.contest-card:not(.skeleton-card):hover {
  border-color: #d8f2fc;
  box-shadow: 0 14px 30px rgb(50 197 255 / 12%);
  transform: translateY(-3px);
}

.cover-wrap {
  position: relative;
  flex: 0 0 126px;
  height: 180px;
}

.contest-cover {
  width: 126px;
  height: 180px;
  border-radius: 8px;
  object-fit: cover;
}

.phase-badge {
  position: absolute;
  top: 9px;
  left: 9px;
  padding: 4px 8px;
  border-radius: 10px;
  color: #fff;
  background: rgb(17 26 36 / 70%);
  backdrop-filter: blur(4px);
  font-size: 11px;
}

.phase-badge.is-ongoing { background: rgb(24 178 128 / 88%); }
.phase-badge.is-ended { background: rgb(93 105 116 / 82%); }

.contest-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 3px 0 0 20px;
}

.contest-content h2 {
  margin: 0 0 14px;
  overflow: hidden;
  color: #1d2328;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contest-time {
  margin: 0;
}

.contest-time div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.contest-time dt { color: #9aa2a8; }
.contest-time dd {
  margin: 0;
  overflow: hidden;
  color: #606a72;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.join-button {
  align-self: flex-start;
  min-width: 106px;
  height: 38px;
  margin-top: auto;
  padding: 0 17px;
  border: 1px solid #79d8fa;
  border-radius: 5px;
  color: #1ab8f1;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.join-button:hover:not(:disabled) {
  color: #fff;
  background: #32c5ff;
  box-shadow: 0 6px 14px rgb(50 197 255 / 25%);
}

.join-button.is-entered {
  border-color: #91dbc2;
  color: #25a97d;
}

.join-button:disabled {
  border-color: #dce2e5;
  color: #9ca5ab;
  background: #f6f8f9;
  cursor: not-allowed;
}

.skeleton-card :deep(.el-skeleton__template) { display: flex; width: 100%; }
.skeleton-image { width: 126px; height: 180px; border-radius: 8px; }
.skeleton-lines { display: flex; flex: 1; flex-direction: column; gap: 20px; padding: 7px 0 0 20px; }

.state-card {
  display: flex;
  min-height: 275px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px dashed #dfe8ec;
  border-radius: 12px;
  color: #879199;
  background: #fbfcfd;
  text-align: center;
}

.state-card h2 { margin: 14px 0 5px; color: #3d474e; font-size: 18px; }
.state-card p { margin: 0 0 18px; font-size: 14px; }
.state-card button { padding: 0 18px; border: 1px solid #85dbfa; color: #1eb7ef; background: #fff; }
.state-card button:hover { color: #fff; background: #32c5ff; }
.empty-icon { color: #94dcf7; font-size: 42px; }
.state-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: #e97870;
  background: #fff0ef;
  font-size: 26px;
  font-weight: 700;
}

.contest-pagination {
  justify-content: center;
  margin-top: 34px;
}

@media (max-width: 1180px) {
  .contest-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .exam-page { padding-bottom: 24px; }
  .exam-tabs { height: 56px; gap: 20px; }
  .exam-tab { height: 56px; padding: 0 6px; font-size: 16px; }
  .contest-panel { margin-top: 10px; padding: 22px 16px 26px; border-radius: 10px; }
  .filter-bar { align-items: stretch; flex-wrap: wrap; padding: 12px; }
  .filter-label { width: 100%; }
  :deep(.date-range-picker) {
    width: 100% !important;
    min-width: 0 !important;
  }
  .search-button, .reset-button { flex: 1; }
  .contest-grid { grid-template-columns: 1fr; gap: 16px; }
}

@media (max-width: 430px) {
  .panel-heading { margin-bottom: 18px; }
  .eyebrow { display: none; }
  .panel-heading h1 { font-size: 20px; }
  .contest-card { min-height: 184px; padding: 14px; }
  .cover-wrap, .contest-cover { width: 104px; height: 150px; }
  .cover-wrap { flex-basis: 104px; }
  .contest-content { padding-left: 14px; }
  .contest-content h2 { margin-bottom: 10px; font-size: 16px; }
  .contest-time div { display: block; margin-bottom: 6px; font-size: 12px; }
  .contest-time dt { margin-bottom: 1px; }
  .join-button { min-width: 92px; height: 34px; padding: 0 10px; font-size: 13px; }
  .phase-badge { top: 6px; left: 6px; }
}
</style>
