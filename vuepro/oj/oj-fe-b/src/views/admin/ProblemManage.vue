<template>
  <div class="problem-manage">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-fields">
        <el-input
          v-model="searchForm.title"
          placeholder="题目标题"
          maxlength="100"
          clearable
          class="search-item"
          aria-label="按题目标题搜索"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.difficulty"
          placeholder="题目难度"
          clearable
          class="search-item"
          aria-label="按题目难度筛选"
        >
          <el-option
            v-for="opt in difficultyOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div class="search-actions">
        <el-button type="primary" :loading="loading" @click="handleSearch">
          <el-icon><Search /></el-icon>
          <span>查询</span>
        </el-button>
        <el-button :disabled="loading" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="result-count">共 {{ total }} 条</span>
        <el-tooltip content="刷新数据" placement="top">
          <el-button circle size="small" :loading="loading" @click="loadProblems({ force: true })">
            <el-icon v-if="!loading"><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <el-button
        type="primary"
        class="add-problem-button"
        :loading="metadataState.loading"
        @click="handleAdd"
      >
        <el-icon><Plus /></el-icon>
        <span>添加题目</span>
      </el-button>
    </div>

    <!-- 表格：加载失败与空数据统一呈现“暂无题目数据” -->
    <div class="table-card">
      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="load-alert"
      />
      <el-table
        class="manage-table"
        :data="problemList"
        v-loading="loading"
        element-loading-text="数据加载中…"
        element-loading-background="var(--app-loading-mask)"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="题目ID" width="190" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.pendingSync" class="syncing-cell">同步中…</span>
            <span v-else>{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="题目标题" min-width="240" show-overflow-tooltip />
        <el-table-column prop="difficulty" label="题目难度" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.difficulty !== ''"
              :type="difficultyTagType(row.difficulty)"
              size="small"
              effect="light"
              round
            >
              {{ difficultyLabel(row.difficulty) }}
            </el-tag>
            <span v-else class="cell-empty">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createUser" label="创建人" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.createUser }">{{ row.createUser || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" align="center">
          <template #default="{ row }">
            <span :class="{ 'cell-empty': formatProblemCreateTime(row.createTime) === '—' }">
              {{ formatProblemCreateTime(row.createTime) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="row.pendingSync"
              @click="handleEdit(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="row.pendingSync"
              @click="handleDelete(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <div class="app-table-empty">
            <div class="app-table-empty__icon">
              <el-icon :size="36"><Files /></el-icon>
            </div>
            <p class="app-table-empty__title">暂无题目数据</p>
            <p class="app-table-empty__desc">
              {{
                loadError
                  ? '数据暂时无法获取，请检查网络后点击刷新重试'
                  : '当前条件下还没有题目数据'
              }}
            </p>
            <el-button type="primary" plain :icon="Refresh" :loading="loading" @click="retryLoad">
              刷新重试
            </el-button>
          </div>
        </template>
      </el-table>

      <!-- 分页（服务端分页）：自定义每页条数控件 + 页码导航 -->
      <div class="pagination-box">
        <PageSizeSelector
          v-model="pagination.size"
          :disabled="loading"
          @change="handleSizeChange"
        />
        <el-pagination
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

    <ProblemDrawer
      ref="problemDrawerRef"
      v-model="editVisible"
      :mode="editMode"
      :metadata="metadataState.data"
      :initial-values="editInitialValues"
      :submitting="submitting"
      :submit-error="submitError"
      @submit="handleSubmit"
      @clear-submit-error="submitError = ''"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, Edit, Delete, Files } from '@element-plus/icons-vue'
import PageSizeSelector from '@/components/PageSizeSelector.vue'
import ProblemDrawer from '@/components/problem/ProblemDrawer.vue'
import { useProblemMetadataStore } from '@/stores/problemMetadata'
import {
  getProblemPage,
  getProblemDetail,
  addProblem,
  updateProblem,
  deleteProblem,
  BASE_DIFFICULTY_OPTIONS,
  formatProblemCreateTime,
  createOptimisticProblemRecord,
  clearProblemPageCache,
  peekProblemPageCache,
  isProblemPageCacheFresh,
} from '@/api/problem'

// ======================== 搜索条件（difficulty：1简单/2中等/3困难） ========================
const searchForm = reactive({
  title: '',
  difficulty: '',
})

// 后端 difficult 的固定枚举：1 简单 / 2 中等 / 3 困难
const difficultyOptions = ref(BASE_DIFFICULTY_OPTIONS.map((option) => ({ ...option })))
const difficultyMap = () => new Map(difficultyOptions.value.map((o) => [o.value, o]))
const difficultyLabel = (value) => {
  if (value === '' || value == null) return '—'
  return difficultyMap().get(value)?.label ?? String(value)
}
const difficultyTagType = (value) => difficultyMap().get(value)?.tagType ?? 'info'

// 字段元数据属于跨页面可复用的全局配置；抽屉显隐与表单值仍保留为本地状态。
const { state: metadataState, load: loadProblemMetadata } = useProblemMetadataStore()

// ======================== 分页（后端 PageQueryDto：pageNum/pageSize，API 层自动转换） ========================
const pagination = reactive({ current: 1, size: 10 })

// 组装查询参数：空值不下发
const buildQuery = () => {
  const query = { current: pagination.current, size: pagination.size }
  if (searchForm.title.trim()) query.title = searchForm.title.trim()
  if (searchForm.difficulty !== '') query.difficulty = searchForm.difficulty
  return query
}

// ======================== 列表状态 ========================
const problemList = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const lastSuccessfulPagination = reactive({ current: 1, size: 10 })
let latestLoadId = 0
let hasSuccessfulPage = false

/**
 * 加载题目列表（stale-while-revalidate）：
 * - 新鲜缓存直接用；过期缓存先渲染旧数据再静默刷新；无缓存显示 loading；
 * - 失败时保留上一次成功数据和分页状态，并展示可重试的错误提示。
 */
const loadProblems = async ({ force = false } = {}) => {
  const requestId = ++latestLoadId
  const query = buildQuery()
  let cached
  let fresh

  try {
    cached = peekProblemPageCache(query)
    fresh = isProblemPageCacheFresh(query)
  } catch (error) {
    loadError.value = error?.message || '查询参数格式不正确'
    if (!error?.handled) ElMessage.error(loadError.value)
    return
  }

  if (cached) {
    hasSuccessfulPage = true
    problemList.value = cached.records
    total.value = cached.total
    Object.assign(lastSuccessfulPagination, {
      current: pagination.current,
      size: pagination.size,
    })
  }
  if (cached && fresh && !force) {
    loadError.value = ''
    return
  }

  // 过期缓存后台刷新时不遮挡表格；首次加载与主动刷新提供明确 loading。
  if (!cached || force) loading.value = true
  loadError.value = ''
  try {
    const page = await getProblemPage(query, { force: true })
    if (requestId !== latestLoadId) return
    hasSuccessfulPage = true
    problemList.value = page.records
    total.value = page.total
    Object.assign(lastSuccessfulPagination, {
      current: pagination.current,
      size: pagination.size,
    })
  } catch (error) {
    if (requestId !== latestLoadId) return

    // 请求失败不清空已展示的列表；若切换新页失败，则恢复最后一次成功的页码状态。
    if (!cached && hasSuccessfulPage) {
      Object.assign(pagination, lastSuccessfulPagination)
    }
    const prefix = hasSuccessfulPage ? '加载失败，当前仍展示上次成功获取的数据' : '题目列表加载失败'
    loadError.value = error?.message ? `${prefix}：${error.message}` : prefix
    if (!error?.handled) ElMessage.error(error?.message || prefix)
  } finally {
    if (requestId === latestLoadId) loading.value = false
  }
}

const retryLoad = () => loadProblems({ force: true })

// ======================== 搜索 / 分页事件 ========================
const handleSearch = () => {
  pagination.current = 1
  loadProblems()
}

const handleReset = () => {
  Object.assign(searchForm, { title: '', difficulty: '' })
  pagination.current = 1
  loadProblems()
}

const handlePageChange = () => loadProblems()
const handleSizeChange = () => {
  pagination.current = 1
  loadProblems()
}

// ======================== 新增 / 编辑 ========================
const editVisible = ref(false)
const editMode = ref('add')
const submitting = ref(false)
const submitError = ref('')
const problemDrawerRef = ref(null)
const editInitialValues = ref({})

const handleAdd = async () => {
  await loadProblemMetadata()
  submitError.value = ''
  editInitialValues.value = {}
  editMode.value = 'add'
  editVisible.value = true
}

const handleEdit = async (row) => {
  try {
    submitError.value = ''
    const [, detail] = await Promise.all([loadProblemMetadata(), getProblemDetail(row.id)])
    editInitialValues.value = detail
    editMode.value = 'edit'
    editVisible.value = true
  } catch {
    // 详情错误已由请求拦截器统一呈现，避免用列表摘要覆盖完整题目内容。
  }
}

const handleSubmit = async (values) => {
  if (submitting.value) return
  submitError.value = ''
  submitting.value = true
  try {
    if (editMode.value === 'add') {
      const response = await addProblem(values)

      // 返回未筛选的第一页并立即显示新记录，再由列表接口补全 ID、创建人和时间。
      Object.assign(searchForm, { title: '', difficulty: '' })
      pagination.current = 1
      problemList.value = [
        createOptimisticProblemRecord(values, response),
        ...problemList.value,
      ].slice(0, pagination.size)
      total.value += 1
      hasSuccessfulPage = true
      loadError.value = ''

      ElMessage.success('添加成功')
    } else {
      await updateProblem({ ...values, id: editInitialValues.value.id })
      ElMessage.success('编辑题目成功')
    }
    // 写操作后清空列表缓存，强制与后端同步
    clearProblemPageCache()
    problemDrawerRef.value?.discardDraft()
    editVisible.value = false
    // 抽屉关闭后在列表区域显示刷新 loading；失败时 loadProblems 会保留当前本地记录。
    void loadProblems({ force: true })
  } catch (error) {
    submitError.value = error?.message || '提交失败，请检查网络连接后重试'
    if (!error?.handled) ElMessage.error(submitError.value)
  } finally {
    submitting.value = false
  }
}

// ======================== 删除（二次确认防误操作） ========================
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除题目「${row.title}」吗？删除后不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await deleteProblem(row.id)
        ElMessage.success('删除成功')
        clearProblemPageCache()
        // 删完后若当前页已无数据，回退一页
        if (problemList.value.length === 1 && pagination.current > 1) {
          pagination.current -= 1
        }
        await loadProblems({ force: true })
      } catch {
        // 失败时不改动本地状态，错误提示由拦截器统一处理
      }
    })
    .catch(() => {})
}

