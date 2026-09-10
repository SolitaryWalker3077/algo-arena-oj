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
          clearable
          class="search-item"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.status"
          placeholder="用户状态"
          clearable
          class="search-item"
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
          <el-button circle size="small" @click="loadUsers({ force: true })">
            <el-icon><Refresh /></el-icon>
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
        v-if="!(loadError && !userList.length)"
        :data="userList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="用户ID" width="190" sortable="custom" align="center" />
        <el-table-column prop="userAccount" label="用户账号" width="140" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="userName" label="用户昵称" width="120" sortable="custom" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" width="200" show-overflow-tooltip />
        <el-table-column prop="wechatId" label="微信号" width="130" show-overflow-tooltip />
        <el-table-column label="学校/专业" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.school }} / {{ row.major }}
          </template>
        </el-table-column>
        <el-table-column prop="intro" label="个人介绍" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="intro-text">{{ row.intro }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="用户状态" width="100" align="center" sortable="custom">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
              effect="light"
              round
            >
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              size="small"
              @click="handleToggleStatus(row)"
            >
              <el-icon>
                <component :is="row.status === 1 ? Lock : Unlock" />
              </el-icon>
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无用户数据" />
        </template>
      </el-table>

      <!-- 加载失败且无缓存数据时的错误态：可重试 -->
      <div v-else class="error-box">
        <el-result icon="error" title="数据加载失败" sub-title="无法获取用户数据，请确认后端用户服务已启动">
          <template #extra>
            <el-button type="primary" @click="retryLoad">重新加载</el-button>
          </template>
        </el-result>
      </div>

      <!-- 分页（服务端分页：参数随查询一起下发） -->
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
              <el-input v-model="editForm.userAccount" placeholder="请输入账号" :disabled="editMode === 'edit'" />
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
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">禁用</el-radio>
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

    <!-- 详情弹窗（数据来自列表接口返回，无需额外请求） -->
    <el-dialog v-model="detailVisible" title="用户详情" width="640px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户ID">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="用户账号">{{ detailData.userAccount }}</el-descriptions-item>
        <el-descriptions-item label="用户昵称">{{ detailData.userName }}</el-descriptions-item>
        <el-descriptions-item label="用户状态">
          <el-tag
            :type="detailData.status === 1 ? 'success' : 'danger'"
            size="small"
            effect="light"
            round
          >
            {{ detailData.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detailData.phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detailData.email }}</el-descriptions-item>
        <el-descriptions-item label="微信号">{{ detailData.wechatId }}</el-descriptions-item>
        <el-descriptions-item label="学校">{{ detailData.school }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ detailData.major }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="个人介绍" :span="2">{{ detailData.intro }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, View, Edit, Lock, Unlock, Refresh } from '@element-plus/icons-vue'
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
  { key: 'userAccount', placeholder: '用户账号' },
  { key: 'userName', placeholder: '用户昵称' },
  { key: 'phone', placeholder: '手机号' },
]
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
]

const searchForm = reactive({
  userAccount: '',
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
  userAccount: 'userAccount',
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

/**
 * 加载用户列表（stale-while-revalidate）：
 * - 命中新鲜缓存：直接用缓存，不发请求；
 * - 命中过期缓存：先渲染旧数据（不闪 loading），后台静默拉取最新数据；
 * - 无缓存：显示表格 loading 骨架；
 * - 请求失败且无旧数据：展示错误态 + 重新加载按钮（有旧数据时保留旧数据，错误提示由拦截器统一弹出）。
 */
const loadUsers = async ({ force = false } = {}) => {
  const query = buildQuery()
  const cached = peekUserPageCache(query)
  const fresh = isUserPageCacheFresh(query)

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

// ======================== 搜索 / 排序 / 分页事件 ========================
const handleSearch = () => {
  pagination.current = 1
  loadUsers()
}

const handleReset = () => {
  Object.assign(searchForm, { userAccount: '', userName: '', phone: '', status: '' })
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
  userName: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
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

// ======================== 查看详情 ========================
const detailVisible = ref(false)
const detailData = ref({})

const handleView = (row) => {
  detailData.value = { ...row }
  detailVisible.value = true
}

// ======================== 禁用 / 启用 ========================
const handleToggleStatus = (row) => {
  const nextStatus = row.status === 1 ? 0 : 1
  const action = nextStatus === 1 ? '启用' : '禁用'
  ElMessageBox.confirm(`确定要${action}用户「${row.userName}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await updateUserStatus(row.id, nextStatus)
        row.status = nextStatus
        clearUserPageCache()
        ElMessage.success(`${action}成功`)
        loadUsers()
      } catch {
        // 失败时不修改本地状态，错误提示由拦截器统一处理
      }
    })
    .catch(() => {})
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
    background: #ffffff;
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
      color: #666666;
    }
  }

  .table-card {
    padding: 16px;
    background: #ffffff;
    border-radius: 8px;

    .intro-text {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

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
  .user-manage {
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
