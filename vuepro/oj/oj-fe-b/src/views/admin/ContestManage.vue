<template>
  <div class="contest-manage">
    <div class="search-bar">
      <div class="search-fields">
        <el-input
          v-model="filters.title"
          clearable
          placeholder="搜索竞赛标题"
          aria-label="按竞赛标题搜索"
          class="search-item"
          @input="scheduleSearch"
          @keyup.enter="commitSearch"
        />
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          class="date-filter"
          aria-label="按竞赛时间范围筛选"
          @change="commitSearch"
        />
        <el-select
          v-model="filters.status"
          clearable
          placeholder="发布状态"
          aria-label="按发布状态筛选"
          class="search-item narrow"
          @change="commitSearch"
        >
          <el-option label="未发布" :value="0" /><el-option label="已发布" :value="1" />
        </el-select>
        <el-input
          v-model="filters.createName"
          clearable
          placeholder="筛选创建人"
          aria-label="按创建人筛选"
          class="search-item narrow"
          @input="scheduleSearch"
          @keyup.enter="commitSearch"
        />
      </div>
      <div class="search-actions">
        <el-button type="primary" :icon="Search" @click="commitSearch">查询</el-button
        ><el-button @click="resetSearch">重置</el-button>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="result-count">共 {{ total }} 条</span
        ><el-tooltip content="刷新数据"
          ><el-button
            circle
            size="small"
            :icon="Refresh"
            :loading="loading"
            aria-label="刷新竞赛列表"
            @click="refreshContests"
        /></el-tooltip>
      </div>
      <el-button type="primary" :icon="Plus" @click="router.push({ name: 'contestCreate' })"
        >添加竞赛</el-button
      >
    </div>

    <div class="table-card">
      <el-alert
        v-if="loadError"
        :title="loadError.message"
        type="error"
        show-icon
        :closable="false"
        class="load-alert"
      >
        <template #default>
          <p v-if="timeoutStreak >= 3">
            已连续三次超时。请检查网络或服务状态，稍后重试；仍失败时提供错误码联系技术支持。
          </p>
          <div class="error-actions">
            <el-button
              size="small"
              type="primary"
              plain
              :icon="Refresh"
              :loading="loading"
              @click="refreshContests"
              >重试</el-button
            ><el-button
              v-if="loadError.severe || timeoutStreak >= 3"
              size="small"
              @click="supportVisible = true"
              >联系技术支持</el-button
            >
          </div>
        </template>
      </el-alert>
      <el-table
        class="manage-table"
        :class="{ 'is-mobile': viewportWidth < 768 }"
        :data="contests"
        :default-sort="{ prop: sortField, order: sortOrder === 'asc' ? 'ascending' : 'descending' }"
        v-loading="loading"
        element-loading-text="竞赛数据加载中…"
        element-loading-background="var(--app-loading-mask)"
        max-height="640"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column
          prop="title"
          label="竞赛标题"
          sortable="custom"
          :min-width="
            viewportWidth >= 1600 ? 210 : viewportWidth >= 768 && viewportWidth < 1200 ? 220 : 135
          "
        >
          <template #default="{ row }"
            ><el-tooltip v-if="Array.from(row.title).length > 30" :content="row.title"
              ><span class="title-cell">{{ shortenTitle(row.title) }}</span></el-tooltip
            ><span v-else class="title-cell">{{ row.title || '—' }}</span
            ><small v-if="viewportWidth >= 768 && viewportWidth < 1200" class="tablet-dates"
              >{{ formatContestTime(row.startTime) }} 至 {{ formatContestTime(row.endTime) }} ·
              {{ row.status === 1 ? '已发布' : row.status === 0 ? '未发布' : '状态未知' }}</small
            ></template
          >
        </el-table-column>
        <el-table-column
          v-if="viewportWidth < 768 || viewportWidth >= 1200"
          prop="startTime"
          label="竞赛开始日期"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 160 : 110"
          align="center"
          ><template #default="{ row }">{{
            formatContestTime(row.startTime)
          }}</template></el-table-column
        >
        <el-table-column
          v-if="viewportWidth < 768 || viewportWidth >= 1200"
          prop="endTime"
          label="竞赛结束日期"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 170 : 110"
          align="center"
          ><template #default="{ row }"
            ><el-tooltip v-if="invalidEndTime(row)" content="结束日期早于开始日期，请检查竞赛数据"
              ><span class="invalid-time"
                ><el-icon><WarningFilled /></el-icon>{{ formatContestTime(row.endTime) }}</span
              ></el-tooltip
            ><span v-else>{{ formatContestTime(row.endTime) }}</span></template
          ></el-table-column
        >
        <el-table-column
          prop="phase"
          label="竞赛状态"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 108 : 70"
          align="center"
          ><template #default="{ row }"
            ><el-tag
              :class="{ 'terminal-status-tag': isTerminalPhase(row) }"
              :type="phaseTagType(row)"
              :effect="isTerminalPhase(row) ? 'dark' : 'light'"
              size="small"
              round
              >{{ phaseLabel(row) }}</el-tag
            ></template
          ></el-table-column
        >
        <el-table-column
          v-if="viewportWidth < 768 || viewportWidth >= 1200"
          prop="status"
          label="是否发布"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 108 : 70"
          align="center"
          ><template #default="{ row }"
            ><el-tag
              :type="row.status === 1 ? 'success' : row.status === 0 ? 'warning' : 'info'"
              size="small"
              round
              >{{ row.status === 1 ? '已发布' : row.status === 0 ? '未发布' : '未知' }}</el-tag
            ></template
          ></el-table-column
        >
        <el-table-column
          v-if="viewportWidth >= 1200 || viewportWidth < 768"
          prop="createName"
          label="创建人"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 125 : 65"
          show-overflow-tooltip
          ><template #default="{ row }">{{ row.createName || '—' }}</template></el-table-column
        >
        <el-table-column
          v-if="viewportWidth >= 1200 || viewportWidth < 768"
          prop="createTime"
          label="创建时间"
          sortable="custom"
          :width="viewportWidth >= 1600 ? 180 : 125"
          align="center"
          ><template #default="{ row }">{{
            formatContestTime(row.createTime, true)
          }}</template></el-table-column
        >
        <el-table-column
          label="操作"
          :width="viewportWidth >= 1600 ? 330 : 285"
          :fixed="viewportWidth < 768 ? 'right' : false"
          align="center"
        >
          <template #default="{ row }"
            ><div class="row-actions">
              <template v-if="!isTerminalPhase(row)">
                <el-tooltip :disabled="Boolean(row.id)" content="竞赛列表接口未返回竞赛 ID">
                  <span
                    ><el-button
                      size="small"
                      link
                      type="primary"
                      :icon="Edit"
                      :disabled="!row.id"
                      @click="router.push({ name: 'contestEdit', params: { examId: row.id } })"
                      >编辑</el-button
                    ></span
                  ></el-tooltip
                ><el-tooltip :disabled="Boolean(row.id)" content="竞赛列表接口未返回竞赛 ID"
                  ><span
                    ><el-button
                      size="small"
                      link
                      type="danger"
                      :icon="Delete"
                      :loading="deletingIds.has(row.id)"
                      :disabled="!row.id || deletingIds.has(row.id) || publishingIds.has(row.id)"
                      :aria-label="`删除竞赛 ${row.title}`"
                      @click="requestContestDelete(row)"
                      >删除</el-button
                    ></span
                  ></el-tooltip
                ><el-tooltip
                  v-if="canManagePublication"
                  :disabled="Boolean(row.id)"
                  content="竞赛列表接口未返回竞赛 ID"
                >
                  <span>
                    <el-button
                      size="small"
                      link
                      :type="row.status === 1 ? 'warning' : 'success'"
                      :icon="row.status === 1 ? RefreshLeft : Promotion"
                      :loading="publishingIds.has(row.id)"
                      :disabled="!row.id || publishingIds.has(row.id) || deletingIds.has(row.id)"
                      :aria-label="`${row.status === 1 ? '撤销发布' : '发布'}竞赛 ${row.title}`"
                      @click="togglePublication(row)"
                    >
                      {{ row.status === 1 ? '撤销发布' : '发布' }}
                    </el-button>
                  </span>
                </el-tooltip>
              </template>
              <template v-else>
                <span class="phase-badge" :class="phaseOf(row)">{{ phaseLabel(row) }}</span>
              </template>
            </div></template
          >
        </el-table-column>
        <template #empty
          ><div class="app-table-empty">
            <div class="app-table-empty__icon">
              <el-icon :size="36"><Trophy /></el-icon>
            </div>
            <p class="app-table-empty__title">
              {{ loadError ? '竞赛数据加载失败' : '暂无竞赛数据' }}
            </p>
            <p class="app-table-empty__desc">
              {{ loadError ? '请检查错误信息并重试' : '当前筛选条件下没有竞赛' }}
            </p>
            <el-button
              v-if="loadError"
              type="primary"
              plain
              :icon="Refresh"
              @click="refreshContests"
              >重试</el-button
            >
          </div></template
        >
      </el-table>
      <div class="pagination-box">
        <PageSizeSelector
          v-model="pagination.size"
          :disabled="loading"
          @change="handleSizeChange"
        /><el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="total"
          layout="prev, pager, next, jumper"
          background
          size="small"
          :disabled="loading"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="deleteDialogVisible"
      title="删除竞赛"
      width="min(480px, 92vw)"
      class="contest-delete-dialog"
      :close-on-click-modal="!confirmingDelete"
      :close-on-press-escape="!confirmingDelete"
      :show-close="!confirmingDelete"
      @closed="resetDeleteDialog"
    >
      <p class="delete-warning">确定要删除此竞赛吗？此操作不可撤销</p>
      <p class="delete-target">目标竞赛：{{ pendingDelete?.title }}</p>
      <template #footer>
        <el-button :disabled="confirmingDelete" @click="deleteDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="confirmingDelete"
          :disabled="confirmingDelete"
          @click="confirmContestDelete"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="supportVisible" title="联系技术支持" width="min(420px, 90vw)"
      ><p>请将以下错误信息、发生时间及页面地址提供给系统管理员：</p>
      <p class="support-detail">
        {{ loadError?.message }}<br />{{ new Date().toLocaleString() }}<br />{{ route.fullPath }}
      </p>
      <template #footer
        ><el-button type="primary" @click="supportVisible = false">知道了</el-button></template
      ></el-dialog
    >
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Delete,
  Edit,
  Plus,
  Promotion,
  Refresh,
  RefreshLeft,
  Search,
  Trophy,
  WarningFilled,
} from '@element-plus/icons-vue'
import PageSizeSelector from '@/components/PageSizeSelector.vue'
import {
  cancelPublishContest,
  clearContestResultsCache,
  deleteContest,
  getContestResults,
  publishContest,
} from '@/api/contest'
import {
  formatContestTime,
  getContestPhase,
  hasStarted,
  invalidEndTime,
  parseContestTimestamp,
  shortenTitle,
} from '@/api/contestPolicy'
import { normalizePageSize } from '@/utils/pagination'
import { getToken } from '@/utils/auth'

