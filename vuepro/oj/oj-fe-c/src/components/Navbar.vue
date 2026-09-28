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
      <img v-if="isLogin" class="oj-message" @click="goMessage" src="@/assets/message/message.png" />
      <el-dropdown v-if="isLogin">
        <div class="oj-navbar-name">
          <img class="oj-head-image" v-if="isLogin" :src="userInfo.headImage" />
          <span>{{ userInfo.nickName }}</span>
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
            <el-dropdown-item>
              <div class="oj-navabar-item">
                <span @click="handleLogout">退出登录</span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <button
        v-if="!isLogin"
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
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import defaultAvatar from '@/assets/images/headimage.jpg'
import { logoutService } from '@/apis/user'
import { getToken, removeToken } from '@/utils/cookie'

const router = useRouter()
const isLogin = ref(Boolean(getToken()))
const userInfo = reactive({
  headImage: defaultAvatar,
  nickName: 'OJ用户',
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
  try {
    await logoutService()
  } catch {
    // 即使服务端会话已失效，也应清理本地登录状态。
  } finally {
    removeToken()
    isLogin.value = false
    goHome()
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
</style>
