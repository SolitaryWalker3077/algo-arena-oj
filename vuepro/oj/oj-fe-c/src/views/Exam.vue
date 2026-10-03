<template>
  <main class="exam-page" aria-labelledby="exam-page-title">
    <nav class="exam-tabs" aria-label="竞赛页面">
      <button
        v-for="tab in viewTabs"
        :key="tab.value"
        class="exam-tab"
        :class="{ 'is-active': activeView === tab.value }"
        type="button"
        :aria-current="activeView === tab.value ? 'page' : undefined"
        @click="switchView(tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section class="contest-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">ALGORITHM CONTEST</p>
          <h1 id="exam-page-title">{{ activeView === 'mine' ? '我的竞赛' : '竞赛报名' }}</h1>
        </div>
        <span class="result-count" aria-live="polite">共 {{ total }} 场</span>
      </div>

      <div v-if="activeView === 'registration'" class="status-filter" aria-label="竞赛状态筛选">
        <button
          v-for="filter in statusFilters"
          :key="filter.value"
          type="button"
          :class="{ 'is-active': activeStatus === filter.value }"
          @click="switchStatus(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>

      <form class="filter-bar" @submit.prevent="applyFilter(true)">
        <label class="filter-label">竞赛时间</label>
        <el-date-picker
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
        <button class="reset-button" type="button" :disabled="loading || !dateRange" @click="resetFilter">
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

      <div v-else-if="requiresLogin" class="state-card login-state">
        <span class="state-icon login-icon" aria-hidden="true">↗</span>
        <h2>登录后查看我的竞赛</h2>
        <p>已报名的竞赛会集中展示在这里</p>
        <button type="button" @click="goLogin">立即登录</button>
      </div>

      <div v-else-if="errorMessage" class="state-card error-state" role="alert">
        <span class="state-icon" aria-hidden="true">!</span>
        <h2>竞赛加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadContests(true)">重新加载</button>
      </div>

      <div v-else-if="!contests.length" class="state-card empty-state">
        <el-icon class="empty-icon" aria-hidden="true"><Calendar /></el-icon>
        <h2>{{ emptyTitle }}</h2>
        <p>{{ emptyDescription }}</p>
        <button v-if="dateRange" type="button" @click="resetFilter">清除筛选</button>
      </div>

      <div v-else class="contest-grid">
        <ContestCard
          v-for="contest in contests"
          :key="contest.examId"
          :contest="contest"
          :now="now"
          :registering="registeringId === contest.examId"
          @action="handleContestAction"
        />
      </div>

      <el-pagination
        v-if="!loading && !requiresLogin && !errorMessage && total > pageSize"
        class="contest-pagination"
        background
        layout="prev, pager, next"
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        @current-change="changePage"
      />
    </section>

    <el-dialog
      v-model="registrationDialogVisible"
      class="registration-dialog"
      width="min(440px, calc(100vw - 32px))"
      :close-on-click-modal="!registeringId"
      :close-on-press-escape="!registeringId"
      :show-close="!registeringId"
      title="确认报名"
    >
      <div v-if="registrationTarget" class="dialog-content">
        <div class="dialog-mark" aria-hidden="true">✓</div>
        <div>
          <p class="dialog-title">{{ registrationTarget.title || '未命名竞赛' }}</p>
          <p>开赛时间：{{ formatContestTime(registrationTarget.startTime) }}</p>
          <p class="dialog-tip">报名成功后可在“我的竞赛”中查看。</p>
        </div>
      </div>
      <template #footer>
        <button class="dialog-cancel" type="button" :disabled="Boolean(registeringId)" @click="closeRegistrationDialog">
          取消
        </button>
        <button class="dialog-confirm" type="button" :disabled="Boolean(registeringId)" @click="confirmRegistration">
          <span v-if="registeringId" class="dialog-spinner" aria-hidden="true"></span>
          {{ registeringId ? '正在报名…' : '确认报名' }}
        </button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Calendar, Search, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import ContestCard from '@/components/contest/ContestCard.vue'
