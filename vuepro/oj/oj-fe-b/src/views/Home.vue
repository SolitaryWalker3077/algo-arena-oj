<template>
  <div class="home-page">
    <div class="home-card">
      <div class="title">比特OJ后台管理</div>
      <div class="welcome">欢迎你，{{ adminAccount || '管理员' }}</div>
      <div class="tip">后台管理页面（后续在此开发用户管理、题目管理等功能）</div>
      <div class="logout-btn" @click="logout">退出登录</div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const adminAccount = localStorage.getItem('adminAccount')

// 退出登录：清除登录状态并返回登录页
const logout = () => {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminAccount')
  ElMessage.success('已退出登录')
  router.push('/oj/login')
}
</script>

<style lang="scss" scoped>
.home-page {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: #f5f7fa;

  .home-card {
    width: 420px;
    padding: 48px 40px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0px 0px 12px 0px rgba(0, 0, 0, 0.08);
    text-align: center;

    .title {
      font-size: 24px;
      font-weight: 600;
      color: #222222;
      margin-bottom: 24px;
    }

    .welcome {
      font-size: 18px;
      color: #32c5ff;
      margin-bottom: 12px;
    }

    .tip {
      font-size: 14px;
      color: #999999;
      margin-bottom: 32px;
    }

    .logout-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 44px;
      background: #32c5ff;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
    }
  }
}
</style>