const route = useRoute()
const router = useRouter()
const filters = reactive({ title: '', status: '', createName: '' })
const dateRange = ref([])
const pagination = reactive({ current: 1, size: 10 })
const lastSuccessfulPagination = reactive({ current: 1, size: 10 })
const sortField = ref('createTime')
const sortOrder = ref('desc')
const contests = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(null)
const timeoutStreak = ref(0)
const supportVisible = ref(false)
const deletingIds = reactive(new Set())
const publishingIds = reactive(new Set())
const deleteDialogVisible = ref(false)
const pendingDelete = ref(null)
const confirmingDelete = ref(false)
const viewportWidth = ref(window.innerWidth)
const now = ref(Date.now())
let searchTimer
let phaseTimer
let loadId = 0
let hasSuccessfulPage = false
let skipNextRouteLoad = false

// 当前 B 端登录态只签发给管理员，接口侧仍由网关再次校验管理员身份。
const canManagePublication = computed(() => Boolean(getToken()))

const phaseOf = (row) => getContestPhase(row, now.value)
const phaseLabel = (row) =>
  ({
    upcoming: '未开赛',
    ongoing: '已开赛',
    ended: '已结束',
    invalid: '时间异常',
    unknown: '未知',
  })[phaseOf(row)]
const phaseTagType = (row) =>
  ({ upcoming: 'info', ongoing: 'primary', ended: 'info', invalid: 'danger', unknown: 'info' })[
    phaseOf(row)
  ]
