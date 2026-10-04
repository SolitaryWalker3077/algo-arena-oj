<template>
  <main class="profile-page" aria-labelledby="profile-title">
    <PageHeader
      id="profile-title"
      eyebrow="PERSONAL PROFILE"
      title="个人中心"
      description="查看你的账号资料与个人信息。"
    >
      <button class="back-button" type="button" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </button>
    </PageHeader>

    <section class="profile-card" aria-live="polite" :aria-busy="loading">
      <div v-if="loading" class="profile-loading" role="status">
        <span class="sr-only">正在加载个人资料</span>
        <div class="loading-header">
          <el-skeleton-item variant="h1" class="loading-title" />
          <el-skeleton-item variant="text" class="loading-subtitle" />
        </div>
        <el-skeleton-item variant="circle" class="loading-avatar" />
        <div class="loading-list">
          <el-skeleton v-for="index in 7" :key="index" animated :rows="1" />
        </div>
      </div>

      <div v-else-if="errorMessage" class="profile-error" role="alert">
        <div class="error-icon" aria-hidden="true">!</div>
        <h2>个人资料加载失败</h2>
        <p>{{ errorMessage }}</p>
        <div class="error-actions">
          <button v-if="authExpired" class="primary-button" type="button" @click="goLogin">
            重新登录
          </button>
          <button v-else class="primary-button" type="button" @click="loadProfile">
            重新加载
          </button>
          <button class="secondary-button" type="button" @click="router.push({ name: 'home' })">
            返回首页
          </button>
        </div>
      </div>

      <template v-else-if="profile">
        <header class="card-heading">
          <div>
            <p class="card-eyebrow">PROFILE INFORMATION</p>
            <h2>基本信息</h2>
            <p class="card-description">你的个人资料与联系方式</p>
          </div>
          <span class="status-chip" :class="`is-${statusPresentation.tone}`">
            <i aria-hidden="true"></i>{{ statusPresentation.label }}
          </span>
        </header>

        <section class="avatar-section" aria-label="头像和昵称">
          <div class="avatar-frame">
            <img
              :src="profile.headImage || defaultAvatar"
              :alt="`${displayNickname}的头像`"
              @error="handleAvatarError"
            >
          </div>
          <div class="avatar-copy">
            <span>个人头像</span>
            <strong>{{ displayNickname }}</strong>
            <p>{{ displayValue(profile.introduce, '这个人很低调，还没有留下个人介绍。') }}</p>
          </div>
        </section>

        <dl class="profile-list">
          <div class="profile-row">
            <dt>昵称</dt>
            <dd :class="{ 'is-placeholder': !profile.nickName }">{{ displayNickname }}</dd>
          </div>
          <div class="profile-row">
            <dt>性别</dt>
            <dd :class="{ 'is-placeholder': profile.sex === null }">{{ getSexLabel(profile.sex) }}</dd>
          </div>
          <div class="profile-row">
            <dt>学校</dt>
            <dd :class="{ 'is-placeholder': !profile.schoolName }">{{ displayValue(profile.schoolName) }}</dd>
          </div>
          <div class="profile-row">
            <dt>专业</dt>
            <dd :class="{ 'is-placeholder': !profile.majorName }">{{ displayValue(profile.majorName) }}</dd>
          </div>
          <div class="profile-row">
            <dt>手机</dt>
            <dd :class="{ 'is-placeholder': !profile.phone }">{{ displayValue(profile.phone) }}</dd>
          </div>
          <div class="profile-row">
            <dt>常用邮箱</dt>
            <dd :class="{ 'is-placeholder': !profile.email }">{{ displayValue(profile.email) }}</dd>
          </div>
          <div class="profile-row">
            <dt>微信号</dt>
            <dd :class="{ 'is-placeholder': !profile.wechat }">{{ displayValue(profile.wechat) }}</dd>
          </div>
          <div class="profile-row profile-row-introduction">
            <dt>个人介绍</dt>
            <dd :class="{ 'is-placeholder': !profile.introduce }">
              {{ displayValue(profile.introduce, '暂未填写个人介绍') }}
            </dd>
          </div>
        </dl>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import defaultAvatar from '@/assets/user/head_image.png'
import { getUserDetailService } from '@/apis/user'
import {
  getDisplayNickname,
  getSexLabel,
  getStatusPresentation,
  normalizeUserProfile,
} from '@/utils/userProfile'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const profile = ref(null)
const errorMessage = ref('')
const authExpired = ref(false)
let controller

const displayNickname = computed(() => getDisplayNickname(profile.value?.nickName))
const statusPresentation = computed(() => getStatusPresentation(profile.value?.status))

function displayValue(value, fallback = '暂未填写') {
  return value || fallback
}

function isCanceledRequest(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError'
}

async function loadProfile() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  errorMessage.value = ''
  authExpired.value = false

  try {
    const result = await getUserDetailService({ signal: controller.signal })
    profile.value = normalizeUserProfile(result?.data)
  } catch (error) {
    if (isCanceledRequest(error)) return

    profile.value = null
    authExpired.value = error?.code === 3001
    if (authExpired.value) {
      errorMessage.value = '登录状态已过期，请重新登录后查看个人资料。'
    } else if (error?.code === 'INVALID_PROFILE_DATA') {
      errorMessage.value = '服务器返回的个人资料格式有误，请稍后重试或联系管理员。'
    } else {
      errorMessage.value = error?.message || '网络开小差了，请检查网络后重试。'
    }
  } finally {
    loading.value = false
  }
}