import {
  clearExamListCache,
  enterExam,
  getExamList,
  getMyExamList,
} from '@/apis/exam'
import { syncAuthentication, userState } from '@/stores/user'
import {
  CONTEST_ACTION,
  CONTEST_PHASE,
  belongsToContestList,
  formatContestTime,
  getContestPhase,
  requiresContestAuthentication,
  toContestTimestamp,
} from '@/utils/contestState'

const viewTabs = [
  { label: '竞赛报名', value: 'registration' },
  { label: '我的竞赛', value: 'mine' },
]
const statusFilters = [
  { label: '未完赛', value: 'unfinished' },
  { label: '历史竞赛', value: 'history' },
]
const destinationRoutes = {
  [CONTEST_ACTION.ANSWER]: 'contest-answer',
  [CONTEST_ACTION.PRACTICE]: 'contest-practice',
  [CONTEST_ACTION.RANKING]: 'contest-ranking',
}

const route = useRoute()
const router = useRouter()
const pageSize = 9
const activeView = ref(route.query.view === 'mine' ? 'mine' : 'registration')
const activeStatus = ref(route.query.status === 'history' ? 'history' : 'unfinished')
const dateRange = ref(null)
const pageNum = ref(1)
const contests = ref([])
const total = ref(0)
const loading = ref(true)
const errorMessage = ref('')
const staleNotice = ref(false)
const now = ref(Date.now())
const registrationDialogVisible = ref(false)
const registrationTarget = ref(null)
const registeringId = ref('')

let activeController
let requestSequence = 0
let clockTimer
const recentlyEndedContests = new Map()

const requiresLogin = computed(() => activeView.value === 'mine' && !userState.isAuthenticated)
const emptyTitle = computed(() => {
  if (dateRange.value) return '没有符合时间范围的竞赛'
  if (activeView.value === 'mine') return '还没有报名竞赛'
  return activeStatus.value === 'history' ? '暂无历史竞赛' : '暂无未完赛竞赛'
})
const emptyDescription = computed(() => (
  dateRange.value ? '调整筛选时间后再试试吧' : '新的竞赛正在筹备中，敬请期待'
))

function buildParams() {
  return {
    type: activeStatus.value === 'history' ? 1 : 0,
    pageNum: pageNum.value,
    pageSize,
    startTime: dateRange.value?.[0],
    endTime: dateRange.value?.[1],
  }
}

function partitionRegistrationRows(rows, referenceTime = Date.now()) {
  if (activeView.value !== 'registration') return rows

  if (activeStatus.value === 'unfinished') {
    return rows.filter((contest) => {
      const belongs = belongsToContestList(contest, 'unfinished', referenceTime)
      if (!belongs) recentlyEndedContests.set(contest.examId, contest)
      return belongs
    })
  }

  const candidates = pageNum.value === 1 && !dateRange.value
    ? [...recentlyEndedContests.values(), ...rows]
    : rows
  return [...new Map(candidates.map((contest) => [contest.examId, contest])).values()]
    .filter((contest) => belongsToContestList(contest, 'history', referenceTime))
}

