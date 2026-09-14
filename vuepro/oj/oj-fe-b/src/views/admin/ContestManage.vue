<template>
  <div class="contest-manage">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-fields">
        <el-input
          v-model="keyword"
          placeholder="搜索竞赛名称"
          clearable
          class="search-item"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="statusFilter"
          placeholder="竞赛状态"
          clearable
          class="search-item search-item--status"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div class="search-actions">
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          <span>查询</span>
        </el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="result-count">共 {{ filteredContests.length }} 条</span>
        <el-tooltip content="刷新数据" placement="top">
          <el-button circle size="small" :loading="loading" @click="loadContests">
            <el-icon v-if="!loading"><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        <span>新增竞赛</span>
      </el-button>
    </div>

    <!-- 表格：加载失败与空数据统一呈现“暂无竞赛数据” -->
    <div class="table-card">
      <el-table
        class="manage-table"
        :data="pagedContests"
        v-loading="loading"
        element-loading-text="数据加载中…"
        element-loading-background="var(--app-loading-mask)"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="180" align="center" show-overflow-tooltip />
        <el-table-column prop="name" label="竞赛名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="light" round>
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="175" align="center">
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.startTime }">{{ formatTime(row.startTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="175" align="center">
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.endTime }">{{ formatTime(row.endTime) }}</span>
          </template>
        </el-table-column>
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
          <div class="app-table-empty">
            <div class="app-table-empty__icon">
              <el-icon :size="36"><Trophy /></el-icon>
            </div>
            <p class="app-table-empty__title">暂无竞赛数据</p>
            <p class="app-table-empty__desc">
              {{ loadError ? '数据暂时无法获取，请检查网络后点击刷新重试' : '当前条件下还没有竞赛数据' }}
            </p>
            <el-button type="primary" plain :icon="Refresh" :loading="loading" @click="retryLoad">
              刷新重试
            </el-button>
          </div>
        </template>
      </el-table>

      <!-- 分页（竞赛接口接入前为前端分页，接入后可平移为服务端分页） -->
      <div class="pagination-box">
        <PageSizeSelector
          v-model="pagination.size"
          :disabled="loading"
          @change="handleSizeChange"
        />
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredContests.length"
          layout="prev, pager, next, jumper"
          background
          size="small"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- 编辑 / 新增 弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="editMode === 'add' ? '新增竞赛' : '编辑竞赛'"
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
        <el-form-item label="竞赛名称" prop="name">
          <el-input
            v-model="editForm.name"
            placeholder="请输入竞赛名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="竞赛状态" prop="status">
          <el-radio-group v-model="editForm.status">
            <el-radio v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="竞赛时间" prop="range">
          <el-date-picker
            v-model="editForm.range"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, Edit, Delete, Trophy } from '@element-plus/icons-vue'
import PageSizeSelector from '@/components/PageSizeSelector.vue'

// ======================== 竞赛状态字典 ========================
const STATUS_NOT_STARTED = 0
const STATUS_ONGOING = 1
const STATUS_ENDED = 2

const statusOptions = [
  { value: STATUS_NOT_STARTED, label: '未开始', tagType: 'warning' },
  { value: STATUS_ONGOING, label: '进行中', tagType: 'success' },
  { value: STATUS_ENDED, label: '已结束', tagType: 'info' },
]
const statusMap = () => new Map(statusOptions.map((o) => [o.value, o]))
const statusLabel = (status) => statusMap().get(status)?.label ?? '未知'
const statusTagType = (status) => statusMap().get(status)?.tagType ?? 'info'

// ======================== 搜索 / 分页 ========================
const keyword = ref('')
const statusFilter = ref('')
const appliedKeyword = ref('')
const appliedStatus = ref('')
const pagination = reactive({ current: 1, size: 10 })

// ======================== 列表状态 ========================
const contestList = ref([])
const loading = ref(false)
// 仅用于空态文案区分（网络失败/空数据），不展示独立“加载失败”错误页
const loadError = ref(false)

/**
 * 加载竞赛列表。
 * TODO（后端接入点）：竞赛服务就绪后改为
 *   const page = await getContestPage(buildQuery())
 *   contestList.value = page.records; total.value = page.total
 * 并将下方分页从前端切片平移为服务端分页（与题目/用户模块一致）。
 */