const isTerminalPhase = (row) => ['ongoing', 'ended'].includes(phaseOf(row))

/** Refresh exactly when the next visible contest starts or ends. */
const schedulePhaseRefresh = () => {
  clearTimeout(phaseTimer)
  now.value = Date.now()
  const next = contests.value
    .flatMap((row) => [row.startTime, row.endTime])
    .map(parseContestTimestamp)
    .filter((time) => time != null && time > now.value)
    .sort((a, b) => a - b)[0]
  if (next != null)
    phaseTimer = setTimeout(
      () => {
        now.value = Date.now()
        if (sortField.value === 'phase') loadContests()
        else schedulePhaseRefresh()
      },
      Math.min(Math.max(next - now.value + 1, 1), 2147483647),
    )
}

const onResize = () => {
  viewportWidth.value = window.innerWidth
}
const dateShortcuts = [
  { text: '今天', value: () => [new Date(), new Date()] },
  {
    text: '昨天',
    value: () => {
      const day = new Date()
      day.setDate(day.getDate() - 1)
      return [day, day]
    },
  },
  {
    text: '近7天',
    value: () => {
      const from = new Date()
      from.setDate(from.getDate() - 6)
      return [from, new Date()]
    },
  },
]

const readQuery = (query) => {
  filters.title = typeof query.title === 'string' ? query.title : ''
  filters.status = query.status === '0' ? 0 : query.status === '1' ? 1 : ''
  filters.createName = typeof query.createName === 'string' ? query.createName : ''
  dateRange.value =
    typeof query.startTime === 'string' && typeof query.endTime === 'string'
      ? [query.startTime.slice(0, 10), query.endTime.slice(0, 10)]
      : []
  const current = Number(query.current ?? query.pageNum)
  pagination.current = Number.isInteger(current) && current >= 1 && current <= 1000000 ? current : 1
  try {
    pagination.size = normalizePageSize(query.size ?? query.pageSize ?? 10)
  } catch {
    pagination.size = 10
  }
  sortField.value = typeof query.sortField === 'string' ? query.sortField : 'createTime'
  sortOrder.value = query.sortOrder === 'asc' ? 'asc' : 'desc'
}
const newestFirstQuery = (query) => ({
  ...query,
  current: 1,
  pageNum: undefined,
  sortField: 'createTime',
  sortOrder: 'desc',
})
const needsNewestFirst = (query) =>
  Number(query.current ?? query.pageNum ?? 1) !== 1 ||
  (query.sortField != null && query.sortField !== 'createTime') ||
  (query.sortOrder != null && query.sortOrder !== 'desc')

