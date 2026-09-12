<template>
  <div class="problem-manage">
    <!-- 搜索栏（位于表格上方） -->
    <div class="search-bar">
      <div class="search-fields">
        <el-input
          v-model="searchForm.title"
          placeholder="题目标题"
          clearable
          class="search-item"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.difficulty"
          placeholder="题目难度"
          clearable
          class="search-item"
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
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="result-count">共 {{ total }} 条</span>
        <el-tooltip content="刷新数据" placement="top">
          <el-button circle size="small" @click="loadProblems({ force: true })">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增题目
      </el-button>
    </div>

    <!-- 表格 -->
    <div class="table-card">
      <el-table
        v-if="!(loadError && !problemList.length)"
        :data="problemList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="题目ID" width="190" sortable="custom" align="center" />
        <el-table-column prop="title" label="题目标题" min-width="260" show-overflow-tooltip />
        <el-table-column prop="difficulty" label="题目难度" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="difficultyTagType(row.difficulty)" size="small" effect="light" round>
              {{ difficultyLabel(row.difficulty) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createUser" label="创建人" width="160" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="180" sortable="custom" />
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无题目数据" />
        </template>
      </el-table>

      <!-- 加载失败且无缓存数据时的错误态：可重试 -->
      <div v-else class="error-box">
        <el-result icon="error" title="数据加载失败" sub-title="无法获取题目数据，请确认后端题目服务已启动">
          <template #extra>
            <el-button type="primary" @click="retryLoad">重新加载</el-button>
          </template>
        </el-result>
      </div>

      <!-- 分页（服务端分页） -->
      <div class="pagination-box">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 编辑 / 新增 弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="editMode === 'add' ? '新增题目' : '编辑题目'"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="题目标题" prop="title">
          <el-input
            v-model="editForm.title"
            placeholder="请输入题目标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="题目难度" prop="difficulty">
          <el-select v-model="editForm.difficulty" placeholder="请选择难度" style="width: 100%">
            <el-option
              v-for="opt in difficultyOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import {
  getProblemPage,
  addProblem,
  updateProblem,
  deleteProblem,
  getDifficultyOptions,
  clearProblemPageCache,
  peekProblemPageCache,
  isProblemPageCacheFresh,
} from '@/api/problem'

// ======================== 搜索条件 ========================
const searchForm = reactive({
  title: '',
  difficulty: '',
})

// 难度选项由后端字典接口动态加载（接口不可用时 API 层自动使用兜底配置）
const difficultyOptions = ref([])
const difficultyMap = () => new Map(difficultyOptions.value.map((o) => [o.value, o]))
const difficultyLabel = (value) => difficultyMap().get(value)?.label ?? value ?? '-'
const difficultyTagType = (value) => difficultyMap().get(value)?.tagType ?? 'info'

// ======================== 分页 / 排序（服务端处理） ========================
const pagination = reactive({ current: 1, size: 10 })
const sortState = reactive({ prop: '', order: '' })

// 前端列 prop → 后端排序字段映射（后端字段名变化只改这里）
const SORT_FIELD_MAP = {
  id: 'id',
  createTime: 'createTime',
}

// 组装后端查询参数：空值不下发
const buildQuery = () => {
  const query = { current: pagination.current, size: pagination.size }
  if (searchForm.title.trim()) query.title = searchForm.title.trim()
  if (searchForm.difficulty !== '') query.difficulty = searchForm.difficulty
  if (sortState.prop && sortState.order) {
    query.sortField = SORT_FIELD_MAP[sortState.prop] || sortState.prop
    query.sortOrder = sortState.order === 'ascending' ? 'asc' : 'desc'
  }
  return query
}

// ======================== 列表状态 ========================
const problemList = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)

/**
 * 加载题目列表（stale-while-revalidate）：
 * - 新鲜缓存直接用；过期缓存先渲染再静默刷新；无缓存显示 loading；
 * - 失败且无旧数据时展示错误态与“重新加载”。
 */
const loadProblems = async ({ force = false } = {}) => {
  const query = buildQuery()
  const cached = peekProblemPageCache(query)
  const fresh = isProblemPageCacheFresh(query)

  if (cached) {
    problemList.value = cached.records
    total.value = cached.total
  }
  if (cached && fresh && !force) return

  if (!cached) loading.value = true
  loadError.value = false
  try {
    const page = await getProblemPage(query, { force: true })
    problemList.value = page.records
    total.value = page.total
  } catch {
    // 错误提示由 request 拦截器统一弹出，这里只切换错误态
    if (!cached) {
      problemList.value = []
      total.value = 0
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

const retryLoad = () => loadProblems({ force: true })

// ======================== 搜索 / 排序 / 分页事件 ========================
const handleSearch = () => {
  pagination.current = 1
  loadProblems()
}

const handleReset = () => {
  Object.assign(searchForm, { title: '', difficulty: '' })
  pagination.current = 1
  loadProblems()
}

const handleSortChange = ({ prop, order }) => {
  sortState.prop = prop || ''
  sortState.order = order || ''
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
const editFormRef = ref(null)

const createEmptyForm = () => ({
  id: '',
  title: '',
  difficulty: '',
})

const editForm = reactive(createEmptyForm())

const editRules = {
  title: [
    { required: true, message: '请输入题目标题', trigger: 'blur' },
    { max: 100, message: '标题不超过 100 个字符', trigger: 'blur' },
  ],
  difficulty: [
    { required: true, message: '请选择题目难度', trigger: 'change' },
  ],
}

const handleAdd = () => {
  Object.assign(editForm, createEmptyForm())
  editMode.value = 'add'
  editVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(editForm, createEmptyForm(), { ...row })
  editMode.value = 'edit'
  editVisible.value = true
}

const handleSubmit = async () => {
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (editMode.value === 'add') {
      await addProblem({ ...editForm })
      ElMessage.success('新增题目成功')
      pagination.current = 1
    } else {
      await updateProblem({ ...editForm })
      ElMessage.success('编辑题目成功')
    }
    // 写操作后清空列表缓存，强制与后端同步
    clearProblemPageCache()
    editVisible.value = false
    await loadProblems({ force: true })
  } catch {
    // 错误提示已由 request 拦截器统一处理
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

// ======================== 初始化：动态加载难度字典 + 首屏数据 ========================
onMounted(async () => {
  // 难度字典与列表并行加载，互不阻塞
  getDifficultyOptions().then((options) => {
    difficultyOptions.value = options
  })
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
    border-radius: 8px;
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
      font-size: 14px;
      color: var(--app-text-regular);
    }
  }

  .table-card {
    padding: 16px;
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: 8px;

    .error-box {
      padding: 20px 0;
    }

    .pagination-box {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }
}

/* 响应式：小屏适配 */
@media screen and (max-width: 768px) {
  .problem-manage {
    .search-bar {
      flex-direction: column;
      align-items: stretch;

      .search-fields {
        .search-item {
          width: 100%;
        }
      }

      .search-actions {
        justify-content: flex-end;
      }
    }
  }
}
</style>
