<template>
  <main class="login-page">
    <div class="orange" aria-hidden="true"></div>
    <div class="blue" aria-hidden="true"></div>
    <div class="blue small" aria-hidden="true"></div>

    <section class="login-box" aria-labelledby="login-title">
      <div class="logo-box">
        <img src="@/assets/logo.png" alt="OJ 竞技场">
        <div>
          <div class="sys-name">OJ竞技场</div>
          <div class="sys-sub-name">学习算法，提升技能</div>
        </div>
      </div>

      <div class="form-box-title">
        <h1 id="login-title">验证码登录</h1>
        <p>未注册手机号验证后将自动创建账号</p>
      </div>

      <form class="form-box" novalidate @submit.prevent>
        <div
          class="form-item"
          :class="{ 'is-error': showPhoneError, 'is-valid': showPhoneSuccess }"
        >
          <img src="@/assets/images/shouji.png" alt="" aria-hidden="true">
          <el-input
            :model-value="mobileForm.phone"
            type="tel"
            inputmode="numeric"
            autocomplete="tel"
            maxlength="11"
            aria-label="手机号"
            placeholder="请输入11位手机号"
            @update:model-value="handlePhoneInput"
            @blur="phoneTouched = true"
          />
          <span v-if="showPhoneError" class="field-message" role="alert">
            {{ phoneError }}
          </span>
        </div>

        <div
          class="form-item code-item"
          :class="{ 'is-error': showCodeError, 'is-valid': showCodeSuccess }"
        >
          <img src="@/assets/images/yanzhengma.png" alt="" aria-hidden="true">
          <el-input
            ref="codeInputRef"
            :model-value="mobileForm.code"
            class="code-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            aria-label="短信验证码"
            placeholder="请输入6位验证码"
            @update:model-value="handleCodeInput"
            @blur="codeTouched = true"
          />
          <button
            class="code-btn-box"
            type="button"
            :disabled="isSendingCode || countdown > 0"
            :aria-busy="isSendingCode"
            @click="getCode"
          >
            <span v-if="isSendingCode" class="mini-spinner" aria-hidden="true"></span>
            <span>{{ codeButtonText }}</span>
          </button>
          <span v-if="showCodeError" class="field-message code-message" role="alert">
            {{ codeError }}
          </span>
        </div>

        <div
          v-if="feedback.message"
          class="feedback"
          :class="`feedback--${feedback.type}`"
          :role="feedback.type === 'error' ? 'alert' : 'status'"
        >
          <span>{{ feedback.message }}</span>
          <button v-if="feedback.retryable" type="button" @click="retryLastAction">
            重试
          </button>
        </div>

        <button
          class="submit-box"
          type="button"
          :disabled="isSubmitting"
          :aria-busy="isSubmitting"
          @click="loginFun"
        >
          <span v-if="isSubmitting" class="submit-spinner" aria-hidden="true"></span>
          {{ submitButtonText }}
        </button>
      </form>

      <div class="gray-bot">
        <p>注册或登录代表您同意 <span>服务条款</span> 和 <span>隐私协议</span></p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { setToken } from '@/utils/cookie'
import { sendCodeService, codeLoginService } from '@/apis/user'
import { fetchCurrentUser, syncAuthentication, userState } from '@/stores/user'
import router from '@/router'

const PHONE_PATTERN = /^1[2-9]\d{9}$/
const CODE_PATTERN = /^\d{6}$/
const COUNTDOWN_SECONDS = 60

const mobileForm = reactive({ phone: '', code: '' })
const phoneTouched = ref(false)
const codeTouched = ref(false)
const submitAttempted = ref(false)
const isSendingCode = ref(false)
const isSubmitting = ref(false)
const countdown = ref(0)
const codeInputRef = ref(null)
const feedback = reactive({ type: 'info', message: '', retryable: false })

let countdownTimer
let countdownEndsAt = 0
let lastFailedAction = ''

const phoneError = computed(() => {
  if (!mobileForm.phone) return '请输入手机号'
  if (mobileForm.phone.length !== 11) return '手机号应为11位数字'
  if (!PHONE_PATTERN.test(mobileForm.phone)) return '请输入有效的中国大陆手机号'
  return ''
})

const codeError = computed(() => {
  if (!mobileForm.code) return '请输入验证码'
  if (!CODE_PATTERN.test(mobileForm.code)) return '验证码应为6位数字'
  return ''
})