const currentQuery = () => ({
  current: pagination.current,
  size: pagination.size,
  title: filters.title.trim() || undefined,
  startTime: dateRange.value?.[0] ? `${dateRange.value[0]} 00:00:00` : undefined,
  endTime: dateRange.value?.[1] ? `${dateRange.value[1]} 23:59:59` : undefined,
  status: filters.status === '' ? undefined : filters.status,
  createName: filters.createName.trim() || undefined,
  sortField: sortField.value,
  sortOrder: sortOrder.value,
})
const commitQuery = () => {
  const query = currentQuery()
  try {
    localStorage.setItem('contestManageQuery', JSON.stringify(query))
  } catch {
    /* storage may be disabled */
  }
  router.replace({ name: 'contestManage', query })
}
const commitSearch = () => {
  clearTimeout(searchTimer)
  pagination.current = 1
  commitQuery()
}
const scheduleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(commitSearch, 300)
}
const resetSearch = () => {
  Object.assign(filters, { title: '', status: '', createName: '' })
  dateRange.value = []
  commitSearch()
}
const handleSizeChange = () => {
  pagination.current = 1
  commitQuery()
}
const handlePageChange = () => commitQuery()
const handleSortChange = ({ prop, order }) => {
  const nextField = prop || 'createTime'
  const nextOrder = order === 'ascending' ? 'asc' : 'desc'
  if (sortField.value === nextField && sortOrder.value === nextOrder) return
  sortField.value = nextField
  sortOrder.value = nextOrder
  pagination.current = 1
  commitQuery()
}

