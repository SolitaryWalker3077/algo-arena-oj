<template>
  <div class="oj-navbar">
    <div class="oj-navbar-menus">
      <img class="oj-navbar-logo" src="@/assets/logo.png" alt="OJ 竞技场首页" @click="goHome" />
      <el-menu router class="oj-navbar-menu" mode="horizontal">
        <el-menu-item index="/c-oj/home/question">题库</el-menu-item>
        <el-menu-item index="/c-oj/home/exam">竞赛</el-menu-item>
      </el-menu>
    </div>
    <div class="oj-navbar-users">
      <img v-if="userState.isAuthenticated" class="oj-message" @click="goMessage" src="@/assets/message/message.png" />
      <div v-if="userState.isAuthenticated && userState.isLoading" class="user-loading" role="status">
        <span class="user-loading-spinner" aria-hidden="true"></span>
        <span>加载中</span>
      </div>
      <button
        v-else-if="userState.isAuthenticated && userState.error"
        class="user-load-error"
        type="button"
        :title="userState.error"
        @click="loadUserInfo"
      >
        用户信息加载失败，点击重试
      </button>
      <el-dropdown v-else-if="userState.isAuthenticated">
        <div class="oj-navbar-name">
          <img class="oj-head-image" :src="avatarUrl" alt="用户头像" />
          <span>{{ userState.profile.nickName }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="goUserDetail">
              <div class="oj-navabar-item">
                <span>个人中心</span>
              </div>
            </el-dropdown-item>
            <el-dropdown-item @click="goMyExam">
              <div class="oj-navabar-item">
                <span>我的竞赛</span>
              </div>
            </el-dropdown-item>
            <el-dropdown-item :disabled="isLoggingOut" @click="handleLogout">
              <div class="oj-navabar-item">
                <span>{{ isLoggingOut ? '正在退出…' : '退出登录' }}</span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <button
        v-if="!userState.isAuthenticated"
        class="oj-navbar-login-btn"
        type="button"
        @click="goLogin"
      >
        登录
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import defaultAvatar from '@/assets/images/headimage.jpg'
import { logoutService } from '@/apis/user'
import { getToken, removeToken } from '@/utils/cookie'
import { clearCurrentUser, fetchCurrentUser, userState } from '@/stores/user'
import { showAuthExpiredNotice } from '@/utils/authNotice'

const router = useRouter()
const avatarUrl = computed(() => userState.profile.headImage || defaultAvatar)
const isLoggingOut = ref(false)

async function loadUserInfo() {
  try {
    await fetchCurrentUser({ force: Boolean(userState.error) })
  } catch {
    // 错误文案由用户 Store 统一提供并在导航栏展示。
  }
}

onMounted(() => {
  if (userState.isAuthenticated && !userState.hasLoaded) loadUserInfo()
})

function goLogin() {
  router.push({ name: 'login' })
}

function goHome() {
  router.push({ name: 'home' })
}

function goMessage() {
  router.push('/c-oj/home/message')
}

function goUserDetail() {
  router.push('/c-oj/home/user')
}

function goMyExam() {
  router.push('/c-oj/home/exam')
}

async function handleLogout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  const token = getToken()
  const logoutRequest = logoutService(token)

  // 退出操作立即反映到界面，后端请求继续使用点击时捕获的 Token。
  removeToken()
  clearCurrentUser()
  showAuthExpiredNotice()
  await router.replace({ name: 'home' })

  try {
    await logoutRequest
  } catch (error) {
    if (error.code !== 3001) {
      ElMessage.error(error.message || '服务端退出失败，本地登录状态已清除')
    }
  } finally {
    isLoggingOut.value = false
  }
}
</script>


<style lang="scss" scoped>
.oj-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;

  max-width: 1520px;
  margin: 0 auto;

  .oj-navbar-menus {
    display: flex;
    align-items: center;
    height: 50px;

    .el-menu-item {
      font-family: PingFangSC, PingFang SC;
      font-weight: 400;
      font-size: 20px;
      color: #222222;
      line-height: 28px;
      text-align: center;
      width: 42px;
      text-align: left;
      margin-right: 25px;
    }
  }

  .oj-navbar-logo {
    width: 38px;
    height: 38px;
    background: #32C5FF;
    border-radius: 8px;
    cursor: pointer;
    object-fit: contain;
    margin-right: 59px;
  }

  .oj-navbar-menu {
    // margin-left: 18px;
    width: 600px;
    border: none;

    .el-menu-item {
      font-size: 16px;
      font-weight: 500;
      background-color: transparent !important;
      transition: none;
      border: none;
      line-height: 60px;
    }
  }

  .oj-navbar-users {
    display: flex;
    align-items: center;
  }

  .user-loading,
  .user-load-error {
    display: flex;
    align-items: center;
    min-height: 36px;
    margin-left: 15px;
    color: #667078;
    font-size: 14px;
  }

  .user-load-error {
    max-width: 220px;
    padding: 0 10px;
    color: #e4564f;
    background: #fef0f0;
    border: 1px solid #fbc4c4;
    border-radius: 6px;
    cursor: pointer;
  }

  .user-loading-spinner {
    width: 15px;
    height: 15px;
    margin-right: 7px;
    border: 2px solid #c9edf9;
    border-top-color: #32c5ff;
    border-radius: 50%;
    animation: user-spin 0.7s linear infinite;
  }

  .oj-navbar-login-btn {
    padding: 0 8px;
    line-height: 60px;
    display: inline-block;
    font-family: PingFangSC, PingFang SC;
    font-weight: 400;
    font-size: 18px;
    color: #222222;
    text-align: center;
    background: transparent;
    border: 0;
    cursor: pointer;

    .line {
      display: inline-block;
      width: 25px;
    }
  }

  .oj-message {
    cursor: pointer;
    margin-top: 15px;
  }

  .oj-head-image {
    width: 30px;
    height: 30px;
    border-radius: 30px;
    margin-right: 10px;
  }

  .oj-navbar-name {
    cursor: pointer;
    margin-top: 15px;
    font-weight: 400;
    color: #000;
    margin-left: 15px;
    font-size: 20px;
    width: 100px;
    display: flex;
    align-items: center;
  }

  .oj-navabar-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 32px;
  }
}

@keyframes user-spin {
  to { transform: rotate(360deg); }
}
</style>
