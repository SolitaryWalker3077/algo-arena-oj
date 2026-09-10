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
          <span class="admin-account">{{ adminAccount || '管理员' }}</span>
          <div class="logout-btn" @click="logout">退出登录</div>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { HomeFilled, User, Document, Trophy } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const adminAccount = localStorage.getItem('adminAccount')

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

// 退出登录：清除登录状态并返回登录页
const logout = () => {
  localStorage.removeItem('Admin-oj-b-key')
  localStorage.removeItem('adminAccount')
  ElMessage.success('已退出登录')
  router.push('/oj/login')
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

      .admin-account {
        font-size: 14px;
        color: #666666;
      }

      .logout-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 36px;
        padding: 0 16px;
        background: #32c5ff;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;

        &:hover {
          opacity: 0.9;
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
</style>
