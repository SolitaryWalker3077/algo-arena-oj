<template>
  <div class="user-manage">
    <!-- 搜索栏（searchFields 配置驱动，后端搜索字段变化时改配置即可） -->
    <div class="search-bar">
      <div class="search-fields">
        <el-input
          v-for="field in searchFields"
          :key="field.key"
          v-model="searchForm[field.key]"
          :placeholder="field.placeholder"
          :inputmode="field.inputmode"
          clearable
          class="search-item"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="searchForm.status" placeholder="用户状态" clearable class="search-item">
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
          <el-button circle size="small" :loading="loading" @click="loadUsers({ force: true })">
            <el-icon v-if="!loading"><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增用户
      </el-button>
    </div>

    <!-- 表格 -->
    <div class="table-card">
      <el-table
        class="manage-table"
        :data="userList"
        v-loading="loading"
        element-loading-text="数据加载中…"
        element-loading-background="var(--app-loading-mask)"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="用户ID" width="190" sortable="custom" align="center" />
        <el-table-column prop="sex" label="性别" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !formatSex(row.sex) }">{{
              formatSex(row.sex) || '—'
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="userName"
          label="用户昵称"
          width="120"
          sortable="custom"
          show-overflow-tooltip
        />
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.phone }">{{ row.phone || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.email }">{{ row.email || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="wechatId" label="微信号" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'cell-empty': !row.wechatId }">{{ row.wechatId || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="学校/专业" width="200">
          <template #default="{ row }">
            <div class="school-major-cell">
              <div class="school-major-line">
                <span class="school-major-label">学校：</span>
                <span
                  class="school-major-value"
                  :class="{ 'cell-empty': !row.school }"
                  :title="row.school || '—'"
                >
                  {{ row.school || '—' }}
                </span>
              </div>
              <div class="school-major-line">
                <span class="school-major-label">专业：</span>
                <span
                  class="school-major-value"
                  :class="{ 'cell-empty': !row.major }"
                  :title="row.major || '—'"
                >
                  {{ row.major || '—' }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="intro" label="个人介绍" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="intro-text" :class="{ 'cell-empty': !row.intro }">{{
              row.intro || '—'
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="用户状态"
          width="100"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
              effect="light"
              round
            >
              {{ row.status === 1 ? '正常' : '拉黑' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              :type="row.status === 1 ? 'danger' : 'primary'"
              size="small"
              :loading="statusUpdatingIds.has(row.id)"
              :disabled="statusUpdatingIds.has(row.id)"
              @click="handleToggleStatus(row)"
            >
              <el-icon>
                <component :is="row.status === 1 ? Lock : Unlock" />
              </el-icon>
              {{ row.status === 1 ? '拉黑' : '解禁' }}
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <div class="app-table-empty">
            <div class="app-table-empty__icon">
              <el-icon :size="36"><User /></el-icon>
            </div>
            <p class="app-table-empty__title">暂无用户数据</p>
            <p class="app-table-empty__desc">
              {{
                loadError
                  ? '数据暂时无法获取，请检查网络后点击刷新重试'
                  : '当前条件下还没有用户数据'
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

    <!-- 编辑 / 新增 弹窗 -->
    <el-dialog
      v-model="editVisible"
      :title="editMode === 'add' ? '新增用户' : '编辑用户'"
      width="640px"
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
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="账号" prop="userAccount">
              <el-input
                v-model="editForm.userAccount"
                placeholder="请输入账号"
                :disabled="editMode === 'edit'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称" prop="userName">
              <el-input v-model="editForm.userName" placeholder="请输入昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="editForm.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="editForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="微信号" prop="wechatId">
              <el-input v-model="editForm.wechatId" placeholder="请输入微信号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="editForm.status">
                <el-radio :value="1">正常</el-radio>
                <el-radio :value="0">拉黑</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学校" prop="school">
              <el-input v-model="editForm.school" placeholder="请输入学校" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业" prop="major">
              <el-input v-model="editForm.major" placeholder="请输入专业" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="个人介绍" prop="intro">
              <el-input
                v-model="editForm.intro"
                type="textarea"
                :rows="4"
                maxlength="200"
                show-word-limit
                placeholder="请输入个人介绍"
              />
            </el-form-item>
          </el-col>
        </el-row>
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
import { Search, Plus, Lock, Unlock, Refresh, User } from '@element-plus/icons-vue'
import PageSizeSelector from '@/components/PageSizeSelector.vue'
import {
  getUserPage,
  addUser,
  updateUser,
  updateUserStatus,
  clearUserPageCache,
  peekUserPageCache,
  isUserPageCacheFresh,
} from '@/api/user'

// ======================== 搜索配置（配置化：后端搜索字段变化只改这里） ========================
const searchFields = [
  { key: 'userId', placeholder: '用户ID', inputmode: 'numeric' },
  { key: 'userName', placeholder: '用户昵称' },
  { key: 'phone', placeholder: '手机号' },
]
const statusOptions = [
  { label: '正常', value: 1 },
  { label: '拉黑', value: 0 },
]

const searchForm = reactive({
  userId: '',
  userName: '',
  phone: '',
  status: '',
})

// ======================== 分页 / 排序（服务端处理） ========================
const pagination = reactive({ current: 1, size: 10 })
const sortState = reactive({ prop: '', order: '' })

// 前端列 prop → 后端排序字段映射（后端字段名变化只改这里）
const SORT_FIELD_MAP = {
  id: 'id',
  sex: 'sex',
  userName: 'userName',
  status: 'status',
}

// 组装后端查询参数：空值不下发，避免把空串作为过滤条件
const buildQuery = () => {
  const query = {
    current: pagination.current,
    size: pagination.size,
  }
  for (const [key, value] of Object.entries(searchForm)) {
    if (value !== '' && value !== null && value !== undefined) {
      query[key] = value
    }
  }
  if (sortState.prop && sortState.order) {
    query.sortField = SORT_FIELD_MAP[sortState.prop] || sortState.prop
    query.sortOrder = sortState.order === 'ascending' ? 'asc' : 'desc'
  }
  return query
}

// ======================== 列表状态 ========================
const userList = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)
const statusUpdatingIds = ref(new Set())

/**
 * 加载用户列表（stale-while-revalidate）：
 * - 命中新鲜缓存：直接用缓存，不发请求；
 * - 命中过期缓存：先渲染旧数据（不闪 loading），后台静默拉取最新数据；
 * - 无缓存：显示表格 loading 遮罩；
 * - 请求失败且无旧数据：清空列表，由表格 #empty 统一呈现“暂无用户数据”+ 刷新重试
 *   （有旧数据时保留旧数据；瞬时网络提示由 request 拦截器统一弹出）。
 */
const loadUsers = async ({ force = false } = {}) => {
  let query
  let cached
  let fresh
  try {
    query = buildQuery()
    cached = peekUserPageCache(query)
    fresh = isUserPageCacheFresh(query)
  } catch (error) {
    ElMessage.warning(error.message)
    return
  }

  if (cached) {
    userList.value = cached.records
    total.value = cached.total
  }
  if (cached && fresh && !force) return

  if (!cached) loading.value = true
  loadError.value = false
  try {
    const page = await getUserPage(query, { force: true })
    userList.value = page.records
    total.value = page.total
  } catch {
    // request 拦截器已统一弹出错误提示，这里只切换错误态
    if (!cached) {
      userList.value = []
      total.value = 0
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

const retryLoad = () => loadUsers({ force: true })

const formatSex = (sex) => ({ 1: '男', 2: '女' })[Number(sex)] || ''

// ======================== 搜索 / 排序 / 分页事件 ========================
const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

const handleReset = () => {
  Object.assign(searchForm, { userId: '', userName: '', phone: '', status: '' })
  pagination.current = 1
  loadUsers()
}

const handleSortChange = ({ prop, order }) => {
  sortState.prop = prop || ''
  sortState.order = order || ''
  pagination.current = 1
  loadUsers()
}

const handlePageChange = () => loadUsers()
const handleSizeChange = () => {
  pagination.current = 1
  loadUsers()
}

// ======================== 新增 / 编辑 ========================
const editVisible = ref(false)
const editMode = ref('add')
const submitting = ref(false)
const editFormRef = ref(null)

const createEmptyForm = () => ({
  id: '',
  userAccount: '',
  userName: '',
  phone: '',
  email: '',
  wechatId: '',
  school: '',
  major: '',
  intro: '',
  status: 1,
})

const editForm = reactive(createEmptyForm())

const editRules = {
  userAccount: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度 3-20 个字符', trigger: 'blur' },
  ],
  userName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

const handleAdd = () => {
  Object.assign(editForm, createEmptyForm())
  editMode.value = 'add'
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
      await addUser({ ...editForm })
      ElMessage.success('新增用户成功')
      // 新增后回到第一页查看
      pagination.current = 1
    } else {
      await updateUser({ ...editForm })
      ElMessage.success('编辑用户成功')
    }
    // 写操作后主动清空列表缓存，保证下次加载拿到后端最新数据
    clearUserPageCache()
    editVisible.value = false
    await loadUsers({ force: true })
  } catch {
    // 错误提示已由 request 拦截器统一处理
  } finally {
    submitting.value = false
  }
}

// ======================== 拉黑 / 解禁 ========================
const handleToggleStatus = async (row) => {
  const nextStatus = row.status === 1 ? 0 : 1
  const action = nextStatus === 1 ? '解禁' : '拉黑'
  const displayName = row.userName || row.id

  try {
    await ElMessageBox.confirm(`确定要${action}用户「${displayName}」吗？`, `${action}确认`, {
      confirmButtonText: action,
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  statusUpdatingIds.value.add(row.id)
  try {
    await updateUserStatus(row.id, nextStatus)
    row.status = nextStatus
    clearUserPageCache()
    ElMessage.success(`${action}成功`)
    await loadUsers({ force: true })
  } catch {
    // 失败时不修改本地状态，错误提示由拦截器统一处理
  } finally {
    statusUpdatingIds.value.delete(row.id)
  }
}

// ======================== 初始化：首屏从后端加载 ========================
onMounted(() => {
  loadUsers()
})
</script>

<style lang="scss" scoped>
.user-manage {
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

    .intro-text {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .school-major-cell {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
      padding: 2px 0;
      line-height: 20px;
    }

    .school-major-line {
      display: flex;
      min-width: 0;
      align-items: center;
    }

    .school-major-label {
      flex-shrink: 0;
      color: var(--app-text-regular);
    }

    .school-major-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

/* 响应式：小屏适配（表格横向滚动，操作列固定右侧，关键信息优先可见） */
@media screen and (max-width: 768px) {
  .user-manage {
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