async function loadContests(force = false) {
  activeController?.abort()
  activeController = new AbortController()
  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''
  staleNotice.value = false
  syncAuthentication()

  if (requiresLogin.value) {
    contests.value = []
    total.value = 0
    loading.value = false
    return
  }

  try {
    const result = activeView.value === 'mine'
      ? await getMyExamList(buildParams(), { signal: activeController.signal })
      : await getExamList(buildParams(), { force, signal: activeController.signal })
    if (sequence !== requestSequence) return
    const partitionedRows = partitionRegistrationRows(result.rows)
    const removedCount = Math.max(0, result.rows.length - partitionedRows.length)
    const addedCount = Math.max(0, partitionedRows.length - result.rows.length)
    contests.value = partitionedRows
    total.value = Math.max(0, result.total - removedCount + addedCount)
    staleNotice.value = Boolean(result.stale)
  } catch (error) {
    if (activeController.signal.aborted || sequence !== requestSequence) return
    contests.value = []
    total.value = 0
    errorMessage.value = error.message || '网络连接异常，请检查网络后重试'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function updateRouteQuery() {
  return router.replace({
    query: {
      ...route.query,
      view: activeView.value,
      status: activeView.value === 'registration' ? activeStatus.value : undefined,
    },
  })
}

async function switchView(view) {
  if (activeView.value === view) return
  activeView.value = view
  pageNum.value = 1
  await updateRouteQuery()
  loadContests()
}

async function switchStatus(status) {
  if (activeStatus.value === status) return
  activeStatus.value = status
  pageNum.value = 1
  await updateRouteQuery()
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

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function requestRegistration(contest) {
  syncAuthentication()
  if (!userState.isAuthenticated) {
    ElMessage.warning('请先登录后再报名竞赛')
    goLogin()
    return
  }
  if (getContestPhase(contest, Date.now()) !== CONTEST_PHASE.UPCOMING) {
    ElMessage.warning('竞赛已经开始，当前无法报名')
    loadContests(true)
    return
  }
  registrationTarget.value = contest
  registrationDialogVisible.value = true
}

function closeRegistrationDialog() {
  if (registeringId.value) return
  registrationDialogVisible.value = false
  registrationTarget.value = null
}

async function confirmRegistration() {
  const target = registrationTarget.value
  if (!target || registeringId.value) return
  if (getContestPhase(target, Date.now()) !== CONTEST_PHASE.UPCOMING) {
    closeRegistrationDialog()
    ElMessage.warning('竞赛刚刚开始，报名已截止')
    loadContests(true)
    return
  }

  registeringId.value = target.examId
  try {
    await enterExam(target.examId)
    const localContest = contests.value.find((item) => item.examId === target.examId)
    if (localContest) localContest.enter = true
    registrationDialogVisible.value = false
    registrationTarget.value = null
    ElMessage.success('报名成功，可在“我的竞赛”中查看')
  } catch (error) {
    ElMessage.error(error.message || '报名失败，请稍后重试')
  } finally {
    registeringId.value = ''
  }
}

function navigateToContest(action, contest) {
  syncAuthentication()
  if (requiresContestAuthentication(action) && !userState.isAuthenticated) {
    const actionName = {
      [CONTEST_ACTION.ANSWER]: '开始答题',
      [CONTEST_ACTION.PRACTICE]: '进行竞赛练习',
      [CONTEST_ACTION.RANKING]: '查看排名',
    }[action]
    ElMessage.warning(`请先登录后再${actionName}`)
    goLogin()
    return
  }

  const phase = getContestPhase(contest, Date.now())
  if (action === CONTEST_ACTION.ANSWER && (phase !== CONTEST_PHASE.ONGOING || !contest.enter)) {
    ElMessage.warning('当前不满足开始答题条件，请刷新后重试')
    loadContests(true)
    return
  }
  if ([CONTEST_ACTION.PRACTICE, CONTEST_ACTION.RANKING].includes(action) && phase !== CONTEST_PHASE.ENDED) {
    ElMessage.warning('竞赛结束后才可使用此功能')
    return
  }
  router.push({
    name: destinationRoutes[action],
    params: { examId: contest.examId },
    query: {
      title: contest.title || undefined,
      endTime: toContestTimestamp(contest.endTime) ?? undefined,
    },
  })
}

function handleContestAction(action, contest) {
  if (action === CONTEST_ACTION.REGISTER) requestRegistration(contest)
  else navigateToContest(action, contest)
}

function refreshTimePartition() {
  const referenceTime = Date.now()
  now.value = referenceTime
  if (activeView.value !== 'registration' || activeStatus.value !== 'unfinished') return

  const activeRows = contests.value.filter((contest) => {
    const belongs = belongsToContestList(contest, 'unfinished', referenceTime)
    if (!belongs) recentlyEndedContests.set(contest.examId, contest)
    return belongs
  })
  const removedCount = contests.value.length - activeRows.length
  if (removedCount <= 0) return

  contests.value = activeRows
  total.value = Math.max(0, total.value - removedCount)
  clearExamListCache()
  loadContests(true)
}

watch(
  () => [route.query.view, route.query.status],
  ([view, status]) => {
    const nextView = view === 'mine' ? 'mine' : 'registration'
    const nextStatus = status === 'history' ? 'history' : 'unfinished'
    if (nextView === activeView.value && (nextView === 'mine' || nextStatus === activeStatus.value)) return
    activeView.value = nextView
    activeStatus.value = nextStatus
    pageNum.value = 1
    loadContests()
  },
)

onMounted(() => {
  syncAuthentication()
  loadContests()
  clockTimer = window.setInterval(refreshTimePartition, 30_000)
})
onBeforeUnmount(() => {
  activeController?.abort()
  window.clearInterval(clockTimer)
  clearExamListCache()
})
</script>

<style lang="scss" scoped>
.exam-page { max-width: 1520px; margin: 0 auto; padding: 0 0 48px; }
.exam-tabs { display: flex; height: 64px; align-items: flex-end; gap: 34px; border-bottom: 1px solid #eef2f5; }
.exam-tab { position: relative; height: 64px; padding: 0 10px; color: #20252a; font-size: 18px; font-weight: 600; cursor: pointer; transition: color 0.22s ease; }
.exam-tab::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 3px; border-radius: 3px 3px 0 0; background: #32c5ff; content: ''; opacity: 0; transform: scaleX(0.25); transition: opacity 0.22s ease, transform 0.22s ease; }
.exam-tab:hover, .exam-tab.is-active { color: #20b9f4; }
.exam-tab.is-active::after { opacity: 1; transform: scaleX(1); }
.contest-panel { min-height: 390px; margin-top: 14px; padding: 30px 30px 34px; border: 1px solid #eef2f5; border-radius: 14px; background: #fff; box-shadow: 0 10px 35px rgb(39 74 92 / 6%); }
.panel-heading { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.panel-heading h1 { margin: 3px 0 0; color: #1f2529; font-size: 22px; line-height: 1.4; }
.eyebrow { margin: 0; color: #8fcfe8; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; }
.result-count { color: #9099a1; font-size: 14px; }
.status-filter { display: flex; gap: 4px; margin-bottom: 16px; }
.status-filter button { height: 32px; padding: 0 14px; border-radius: 16px; color: #7b858c; font-size: 13px; cursor: pointer; transition: color 0.2s ease, background 0.2s ease; }
.status-filter button:hover, .status-filter button.is-active { color: #159fda; background: #eaf8fd; }
.filter-bar { display: flex; min-height: 60px; align-items: center; gap: 12px; margin-bottom: 30px; padding: 12px 16px; border-radius: 10px; background: #f8fafb; }
.filter-label { margin-right: 2px; color: #59636b; font-size: 14px; font-weight: 600; white-space: nowrap; }
:deep(.date-range-picker) { width: 390px; }
:deep(.el-date-editor.el-input__wrapper) { height: 38px; border: 1px solid #e3e9ed; background: #fff; box-shadow: none; }
:deep(.el-date-editor.el-input__wrapper:hover), :deep(.el-date-editor.el-input__wrapper.is-focus) { border-color: #73d6fa; box-shadow: 0 0 0 3px rgb(50 197 255 / 10%); }
.search-button, .reset-button, .state-card button, .cache-notice button { height: 38px; border-radius: 5px; font-size: 14px; cursor: pointer; transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease; }
.search-button { display: inline-flex; min-width: 80px; align-items: center; justify-content: center; gap: 5px; border: 1px solid #9edff8; color: #1bb6ef; background: #effaff; }
.search-button:hover { border-color: #32c5ff; background: #e4f8ff; }
.reset-button { min-width: 66px; border: 1px solid #dce2e6; color: #68727a; background: #fff; }
.reset-button:hover { border-color: #aeb9c0; color: #313a40; }
.search-button:disabled, .reset-button:disabled { cursor: not-allowed; opacity: 0.58; }
.cache-notice { display: flex; align-items: center; gap: 8px; margin: -12px 0 20px; padding: 10px 14px; border: 1px solid #f6d99c; border-radius: 7px; color: #96661c; background: #fff9eb; font-size: 13px; }
.cache-notice button { height: auto; margin-left: auto; color: #8b5c11; text-decoration: underline; }
.contest-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.contest-card { display: flex; min-width: 0; min-height: 216px; padding: 20px; overflow: hidden; border: 1px solid #f1f4f6; border-radius: 12px; background: #fff; }
.skeleton-card :deep(.el-skeleton__template) { display: flex; width: 100%; }
.skeleton-image { width: 126px; height: 180px; border-radius: 8px; }
.skeleton-lines { display: flex; flex: 1; flex-direction: column; gap: 20px; padding: 7px 0 0 20px; }
.state-card { display: flex; min-height: 275px; align-items: center; justify-content: center; flex-direction: column; border: 1px dashed #dfe8ec; border-radius: 12px; color: #879199; background: #fbfcfd; text-align: center; }
.state-card h2 { margin: 14px 0 5px; color: #3d474e; font-size: 18px; }
.state-card p { margin: 0 0 18px; font-size: 14px; }
.state-card button { padding: 0 18px; border: 1px solid #85dbfa; color: #1eb7ef; background: #fff; }
.state-card button:hover { color: #fff; background: #32c5ff; }
.empty-icon { color: #94dcf7; font-size: 42px; }
.state-icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; color: #e97870; background: #fff0ef; font-size: 26px; font-weight: 700; }
.login-icon { color: #22b9ef; background: #eaf8fd; }
.contest-pagination { justify-content: center; margin-top: 34px; }
.dialog-content { display: flex; align-items: flex-start; gap: 14px; padding: 4px 0 8px; }
.dialog-mark { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 50%; color: #16a979; background: #eaf9f4; font-size: 22px; font-weight: 700; }
.dialog-content p { margin: 5px 0; color: #7a858d; font-size: 13px; }
.dialog-content .dialog-title { margin-top: 0; color: #252b2f; font-size: 16px; font-weight: 650; }
.dialog-content .dialog-tip { margin-top: 10px; color: #a0a8ad; }
.dialog-cancel, .dialog-confirm { min-width: 84px; height: 36px; border-radius: 5px; font-size: 14px; cursor: pointer; }
.dialog-cancel { border: 1px solid #dce3e7; color: #657079; background: #fff; }
.dialog-confirm { display: inline-flex; align-items: center; justify-content: center; gap: 7px; margin-left: 8px; border: 1px solid #32c5ff; color: #fff; background: #32c5ff; }
.dialog-cancel:disabled, .dialog-confirm:disabled { cursor: wait; opacity: 0.65; }
.dialog-spinner { width: 13px; height: 13px; border: 2px solid rgb(255 255 255 / 40%); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1180px) { .contest-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .exam-page { padding-bottom: 24px; }
  .exam-tabs { height: 56px; gap: 20px; }
  .exam-tab { height: 56px; padding: 0 6px; font-size: 16px; }
  .contest-panel { margin-top: 10px; padding: 22px 16px 26px; border-radius: 10px; }
  .filter-bar { align-items: stretch; flex-wrap: wrap; padding: 12px; }
  .filter-label { width: 100%; }
  :deep(.date-range-picker) { width: 100% !important; min-width: 0 !important; }
  .search-button, .reset-button { flex: 1; }
  .contest-grid { grid-template-columns: 1fr; gap: 16px; }
}
@media (max-width: 430px) {
  .panel-heading { margin-bottom: 14px; }
  .eyebrow { display: none; }
  .panel-heading h1 { font-size: 20px; }
  .status-filter { margin-bottom: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
</style>
