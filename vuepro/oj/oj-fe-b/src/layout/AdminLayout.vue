<template>
  <div class="admin-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span>OJ后台管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="nav-menu"
        router
        :collapse="false"
      >
        <el-menu-item index="/admin/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/admin/user">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/problem">
          <el-icon><Document /></el-icon>
          <span>题目管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/contest">
          <el-icon><Trophy /></el-icon>
          <span>竞赛管理</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧内容区 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="page-title">{{ currentTitle }}</div>
        <div class="top-right">
          <el-dropdown
            trigger="hover"
            placement="bottom-end"
            @command="handleUserCommand"
          >
            <div class="user-info" tabindex="0">
              <el-icon class="user-icon"><User /></el-icon>
              <span class="user-label">当前用户:</span>
              <span class="admin-account">{{ displayName }}</span>
              <el-icon class="arrow-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" :disabled="loggingOut">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="content">
        <RouterView />
      </main>
    </div>

    <el-dialog
      v-model="logoutDialogVisible"
      title="温馨提示"
      width="420px"
      align-center
      append-to-body
      destroy-on-close
      :show-close="!loggingOut"
      :close-on-click-modal="!loggingOut"
      :close-on-press-escape="!loggingOut"
    >
      <div class="logout-confirm-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <span>确定要退出当前账号吗？退出后需要重新登录。</span>
      </div>
      <template #footer>
        <el-button :disabled="loggingOut" @click="cancelLogout">取消</el-button>
        <el-button type="primary" :loading="loggingOut" @click="confirmLogout">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  Document,
  HomeFilled,
  SwitchButton,
  Trophy,
  User,
  WarningFilled,
} from '@element-plus/icons-vue'
import { getUserInfo, userLogout } from '@/api/suser'
import { ACCOUNT_KEY, clearAuth } from '@/utils/auth'

const route = useRoute()
const router = useRouter()

const adminAccount = localStorage.getItem(ACCOUNT_KEY)
const nickName = ref('')
const displayName = computed(() => nickName.value || adminAccount || '管理员')
const logoutDialogVisible = ref(false)
const loggingOut = ref(false)

onMounted(async () => {
  try {
    const userInfo = await getUserInfo()
    nickName.value = userInfo?.nickName?.trim() || ''
    if (!nickName.value) throw new Error('用户信息接口未返回昵称')
  } catch (error) {
    // 后端错误原因及未授权跳转已由响应拦截器统一处理。
    if (!error?.handled) ElMessage.error(error?.message || '获取用户信息失败')
    console.error('获取管理员信息失败：', error)
  }
})

// 当前激活的菜单项
const activeMenu = computed(() => route.path)

// 顶部页面标题
const titleMap = {
  '/admin/home': '首页',
  '/admin/user': '用户管理',
  '/admin/problem': '题目管理',
  '/admin/contest': '竞赛管理',
}
const currentTitle = computed(() => titleMap[route.path] || '后台管理')

const handleUserCommand = (command) => {
  if (command !== 'logout' || loggingOut.value) return
  logoutDialogVisible.value = true
}

const cancelLogout = () => {
  if (!loggingOut.value) logoutDialogVisible.value = false
}

// 仅在用户确认后请求后端；失败时由响应拦截器提示，并保留页面和本地登录态。
const confirmLogout = async () => {
  if (loggingOut.value) return

  loggingOut.value = true
  try {
    await userLogout()
    clearAuth()
    logoutDialogVisible.value = false
    ElMessage.success('已安全退出登录')
    await router.replace('/oj/login')
  } catch (error) {
    if (!error?.handled) ElMessage.error(error?.message || '退出登录失败，请稍后重试')
    console.error('退出登录失败：', error)
  } finally {
    loggingOut.value = false
  }
}
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 210px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #f0f0f0;

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 64px;
    font-size: 18px;
    font-weight: 600;
    color: #32c5ff;
    border-bottom: 1px solid #f0f0f0;
  }

  .nav-menu {
    flex: 1;
    border-right: none;

    :deep(.el-menu-item) {
      height: 50px;
      line-height: 50px;
      font-size: 15px;

      &.is-active {
        background: #e6f9ff;
        color: #32c5ff;
      }

      &:hover {
        background: #f5f7fa;
        color: #32c5ff;
      }
    }
  }
}

.main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background: #f5f7fa;

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 24px;
    background: #ffffff;
    border-bottom: 1px solid #f0f0f0;

    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: #222222;
    }

    .top-right {
      display: flex;
      align-items: center;
      gap: 16px;

      .user-info {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        height: 40px;
        padding: 0 12px;
        border-radius: 6px;
        cursor: pointer;
        outline: none;
        transition: background-color 0.2s, color 0.2s;

        &:hover,
        &:focus-visible {
          background: #e6f9ff;

          .user-icon,
          .arrow-icon {
            color: #32c5ff;
          }
        }

        .user-icon,
        .arrow-icon {
          flex-shrink: 0;
          color: #999999;
          transition: color 0.2s;
        }

        .user-label {
          font-size: 14px;
          color: #999999;
          white-space: nowrap;
        }

        .admin-account {
          font-size: 14px;
          color: #666666;
          max-width: min(220px, 30vw);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  .content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
}

.logout-confirm-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #606266;
  line-height: 24px;

  .warning-icon {
    flex-shrink: 0;
    font-size: 24px;
    color: #e6a23c;
  }
}
</style>