/** Ignore late responses after a filter or page change. */
const loadContests = async () => {
  const requestId = ++loadId
  loading.value = true
  loadError.value = null
  try {
    const page = await getContestResults(currentQuery())
    if (requestId !== loadId) return
    contests.value = page.records
    total.value = page.total
    hasSuccessfulPage = true
    Object.assign(lastSuccessfulPagination, pagination)
    timeoutStreak.value = 0
    schedulePhaseRefresh()
  } catch (error) {
    if (requestId !== loadId) return
    const timedOut =
      error?.cause?.code === 'ECONNABORTED' || /超时|timeout/i.test(error?.message || '')
    timeoutStreak.value = timedOut ? timeoutStreak.value + 1 : 0
    const code = error?.code ?? error?.cause?.response?.status ?? (timedOut ? 'TIMEOUT' : 'NETWORK')
    if (hasSuccessfulPage) {
      const pageChanged =
        pagination.current !== lastSuccessfulPagination.current ||
        pagination.size !== lastSuccessfulPagination.size
      Object.assign(pagination, lastSuccessfulPagination)
      if (pageChanged) {
        skipNextRouteLoad = true
        commitQuery()
      }
    }
    loadError.value = {
      message: `竞赛列表加载失败${hasSuccessfulPage ? '，当前仍展示上次成功获取的数据' : ''}（错误码 ${code}）：${error?.message || '网络异常，请检查网络连接或后端服务'}`,
      severe: Number(code) >= 2000 || Number(code) >= 500,
    }
    if (!hasSuccessfulPage) {
      contests.value = []
      total.value = 0
      clearTimeout(phaseTimer)
    }
  } finally {
    if (requestId === loadId) loading.value = false
  }
}
const refreshContests = () => {
  clearContestResultsCache()
  loadContests()
}

const applyPublicationStatus = (contestId, status) => {
  const row = contests.value.find((item) => item.id === contestId)
  if (!row) return
  row.status = status
  if (filters.status !== '' && Number(filters.status) !== status) {
    contests.value = contests.value.filter((item) => item.id !== contestId)
    total.value = Math.max(0, total.value - 1)
  }
}

const togglePublication = async (row) => {
  if (
    !canManagePublication.value ||
    !row?.id ||
    publishingIds.has(row.id) ||
    deletingIds.has(row.id)
  )
    return
  if (hasStarted(row, Date.now())) {
    ElMessage.warning('竞赛已经开始，无法发布或撤销发布')
    return
  }

  const isPublished = row.status === 1
  publishingIds.add(row.id)
  try {
    if (isPublished) await cancelPublishContest(row.id)
    else await publishContest(row.id)
    applyPublicationStatus(row.id, isPublished ? 0 : 1)
    clearContestResultsCache()
    ElMessage.success(isPublished ? '竞赛已撤销发布' : '竞赛发布成功')
  } catch (error) {
    // 统一请求层会展示后端的具体原因和超时提示，这里仅处理非请求异常。
    if (!error?.handled)
      ElMessage.error(
        `${isPublished ? '撤销发布' : '发布'}失败：${error?.message || '网络异常，请稍后重试'}`,
      )
  } finally {
    publishingIds.delete(row.id)
  }
}

const resetDeleteDialog = () => {
  if (!confirmingDelete.value) pendingDelete.value = null
}

const requestContestDelete = (row) => {
  if (!row?.id || deletingIds.has(row.id)) return
  pendingDelete.value = row
  deleteDialogVisible.value = true
}

const confirmContestDelete = async () => {
  const contest = pendingDelete.value
  if (!contest?.id || confirmingDelete.value || deletingIds.has(contest.id)) return
  if (hasStarted(contest, Date.now())) {
    deleteDialogVisible.value = false
    ElMessage.warning('竞赛已经开始，无法删除')
    return
  }

  confirmingDelete.value = true
  deletingIds.add(contest.id)
  try {
    await deleteContest(contest.id)
    contests.value = contests.value.filter((item) => item.id !== contest.id)
    total.value = Math.max(0, total.value - 1)
    clearContestResultsCache()
    deleteDialogVisible.value = false
    ElMessage.success('竞赛删除成功')

    // 删除当前页最后一条记录后，自动回到仍有数据的上一页。
    if (!contests.value.length && pagination.current > 1 && total.value > 0) {
      pagination.current -= 1
      commitQuery()
    }
  } catch (error) {
    // 请求拦截器会优先展示后端返回的具体原因；仅兜底未统一处理的异常。
    if (!error?.handled) ElMessage.error(`删除失败：${error?.message || '网络异常，请稍后重试'}`)
  } finally {
    deletingIds.delete(contest.id)
    confirmingDelete.value = false
  }
}

watch(
  () => route.query,
  (query) => {
    readQuery(query)
    if (skipNextRouteLoad) {
      skipNextRouteLoad = false
      return
    }
    loadContests()
  },
)
onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', schedulePhaseRefresh)
  clearContestResultsCache()
  if (!Object.keys(route.query).length) {
    try {
      const saved = JSON.parse(localStorage.getItem('contestManageQuery') || 'null')
      if (saved && typeof saved === 'object') {
        router.replace({ name: 'contestManage', query: newestFirstQuery(saved) })
        return
      }
    } catch {
      /* ignore corrupt saved filters */
    }
  }
  if (needsNewestFirst(route.query)) {
    router.replace({ name: 'contestManage', query: newestFirstQuery(route.query) })
    return
  }
  readQuery(route.query)
  loadContests()
})
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearTimeout(phaseTimer)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', schedulePhaseRefresh)
  loadId += 1
})
</script>

