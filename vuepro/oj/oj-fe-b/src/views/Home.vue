<template>
  <div class="home-page">
    <div class="welcome-card">
      <div class="title">OJ后台管理</div>
      <div class="welcome">欢迎你，{{ adminAccount || '管理员' }}</div>
      <div class="tip">请从左侧导航栏选择需要管理的模块</div>
    </div>
  </div>
</template>

<script setup>
const adminAccount = localStorage.getItem('adminAccount')
</script>

<style lang="scss" scoped>
.home-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  .welcome-card {
    padding: 48px 40px;
    background: var(--app-card-bg);
    border: 1px solid var(--app-border-color);
    border-radius: 12px;
    box-shadow: var(--app-shadow);
    text-align: center;

    .title {
      font-size: 24px;
      font-weight: 600;
      color: var(--app-text-primary);
      margin-bottom: 24px;
    }

    .welcome {
      font-size: 18px;
      color: var(--app-brand);
      margin-bottom: 12px;
    }

    .tip {
      font-size: 14px;
      color: var(--app-text-secondary);
    }
  }
}
</style>