const showPhoneError = computed(() => (
  Boolean(phoneError.value) && (phoneTouched.value || submitAttempted.value || mobileForm.phone.length > 0)
))
const showCodeError = computed(() => (
  Boolean(codeError.value) && (codeTouched.value || submitAttempted.value || mobileForm.code.length > 0)
))
const showPhoneSuccess = computed(() => phoneTouched.value && !phoneError.value)
const showCodeSuccess = computed(() => codeTouched.value && !codeError.value)
const codeButtonText = computed(() => {
  if (isSendingCode.value) return '发送中…'
  if (countdown.value > 0) return `${countdown.value}s 后可重发`
  return '获取验证码'
})
const submitButtonText = computed(() => {
  if (!isSubmitting.value) return '登录 / 注册'
  if (userState.isLoading) return '正在加载用户信息…'
  return '正在登录…'
})

function onlyDigits(value, maxLength) {
  return String(value ?? '').replace(/\D/g, '').slice(0, maxLength)
}

function handlePhoneInput(value) {
  mobileForm.phone = onlyDigits(value, 11)
  clearFeedback()
}

function handleCodeInput(value) {
  mobileForm.code = onlyDigits(value, 6)
  clearFeedback()
}

function clearFeedback() {
  feedback.message = ''
  feedback.retryable = false
  lastFailedAction = ''
}

function setFeedback(type, message, retryable = false, action = '') {
  feedback.type = type
  feedback.message = message
  feedback.retryable = retryable
  lastFailedAction = retryable ? action : ''
}

function updateCountdown() {
  const secondsLeft = Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000))
  countdown.value = secondsLeft
  if (secondsLeft === 0) {
    clearInterval(countdownTimer)
    countdownTimer = undefined
  }
}

function startCountdown() {
  clearInterval(countdownTimer)
  countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000
  countdown.value = COUNTDOWN_SECONDS
  countdownTimer = setInterval(updateCountdown, 500)
}

function validatePhone() {
  phoneTouched.value = true
  return !phoneError.value
}

function validateLoginForm() {
  submitAttempted.value = true
  phoneTouched.value = true
  codeTouched.value = true
  return !phoneError.value && !codeError.value
}

async function getCode() {
  if (isSendingCode.value || countdown.value > 0 || !validatePhone()) return
  isSendingCode.value = true
  clearFeedback()
  try {
    await sendCodeService({ phone: mobileForm.phone })
    startCountdown()
    setFeedback('success', '验证码已发送，5分钟内有效')
    await nextTick()
    codeInputRef.value?.focus()
  } catch (error) {
    setFeedback('error', error.message || '验证码发送失败，请稍后重试', Boolean(error.retryable), 'code')
  } finally {
    isSendingCode.value = false
  }
}

async function loginFun() {
  if (isSubmitting.value || !validateLoginForm()) return
  isSubmitting.value = true
  clearFeedback()
  try {
    const result = await codeLoginService({ phone: mobileForm.phone, code: mobileForm.code })
    setToken(result.data)
    syncAuthentication()
    try {
      await fetchCurrentUser({ force: true })
    } catch (error) {
      ElMessage.warning(`登录成功，但${error.message || '用户信息加载失败，请稍后重试'}`)
    }
    await router.replace({ name: 'home' })
  } catch (error) {
    setFeedback('error', error.message || '登录失败，请检查后重试', Boolean(error.retryable), 'login')
  } finally {
    isSubmitting.value = false
  }
}

function retryLastAction() {
  if (lastFailedAction === 'code') getCode()
  if (lastFailedAction === 'login') loginFun()
}

onBeforeUnmount(() => {
  clearInterval(countdownTimer)
})
</script>

<style lang="scss" scoped>
.login-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  min-width: 320px;
  min-height: 100dvh;
  padding: 24px;
  overflow: auto;
  background: #f7fafc;

  &::after {
    position: fixed;
    inset: 0;
    z-index: 1;
    background: rgba(255, 255, 255, 0.78);
    content: '';
    pointer-events: none;
  }
}

.login-box {
  position: relative;
  z-index: 2;
  width: min(600px, 100%);
  min-height: 604px;
  padding: 50px 72px 64px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(35, 75, 94, 0.12);
  backdrop-filter: blur(12px);
}

.logo-box {
  display: flex;
  align-items: center;

  img {
    width: 68px;
    height: 68px;
    margin-right: 16px;
  }
}

.sys-name {
  margin-bottom: 9px;
  color: #222;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.35;
}

.sys-sub-name {
  color: #5a6770;
  font-size: 15px;
  line-height: 1.4;
}

