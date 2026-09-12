<!-- <template>标签里: 模版视图 -->
<template>
  <div class="login-page">
    <ThemeToggle class="login-theme-toggle" />
    <div class="orange"></div>
    <div class="blue"></div>
    <div class="blue small"></div>
    <div class="login-box">
      <div class="logo-box">
        <div class="right">
          <div class="sys-name">OJ后台管理</div>
          <div class="sys-sub-name">学习算法，提升技能</div>
        </div>
      </div>
      <div class="form-box">
        <div class="form-item">
          <img src="../assets/images/shouji.png">
          <el-input v-model="loginForm.userAccount" placeholder="请输入账号" />
        </div>
        <div class="form-item">
          <img src="../assets/images/yanzhengma.png">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="login"
          />
        </div>
        <div
          class="submit-box"
          :class="{ disabled: loading }"
          role="button"
          tabindex="0"
          @click="login"
          @keyup.enter="login"
        >
          {{ loading ? '登录中...' : '登录' }}
        </div>
      </div>
    </div>
  </div>
</template>

<!-- <script setup>标签里: 页面逻辑 -->
<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { userLogin } from '@/api/suser'
import { ACCOUNT_KEY, setToken } from '@/utils/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()

// 登录表单数据
const loginForm = reactive({
  userAccount: '',
  password: '',
})

// 【调试用】把表单数据暴露到全局 window，方便在浏览器 Console 里直接修改，
// 验证“Vue 数据变化 -> 输入框内容同步更新”的反向绑定效果。
// 用法：在 Console 输入  window.loginForm.userAccount = '测试账号'  看输入框是否变化。
if (typeof window !== 'undefined') {
  window.loginForm = loginForm
  console.log('[双向绑定调试] loginForm 已挂载到 window.loginForm，可在 Console 直接修改验证反向绑定。')
}

// 【调试用】监听表单数据变化，每次输入框内容变化时延迟 1000ms 打印到 Console，
// 验证“输入框内容变化 -> Vue 数据自动更新”的正向绑定效果。
watch(
  loginForm,
  (newVal) => {
    setTimeout(() => {
      console.log('[watch] loginForm 发生变化（延迟 1000ms）：', {
        userAccount: newVal.userAccount,
        password: newVal.password,
      })
    }, 1000)
  },
  { deep: true },
)

// 登录请求中（防止重复提交）
const loading = ref(false)

// 登录：校验输入 -> 调用后端接口 -> 成功跳转后台 / 失败提示错误
const login = async () => {
  if (loading.value) return

  const userAccount = loginForm.userAccount.trim()
  if (!userAccount) {
    ElMessage.warning('请输入账号')
    return
  }
  if (!loginForm.password) {
    ElMessage.warning('请输入密码')
    return
  }
  loading.value = true
  try {
    const token = await userLogin({
      userAccount,
      password: loginForm.password,
    })
    setToken(token)
    localStorage.setItem(ACCOUNT_KEY, userAccount)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/home'
    router.replace(redirect)
  } catch (error) {
    // 登录失败：错误提示已由 request 拦截器统一弹出（账号密码错误/网络异常等）
    if (!error?.handled) ElMessage.error(error?.message || '登录失败，请稍后重试')
    console.error('登录失败：', error)
  } finally {
    loading.value = false
  }
}
</script>

<!-- <style scoped>标签里: 页面样式 -->
<style lang="scss" scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100vh;
    background: var(--login-overlay);
    z-index: 1;
    content: '';
  }

  .orange {
    position: absolute;
    left: 14.2%;
    top: 41%;
    width: 498px;
    height: 498px;
    border-radius: 50%;
    background: #F0714A;
    opacity: 0.67;
    filter: blur(50px);
  }

  .blue {
    position: absolute;
    left: 80.7%;
    top: 16.3%;
    width: 334px;
    height: 334px;
    background: #32C5FF;
    opacity: 0.67;
    filter: blur(50px);

    &.small {
      width: 186px;
      height: 186px;
      top: 8.2%;
      left: 58.2%;
    }
  }

  .login-box {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    width: 456px;
    height: 404px;
    padding: 0 72px;
    padding-top: 50px;
    background: var(--app-card-bg);
    box-shadow: var(--app-shadow-strong);
    border: 1px solid var(--app-border-color);
    border-radius: 10px;
    opacity: 0.9;
    overflow: hidden;

    .logo-box {
      display: flex;
      align-items: center;
      margin-bottom: 30px;

      img {
        width: 68px;
        height: 68px;
        margin-right: 16px;
      }

      .sys-name {
        height: 33px;
        margin-bottom: 13px;
        font-family: PingFangSC, PingFang SC;
        font-weight: 600;
        font-size: 24px;
        line-height: 33px;
        color: var(--app-text-primary);
      }

      .sys-sub-name {
        height: 22px;
        font-family: PingFangSC, PingFang SC;
        font-weight: 400;
        font-size: 16px;
        line-height: 22px;
        color: var(--app-text-primary);
      }
    }

    :deep(.form-box) {
      .form-item {
        position: relative;
        display: flex;
        align-items: center;
        width: 456px;
        height: 48px;
        margin-bottom: 30px;
        background: var(--app-input-bg);
        border-radius: 8px;

        .code-btn-box {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 151px;
          height: 48px;
          background: var(--app-brand);
          border-radius: 8px;
          cursor: pointer;

          span {
            font-family: PingFangSC, PingFang SC;
            font-weight: 400;
            font-size: 16px;
            color: #FFFFFF;
          }
        }

        .error-tip {
          position: absolute;
          right: 0;
          width: 140px;
          height: 20px;
          padding-right: 12px;
          font-family: PingFangSC, PingFang SC;
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;
          text-align: right;
          color: var(--app-danger);

          &.bottom {
            right: 157px;
          }
        }

        .el-input {
          width: 380px;
          font-family: PingFangSC, PingFang SC;
          font-weight: 400;
          font-size: 16px;
          color: var(--app-text-primary);
        }

        .el-input__wrapper {
          width: 230px;
          padding-left: 0;
          border: none;
          box-shadow: none;
          background: transparent;
        }

        img {
          width: 24px;
          height: 24px;
          margin: 0 18px;
        }
      }

      .submit-box {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 456px;
        height: 48px;
        margin-top: 90px;
        background: var(--app-brand);
        border-radius: 8px;
        cursor: pointer;
        font-family: PingFangSC, PingFang SC;
        font-weight: 600;
        font-size: 16px;
        color: #FFFFFF;
        letter-spacing: 1px;

        &.disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
      }
    }
  }
}

/* 主题切换：固定在登录页右上角，层级高于遮罩与登录卡片 */
.login-theme-toggle {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 10;
}
</style>