<style lang="scss" scoped>
.contest-manage {
  .search-bar,
  .table-card {
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-radius);
    box-shadow: var(--app-shadow);
  }
  .search-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
  }
  .search-fields {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .search-item {
    width: 190px;
  }
  .search-item.narrow {
    width: 150px;
  }
  .date-filter {
    width: 270px;
  }
  .search-actions,
  .toolbar-left,
  .row-actions,
  .error-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 4px 12px;
  }
  .api-note {
    margin: 0 4px 12px;
    color: var(--app-text-regular);
    font-size: 12px;
  }
  .result-count {
    border-radius: 12px;
    background: var(--app-hover-bg);
    color: var(--app-text-regular);
    font-size: 13px;
    padding: 4px 10px;
  }
  .table-card {
    padding: 16px;
    min-width: 0;
  }
  .load-alert {
    margin-bottom: 12px;
  }
  .error-actions {
    margin-top: 8px;
  }
  .manage-table :deep(.el-table__inner-wrapper) {
    min-height: 360px;
  }
  .manage-table :deep(th.el-table__cell) {
    color: var(--app-text-regular);
  }
  :deep(.el-button--primary:not(.is-plain)) {
    color: #0b2a3a;
  }
  .title-cell {
    overflow-wrap: anywhere;
  }
  .tablet-dates {
    display: block;
    color: var(--app-text-regular);
    line-height: 1.5;
  }
  .invalid-time {
    color: #b42318;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
  }
  .row-actions {
    justify-content: center;
    gap: 8px;
    flex-wrap: nowrap;
    white-space: nowrap;
  }
  .row-actions > span {
    display: inline-flex;
    flex: none;
  }
  .row-actions :deep(.el-button) {
    height: 32px;
    margin: 0;
    padding: 0 2px;
  }
  .row-actions :deep(.el-tag) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .terminal-status-tag {
    min-width: 72px;
    justify-content: center;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  /* 操作栏内竞赛进行状态标签（已开赛/已结束） */
  .phase-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 84px;
    height: 26px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #fff;
    white-space: nowrap;
    margin-right: 10px;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .phase-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .phase-badge.ongoing {
    background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  .phase-badge.ongoing::before {
    animation: phase-pulse 1.8s ease-in-out infinite;
  }
  .phase-badge.ended {
    background: linear-gradient(135deg, #a8a8a8 0%, #858585 100%);
    box-shadow: 0 2px 6px rgba(130, 130, 130, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  @keyframes phase-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
  }
  html.dark .phase-badge.ended {
    background: linear-gradient(135deg, #7a7a7a 0%, #5a5a5a 100%);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .pagination-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 14px;
    margin-top: 16px;
    border-top: 1px solid var(--app-border-color);
  }
  :deep(.el-button:focus-visible),
  :deep(.el-input__wrapper:focus-within),
  :deep(.el-select__wrapper:focus-visible) {
    outline: 2px solid var(--app-brand);
    outline-offset: 2px;
  }
  :deep(.el-button:active) {
    transform: translateY(1px);
  }
}
.delete-warning {
  color: var(--app-text-primary);
  font-weight: 600;
}
.delete-target,
.support-detail {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  background: var(--app-hover-bg);
  overflow-wrap: anywhere;
}
:deep(.contest-delete-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
@media (min-width: 768px) and (max-width: 1199px) {
  .contest-manage .table-card {
    padding: 12px;
  }
}
@media (max-width: 767px) {
  .contest-manage {
    .search-bar,
    .search-fields {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .search-bar {
      padding: 12px;
    }
    .search-item,
    .search-item.narrow,
    .date-filter {
      width: 100%;
    }
    .search-actions {
      justify-content: flex-end;
    }
    .table-card {
      padding: 12px;
      overflow: hidden;
    }
    .pagination-box {
      justify-content: center;
    }
  }
  :deep(.contest-delete-dialog .el-dialog__footer) {
    flex-wrap: wrap;
  }
}
</style>