.form-box-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  min-height: 112px;
  padding-top: 43px;

  h1 {
    position: relative;
    margin: 0;
    color: #111;
    font-size: 24px;
    line-height: 1.4;
    letter-spacing: 1px;

    &::after {
      position: absolute;
      bottom: -11px;
      left: 0;
      width: 100%;
      height: 4px;
      background: #32c5ff;
      border-radius: 10px;
      content: '';
    }
  }

  p {
    margin: 0 0 3px 16px;
    color: #8a959c;
    font-size: 12px;
  }
}

.form-box {
  display: flex;
  flex-direction: column;
}

.form-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 50px;
  margin-bottom: 31px;
  background: #f7f9fa;
  border: 1px solid transparent;
  border-radius: 9px;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

  &:focus-within {
    background: #fff;
    border-color: #32c5ff;
    box-shadow: 0 0 0 3px rgba(50, 197, 255, 0.14);
  }

  &.is-error { border-color: #f56c6c; }
  &.is-valid:not(:focus-within) { border-color: #67c23a; }

  > img {
    width: 24px;
    height: 24px;
    margin: 0 18px;
  }

  :deep(.el-input) {
    flex: 1;
    min-width: 0;
    height: 48px;
    color: #222;
    font-size: 16px;
  }

  :deep(.el-input__wrapper) {
    padding: 0 14px 0 0;
    background: transparent;
    border: 0;
    box-shadow: none !important;
  }
}

.code-item { padding-right: 151px; }
.code-item .code-input { min-width: 0; }

.code-btn-box {
  position: absolute;
  top: -1px;
  right: -1px;
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  width: 151px;
  height: 50px;
  padding: 0 10px;
  color: #fff;
  font-size: 15px;
  background: #32c5ff;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;

  &:hover:not(:disabled) { background: #19afea; }

  &:disabled {
    background: #b9c8ce;
    cursor: not-allowed;
  }
}

.field-message {
  position: absolute;
  top: calc(100% + 5px);
  left: 1px;
  color: #e64d44;
  font-size: 13px;
  line-height: 18px;
}

.feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  margin: -2px 0 12px;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  line-height: 20px;

  button {
    flex: none;
    margin-left: 12px;
    color: inherit;
    font-weight: 600;
    border: 0;
    border-bottom: 1px solid currentColor;
    cursor: pointer;
  }
}

.feedback--success { color: #397922; background: #f0f9eb; }
.feedback--error { color: #b83b34; background: #fef0f0; }
.feedback--info { color: #47646f; background: #eef8fc; }

.submit-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-top: 18px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  background: #32c5ff;
  border: 0;
  border-radius: 9px;
  box-shadow: 0 8px 18px rgba(50, 197, 255, 0.22);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;

  &:hover:not(:disabled) {
    background: #19afea;
    box-shadow: 0 10px 22px rgba(50, 197, 255, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    background: #96dffb;
    cursor: wait;
  }
}

.mini-spinner,
.submit-spinner {
  width: 15px;
  height: 15px;
  margin-right: 8px;
  border: 2px solid rgba(255, 255, 255, 0.48);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.mini-spinner { width: 13px; height: 13px; margin-right: 0; }

.gray-bot {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 8px 20px;
  color: #667078;
  font-size: 13px;
  text-align: center;
  background: #fafafa;

  p { margin: 0; }
  span { color: #16aee9; cursor: pointer; }
}

.orange,
.blue {
  position: fixed;
  border-radius: 50%;
  filter: blur(55px);
  pointer-events: none;
}

.orange {
  top: 41%;
  left: 14.2%;
  width: 498px;
  height: 498px;
  background: #f0714a;
  opacity: 0.62;
}

.blue {
  top: 16.3%;
  left: 80.7%;
  width: 334px;
  height: 334px;
  background: #32c5ff;
  opacity: 0.62;

  &.small {
    top: 8.2%;
    left: 58.2%;
    width: 186px;
    height: 186px;
  }
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .login-page { align-items: start; padding: 18px 14px; }

  .login-box {
    min-height: min(600px, calc(100dvh - 36px));
    padding: 34px 24px 62px;
    border-radius: 14px;
  }

  .logo-box img { width: 56px; height: 56px; margin-right: 13px; }
  .sys-name { font-size: 21px; }
  .sys-sub-name { font-size: 13px; }

  .form-box-title {
    display: block;
    min-height: 112px;
    padding-top: 35px;

    h1 { width: max-content; font-size: 21px; }
    p { margin: 18px 0 0; }
  }

  .form-item > img { margin: 0 12px; }
  .code-item { padding-right: 126px; }
  .code-btn-box { width: 126px; font-size: 13px; }
  .submit-box { margin-top: 9px; }
}

@media (max-height: 660px) and (min-width: 641px) {
  .login-page { align-items: start; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
</style>