// ======================== 初始化：加载首屏数据 ========================
onMounted(() => {
  loadProblemMetadata()
  loadProblems()
})
</script>

<style lang="scss" scoped>
.problem-manage {
  .search-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-radius);
    box-shadow: var(--app-shadow);
    margin-bottom: 16px;

    .search-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;

      .search-item {
        width: 200px;
      }
    }

    .search-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 0 4px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .result-count {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 10px;
      font-size: 13px;
      color: var(--app-text-regular);
      background: var(--app-hover-bg);
      border-radius: 12px;
    }

    .add-problem-button {
      min-width: 122px;
      height: 38px;
      padding: 0 18px;
      font-weight: 600;
      box-shadow: 0 6px 18px color-mix(in srgb, var(--app-brand) 28%, transparent);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        filter 0.18s ease;

      &:hover {
        transform: translateY(-2px);
        filter: saturate(1.08);
        box-shadow: 0 9px 22px color-mix(in srgb, var(--app-brand) 35%, transparent);
      }

      &:active {
        transform: translateY(1px) scale(0.98);
        box-shadow: 0 3px 10px color-mix(in srgb, var(--app-brand) 24%, transparent);
      }
    }
  }

  .table-card {
    padding: 16px;
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-radius);
    box-shadow: var(--app-shadow);

    .load-alert {
      margin-bottom: 12px;
    }

    // 首次加载时保持表格区域高度稳定，避免空白/跳动
    :deep(.manage-table .el-table__inner-wrapper) {
      min-height: 360px;
    }

    .cell-empty {
      color: var(--app-text-secondary);
    }

    .syncing-cell {
      color: var(--app-text-secondary);
      font-size: 12px;
    }

    .pagination-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--app-border-color);
    }
  }
}

/* 响应式：平板/手机搜索区纵向堆叠，表格横向滚动（操作列固定右侧） */
@media screen and (max-width: 768px) {
  .problem-manage {
    .search-bar {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;

      .search-fields {
        flex-direction: column;

        .search-item {
          width: 100%;
        }
      }

      .search-actions {
        justify-content: flex-end;
      }
    }

    .table-card {
      padding: 12px;
    }

    .pagination-box {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
  }
}
</style>