const loadContests = async () => {
  loading.value = true
  loadError.value = false
  try {
    // 当前后端竞赛接口尚未提供，按“无数据”呈现，不构造任何内置模拟数据
    contestList.value = []
  } catch {
    contestList.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const retryLoad = () => loadContests()

// 名称模糊 + 状态筛选（前端过滤；接口接入后改由服务端过滤）
const filteredContests = computed(() => {
  const kw = appliedKeyword.value.trim()
  return contestList.value.filter((item) => {
    const matchKeyword = !kw || (item.name || '').includes(kw)
    const matchStatus = appliedStatus.value === '' || item.status === appliedStatus.value
    return matchKeyword && matchStatus
  })
})

const pagedContests = computed(() => {
  const start = (pagination.current - 1) * pagination.size
  return filteredContests.value.slice(start, start + pagination.size)
})

// 每页条数变化后回到首页，pagedContests 会立即重新计算。
const handleSizeChange = () => {
  pagination.current = 1
}

const handleSearch = () => {
  appliedKeyword.value = keyword.value
  appliedStatus.value = statusFilter.value
  pagination.current = 1
}

const handleReset = () => {
  keyword.value = ''
  statusFilter.value = ''
  handleSearch()
}

// ======================== 时间展示 ========================
// 兼容 'YYYY-MM-DDTHH:mm'（ISO）、数组形式与空值；空值统一占位，避免空白单元格
const formatTime = (value) => {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) {
    const v = value[0]
    return v == null ? '—' : String(v).replace('T', ' ')
  }
  return String(value).replace('T', ' ')
}

// ======================== 新增 / 编辑 ========================
const editVisible = ref(false)
const editMode = ref('add')
const editFormRef = ref(null)

const createEmptyForm = () => ({
  id: '',
  name: '',
  status: STATUS_NOT_STARTED,
  range: [],
})

const editForm = reactive(createEmptyForm())

const editRules = {
  name: [
    { required: true, message: '请输入竞赛名称', trigger: 'blur' },
    { max: 50, message: '名称不超过 50 个字符', trigger: 'blur' },
  ],
  status: [
    { required: true, message: '请选择竞赛状态', trigger: 'change' },
  ],
  range: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value || !value[0] || !value[1]) {
          callback(new Error('请选择竞赛开始与结束时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

const handleAdd = () => {
  Object.assign(editForm, createEmptyForm())
  editMode.value = 'add'
  editVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(editForm, createEmptyForm(), {
    id: row.id,
    name: row.name,
    status: row.status,
    range: row.startTime && row.endTime ? [row.startTime, row.endTime] : [],
  })
  editMode.value = 'edit'
  editVisible.value = true
}

const handleSubmit = async () => {
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  const payload = {
    name: editForm.name,
    status: editForm.status,
    startTime: editForm.range[0],
    endTime: editForm.range[1],
  }

  if (editMode.value === 'add') {
    // 接口接入前的本地新增；接口接入后替换为 addContest(payload)
    contestList.value.unshift({
      ...payload,
      id: String(Date.now()),
    })
    ElMessage.success('新增竞赛成功')
  } else {
    const target = contestList.value.find((item) => item.id === editForm.id)
    if (target) Object.assign(target, payload)
    ElMessage.success('编辑竞赛成功')
  }
  editVisible.value = false
}

// ======================== 删除（二次确认） ========================
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除竞赛「${row.name}」吗？删除后不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // 接口接入前的本地删除；接口接入后替换为 await deleteContest(row.id)
      const idx = contestList.value.findIndex((item) => item.id === row.id)
      if (idx !== -1) contestList.value.splice(idx, 1)
      if (pagedContests.value.length === 0 && pagination.current > 1) {
        pagination.current -= 1
      }
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

onMounted(() => {
  loadContests()
})
</script>

<style lang="scss" scoped>
.contest-manage {
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
  }

  .table-card {
    padding: 16px;
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-radius);
    box-shadow: var(--app-shadow);

    // 首次加载时保持表格区域高度稳定，避免空白/跳动
    :deep(.manage-table .el-table__inner-wrapper) {
      min-height: 360px;
    }

    .cell-empty {
      color: var(--app-text-secondary);
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
  .contest-manage {
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