function handleAvatarError(event) {
  if (event.currentTarget.dataset.fallbackApplied) return
  event.currentTarget.dataset.fallbackApplied = 'true'
  event.currentTarget.src = defaultAvatar
}

function goLogin() {
  router.replace({ name: 'login', query: { redirect: route.fullPath } })
}

onMounted(loadProfile)
onBeforeUnmount(() => controller?.abort())
</script>

<style lang="scss" scoped>
.profile-page {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding: 36px 0 72px;
}

.back-button,
.primary-button,
.secondary-button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 17px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: border-color .2s ease, color .2s ease, background-color .2s ease, transform .2s ease;
}

.back-button,
.secondary-button {
  color: #62717a;
  border-color: #dfe7eb;
  background: #fff;
}

.back-button:hover,
.secondary-button:hover {
  color: #16aee8;
  border-color: #9ddff7;
  background: #f6fcff;
}

.profile-card {
  min-height: 520px;
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid #e7edf0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(35 62 75 / 6%);
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 36px 26px;
  border-bottom: 1px solid #edf1f3;
}

.card-eyebrow {
  margin: 0 0 5px;
  color: #27b9ee;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .13em;
}

.card-heading h2 {
  margin: 0;
  color: #25333a;
  font-size: 22px;
  letter-spacing: -.02em;
}

.card-description {
  margin: 7px 0 0;
  color: #8b979d;
  font-size: 12px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-chip i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-chip.is-normal { color: #258767; background: #eaf8f3; }
.status-chip.is-normal i { background: #2bc28f; box-shadow: 0 0 0 3px rgb(43 194 143 / 13%); }
.status-chip.is-blocked { color: #c75049; background: #fff0ef; }
.status-chip.is-blocked i { background: #e65e57; }
.status-chip.is-unknown { color: #718087; background: #eef2f4; }
.status-chip.is-unknown i { background: #96a2a8; }

.avatar-section {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 28px 36px;
  border-bottom: 1px solid #edf1f3;
  background: linear-gradient(115deg, #f7fcfe, #fff 58%);
}

.avatar-frame {
  width: 88px;
  height: 88px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 4px solid #fff;
  border-radius: 50%;
  background: #e9f6fb;
  box-shadow: 0 7px 22px rgb(35 87 109 / 14%);
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-copy {
  min-width: 0;
}

.avatar-copy > span {
  display: block;
  margin-bottom: 5px;
  color: #9aa5aa;
  font-size: 11px;
}

.avatar-copy strong {
  display: block;
  overflow: hidden;
  color: #26363e;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-copy p {
  max-width: 650px;
  margin: 9px 0 0;
  color: #748188;
  font-size: 12px;
  line-height: 1.6;
}

.profile-list {
  margin: 0;
  padding: 0 36px 10px;
}

.profile-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 24px;
  padding: 22px 0;
  border-bottom: 1px solid #edf1f3;
}

.profile-row:last-child {
  border-bottom: 0;
}

.profile-row dt {
  color: #34434b;
  font-size: 14px;
  font-weight: 650;
}

.profile-row dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: #596970;
  font-size: 14px;
  line-height: 1.6;
}

.profile-row dd.is-placeholder {
  color: #a6afb4;
}

.profile-row-introduction dd {
  white-space: pre-wrap;
}

.profile-loading {
  padding: 36px;
}

.loading-header {
  display: grid;
  gap: 10px;
  padding-bottom: 28px;
  border-bottom: 1px solid #edf1f3;
}

.loading-title { width: 150px; }
.loading-subtitle { width: 260px; max-width: 70%; }

.loading-avatar {
  width: 88px;
  height: 88px;
  margin: 28px 0;
}

.loading-list {
  display: grid;
  gap: 26px;
  padding-top: 12px;
  border-top: 1px solid #edf1f3;
}

.profile-error {
  display: flex;
  min-height: 518px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 48px 24px;
  text-align: center;
}

.error-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  color: #e65e57;
  background: #fff1f0;
  font-size: 26px;
  font-weight: 700;
}

.profile-error h2 {
  margin: 20px 0 8px;
  color: #293840;
  font-size: 20px;
}

.profile-error p {
  max-width: 480px;
  margin: 0;
  color: #7c8990;
  font-size: 14px;
  line-height: 1.7;
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.primary-button {
  min-width: 104px;
  color: #fff;
  border-color: #32c5ff;
  background: #32c5ff;
  box-shadow: 0 7px 16px rgb(50 197 255 / 20%);
}

.primary-button:hover {
  border-color: #1ab7f1;
  background: #1ab7f1;
  transform: translateY(-1px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 680px) {
  .profile-page { padding-top: 24px; }
  .profile-card { margin-top: 20px; border-radius: 13px; }
  .card-heading { align-items: flex-start; padding: 24px 20px 22px; }
  .card-heading h2 { font-size: 20px; }
  .avatar-section { gap: 16px; padding: 24px 20px; }
  .avatar-frame { width: 72px; height: 72px; }
  .avatar-copy strong { font-size: 18px; }
  .profile-list { padding: 0 20px 8px; }
  .profile-row { grid-template-columns: 100px minmax(0, 1fr); gap: 14px; padding: 19px 0; }
  .profile-loading { padding: 26px 20px; }
}

@media (max-width: 420px) {
  .card-heading { flex-direction: column; gap: 14px; }
  .avatar-section { align-items: flex-start; }
  .profile-row { grid-template-columns: 1fr; gap: 7px; }
  .error-actions { width: 100%; flex-direction: column; }
}
</style>
