<template>
  <main class="profile-page" aria-labelledby="profile-title">
    <PageHeader
      id="profile-title"
      eyebrow="PERSONAL PROFILE"
      title="个人中心"
      description="查看并维护你的账号资料与个人信息。"
    >
      <button class="back-button" type="button" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </button>
    </PageHeader>

    <section class="profile-card" :class="{ 'is-editing': editing }" aria-live="polite" :aria-busy="loading || saving || avatarProcessing">
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
          <button v-if="authExpired" class="primary-button" type="button" @click="goLogin">重新登录</button>
          <button v-else class="primary-button" type="button" @click="loadProfile">重新加载</button>
          <button class="secondary-button" type="button" @click="router.push({ name: 'home' })">返回首页</button>
        </div>
      </div>

      <template v-else-if="profile">
        <header class="card-heading">
          <div>
            <p class="card-eyebrow">PROFILE INFORMATION</p>
            <h2>基本信息</h2>
            <p class="card-description">{{ editing ? '修改完成后请保存你的资料' : '你的个人资料与联系方式' }}</p>
          </div>
          <div class="card-heading-actions">
            <span class="status-chip" :class="`is-${statusPresentation.tone}`">
              <i aria-hidden="true"></i>{{ statusPresentation.label }}
            </span>
            <el-button v-if="!editing" class="edit-button" type="primary" round @click="startEditing">
              <el-icon><EditPen /></el-icon>
              编辑资料
            </el-button>
            <span v-else class="editing-badge"><el-icon><EditPen /></el-icon>编辑中</span>
          </div>
        </header>

        <section class="avatar-section" aria-label="头像和昵称">
          <div class="avatar-frame" :class="{ 'is-processing': avatarProcessing }">
            <img :key="avatarSource" :src="avatarSource" :alt="`${displayNickname}的头像`" @error="handleAvatarError">
            <span v-if="avatarProcessing" class="avatar-spinner" aria-label="正在压缩头像"></span>
          </div>
          <div class="avatar-copy">
            <span>个人头像</span>
            <strong>{{ displayNickname }}</strong>
            <p v-if="!editing">{{ displayValue(profile.introduce, '这个人很低调，还没有留下个人介绍。') }}</p>
            <template v-else>
              <div class="avatar-actions">
                <el-button class="upload-button" type="primary" plain round :disabled="avatarProcessing || saving" @click="chooseAvatar">
                  <el-icon><UploadFilled /></el-icon>
                  {{ avatarProcessing ? '正在压缩…' : avatarSaving ? '正在上传并更新…' : '上传头像' }}
                </el-button>
                <el-button v-if="form.headImage || avatarPreview" class="remove-avatar-button" round :disabled="avatarProcessing || saving" @click="removeAvatar">
                  <el-icon><RefreshLeft /></el-icon>
                  恢复默认头像
                </el-button>
              </div>
              <p class="avatar-hint">支持 JPG、JPEG、PNG、WebP，原图不超过 5 MB；选择后将自动压缩。</p>
              <p v-if="avatarNotice" class="avatar-notice">{{ avatarNotice }}</p>
              <p v-if="avatarError" class="field-error" role="alert">{{ avatarError }}</p>
              <input
                ref="fileInput"
                class="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                tabindex="-1"
                aria-hidden="true"
                @change="handleAvatarSelected"
              >
            </template>
          </div>
        </section>

        <dl class="profile-list">
          <div class="profile-row" :class="{ 'has-error': errors.nickName }">
            <dt><label for="profile-nickname">昵称</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-nickname"
                v-model="form.nickName"
                class="profile-input"
                type="text"
                :maxlength="PROFILE_FIELD_LIMITS.nickName"
                placeholder="未填写时显示 OJ用户"
                :aria-invalid="Boolean(errors.nickName)"
                :disabled="saving"
                @input="scheduleFieldValidation('nickName')"
                @blur="validateField('nickName')"
              >
              <p v-if="errors.nickName" class="field-error">{{ errors.nickName }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.nickName }">{{ displayNickname }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.sex }">
            <dt>性别</dt>
            <dd v-if="editing" class="form-control-wrap">
              <div class="radio-group" role="radiogroup" aria-label="性别">
                <label v-for="option in sexOptions" :key="option.value" class="radio-option">
                  <input v-model="form.sex" type="radio" name="profile-sex" :value="option.value" :disabled="saving">
                  <span>{{ option.label }}</span>
                </label>
              </div>
              <p v-if="errors.sex" class="field-error">{{ errors.sex }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': profile.sex === null }">{{ getSexLabel(profile.sex) }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.schoolName }">
            <dt><label for="profile-school">学校</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-school"
                v-model="form.schoolName"
                class="profile-input"
                type="text"
                :maxlength="PROFILE_FIELD_LIMITS.schoolName"
                placeholder="请输入学校名称"
                :aria-invalid="Boolean(errors.schoolName)"
                :disabled="saving"
                @input="scheduleFieldValidation('schoolName')"
                @blur="validateField('schoolName')"
              >
              <p v-if="errors.schoolName" class="field-error">{{ errors.schoolName }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.schoolName }">{{ displayValue(profile.schoolName) }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.majorName }">
            <dt><label for="profile-major">专业</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-major"
                v-model="form.majorName"
                class="profile-input"
                type="text"
                :maxlength="PROFILE_FIELD_LIMITS.majorName"
                placeholder="请输入专业名称"
                :aria-invalid="Boolean(errors.majorName)"
                :disabled="saving"
                @input="scheduleFieldValidation('majorName')"
                @blur="validateField('majorName')"
              >
              <p v-if="errors.majorName" class="field-error">{{ errors.majorName }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.majorName }">{{ displayValue(profile.majorName) }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.phone }">
            <dt><label for="profile-phone">手机</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-phone"
                v-model="form.phone"
                class="profile-input"
                type="tel"
                inputmode="numeric"
                :maxlength="PROFILE_FIELD_LIMITS.phone"
                placeholder="请输入 11 位手机号码"
                :aria-invalid="Boolean(errors.phone)"
                :disabled="saving"
                @input="scheduleFieldValidation('phone')"
                @blur="validateField('phone')"
              >
              <p v-if="errors.phone" class="field-error">{{ errors.phone }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.phone }">{{ displayValue(profile.phone) }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.email }">
            <dt><label for="profile-email">常用邮箱</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-email"
                v-model="form.email"
                class="profile-input"
                type="email"
                :maxlength="PROFILE_FIELD_LIMITS.email"
                placeholder="name@example.com"
                :aria-invalid="Boolean(errors.email)"
                :disabled="saving"
                @input="scheduleFieldValidation('email')"
                @blur="validateField('email')"
              >
              <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.email }">{{ displayValue(profile.email) }}</dd>
          </div>

          <div class="profile-row" :class="{ 'has-error': errors.wechat }">
            <dt><label for="profile-wechat">微信号</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <input
                id="profile-wechat"
                v-model="form.wechat"
                class="profile-input"
                type="text"
                :maxlength="PROFILE_FIELD_LIMITS.wechat"
                placeholder="请输入微信号"
                :aria-invalid="Boolean(errors.wechat)"
                :disabled="saving"
                @input="scheduleFieldValidation('wechat')"
                @blur="validateField('wechat')"
              >
              <p v-if="errors.wechat" class="field-error">{{ errors.wechat }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.wechat }">{{ displayValue(profile.wechat) }}</dd>
          </div>

          <div class="profile-row profile-row-introduction" :class="{ 'has-error': errors.introduce }">
            <dt><label for="profile-introduction">个人介绍</label></dt>
            <dd v-if="editing" class="form-control-wrap">
              <textarea
                id="profile-introduction"
                v-model="form.introduce"
                class="profile-textarea"
                :maxlength="PROFILE_FIELD_LIMITS.introduce"
                rows="4"
                placeholder="用一段话介绍自己"
                :aria-invalid="Boolean(errors.introduce)"
                :disabled="saving"
                @input="scheduleFieldValidation('introduce')"
                @blur="validateField('introduce')"
              ></textarea>
              <span class="character-count">{{ form.introduce.length }}/{{ PROFILE_FIELD_LIMITS.introduce }}</span>
              <p v-if="errors.introduce" class="field-error">{{ errors.introduce }}</p>
            </dd>
            <dd v-else :class="{ 'is-placeholder': !profile.introduce }">{{ displayValue(profile.introduce, '暂未填写个人介绍') }}</dd>
          </div>
        </dl>

        <Transition name="action-slide">
          <footer v-if="editing" class="form-footer">
            <div class="submit-feedback" aria-live="assertive">
              <p v-if="submitError" class="submit-error">{{ submitError }}</p>
              <p v-else>确认信息无误后保存，修改将同步到个人中心。</p>
            </div>
            <div class="form-actions">
              <el-button class="cancel-button" size="large" round :disabled="saving || avatarProcessing" @click="cancelEditing">
                <el-icon><Close /></el-icon>
                取消编辑
              </el-button>
              <el-button class="save-button" type="primary" size="large" round :loading="saving" :disabled="avatarProcessing" @click="saveProfile">
                <el-icon v-if="!saving"><Check /></el-icon>
                {{ saving ? (avatarSaving ? '正在更新头像…' : '正在保存…') : submitError ? '重新保存' : '保存资料' }}
              </el-button>
            </div>
          </footer>
        </Transition>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowLeft, Check, Close, EditPen, RefreshLeft, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import defaultAvatar from '@/assets/user/head_image.png'
import { editUserService, getUserDetailService, updateHeadImageService } from '@/apis/user'
import { updateCurrentUserProfile } from '@/stores/user'
import {
  getDisplayNickname,
  getSexLabel,
  getStatusPresentation,
  normalizeUserProfile,
} from '@/utils/userProfile'
import {
  createProfileForm,
  createProfileUpdatePayload,
  PROFILE_FIELD_LIMITS,
  validateProfileField,
  validateProfileForm,
} from '@/utils/profileForm'
import { compressAvatar } from '@/utils/profileImage'
import { uploadAvatarService } from '@/apis/file'
import { createAvatarSaveTask, resolveAvatarUrl } from '@/utils/avatarUpload'
import { getToken } from '@/utils/cookie'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const profile = ref(null)
const errorMessage = ref('')
const authExpired = ref(false)
const editing = ref(false)
const saving = ref(false)
const avatarProcessing = ref(false)
const avatarSaving = ref(false)
const avatarPreview = ref('')
let savedAvatarPreview = ''
let avatarSaveTask = null
let disposed = false
const avatarError = ref('')
const avatarNotice = ref('')
const submitError = ref('')
const fileInput = ref(null)
const form = reactive(createProfileForm())
const errors = reactive({})
const validationTimers = new Map()
const sexOptions = [
  { label: '不公开', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]
let controller

const currentNickname = computed(() => editing.value ? form.nickName : profile.value?.nickName)
const displayNickname = computed(() => getDisplayNickname(currentNickname.value))
const avatarSource = computed(() => {
  const source = editing.value ? form.headImage : profile.value?.headImage
  return avatarPreview.value || resolveAvatarUrl(source, import.meta.env.VITE_AVATAR_BASE_URL) || defaultAvatar
})
const statusPresentation = computed(() => getStatusPresentation(profile.value?.status))

function displayValue(value, fallback = '暂未填写') {
  return value || fallback
}

function isCanceledRequest(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError'
}

function assignForm(source) {
  Object.assign(form, createProfileForm(source))
}

function clearValidation() {
  validationTimers.forEach((timer) => window.clearTimeout(timer))
  validationTimers.clear()
  Object.keys(errors).forEach((field) => delete errors[field])
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
    assignForm(profile.value)
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

function startEditing() {
  assignForm(profile.value)
  avatarPreview.value = savedAvatarPreview
  avatarSaveTask = null
  clearValidation()
  avatarError.value = ''
  avatarNotice.value = ''
  submitError.value = ''
  editing.value = true
}

function cancelEditing() {
  if (saving.value || avatarProcessing.value) return
  assignForm(profile.value)
  avatarPreview.value = savedAvatarPreview
  avatarSaveTask = null
  clearValidation()
  avatarError.value = ''
  avatarNotice.value = ''
  submitError.value = ''
  editing.value = false
}

function validateField(field) {
  const message = validateProfileField(field, form[field])
  if (message) errors[field] = message
  else delete errors[field]
  return !message
}

function scheduleFieldValidation(field) {
  const currentTimer = validationTimers.get(field)
  if (currentTimer) window.clearTimeout(currentTimer)
  validationTimers.set(field, window.setTimeout(() => {
    validateField(field)
    validationTimers.delete(field)
  }, 250))
  if (submitError.value) submitError.value = ''
}

async function saveProfile() {
  if (saving.value || avatarProcessing.value) return
  clearValidation()
  const validationErrors = validateProfileForm(form)
  Object.assign(errors, validationErrors)
  if (Object.keys(validationErrors).length) {
    submitError.value = '请先修正表单中标记的内容，再重新保存。'
    ElMessage.warning('请检查填写内容')
    return
  }

  saving.value = true
  submitError.value = ''
  let avatarStage = Boolean(avatarSaveTask || form.headImage !== profile.value.headImage)
  try {
    if (!getToken()) throw new Error('请先登录后重试')
    if (avatarStage) {
      avatarSaving.value = true
      let name = form.headImage
      if (avatarSaveTask) name = await avatarSaveTask()
      else await updateHeadImageService({ headImage: name })
      if (disposed) return
      form.headImage = name
      profile.value.headImage = name
      savedAvatarPreview = avatarPreview.value
      updateCurrentUserProfile({ headImage: avatarPreview.value || name })
      avatarSaveTask = null
      avatarSaving.value = false
      avatarStage = false
      ElMessage.success('更新头像成功')
    }
    const payload = createProfileUpdatePayload(form)
    delete payload.headImage
    const previous = createProfileUpdatePayload(profile.value)
    if (Object.keys(payload).some((key) => payload[key] !== previous[key])) {
      await editUserService(payload)
      if (disposed) return
      profile.value = { ...profile.value, ...payload }
      updateCurrentUserProfile({ nickName: payload.nickName })
      ElMessage.success('个人资料已更新')
    }
    editing.value = false
    avatarNotice.value = ''
  } catch (error) {
    if (disposed) return
    submitError.value = avatarStage
      ? '上传头像失败：' + (error?.message || '请检查网络后重试') + '。可点击“重新保存”重试。'
      : error?.message || '保存失败，请检查网络后重试。'
    if (avatarStage) ElMessage.error('上传头像失败')
  } finally {
    saving.value = false
    avatarSaving.value = false
  }
}

function chooseAvatar() {
  if (!avatarProcessing.value && !saving.value) fileInput.value?.click()
}

async function handleAvatarSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || saving.value || avatarProcessing.value) return

  avatarProcessing.value = true
  avatarError.value = ''
  avatarNotice.value = ''
  try {
    const result = await compressAvatar(file)
    if (disposed) return
    avatarPreview.value = result.dataUrl
    avatarSaveTask = createAvatarSaveTask(result.file, { upload: uploadAvatarService, update: updateHeadImageService })
    const savedPercent = result.originalSize
      ? Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100))
      : 0
    avatarNotice.value = savedPercent > 0
      ? `头像已压缩 ${savedPercent}%，保存资料后生效。`
      : '头像预览已更新，保存资料后生效。'
    submitError.value = ''
  } catch (error) {
    avatarError.value = error?.message || '头像处理失败，请重新选择图片。'
  } finally {
    avatarProcessing.value = false
  }
}

function removeAvatar() {
  if (saving.value || avatarProcessing.value) return
  avatarPreview.value = ''
  avatarSaveTask = null
  form.headImage = ''
  avatarError.value = ''
  avatarNotice.value = '已选择默认头像，保存资料后生效。'
  submitError.value = ''
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
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  validationTimers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<style lang="scss" scoped>
.profile-page {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding: 36px 0 72px;
}

.back-button,
.primary-button,
.secondary-button,
.edit-button,
.upload-button,
.remove-avatar-button,
.cancel-button,
.save-button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 17px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: border-color .2s ease, color .2s ease, background-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.back-button,
.secondary-button,
.cancel-button,
.remove-avatar-button {
  color: #62717a;
  border-color: #dfe7eb;
  background: #fff;
}

.back-button:hover,
.secondary-button:hover,
.cancel-button:hover,
.remove-avatar-button:hover {
  color: #16aee8;
  border-color: #9ddff7;
  background: #f6fcff;
}

button:disabled {
  cursor: not-allowed;
  opacity: .58;
  transform: none !important;
}

.profile-card {
  min-height: 520px;
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid #e7edf0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 40px rgb(35 62 75 / 6%);
  transition: border-color .25s ease, box-shadow .25s ease;
}

.profile-card.is-editing {
  border-color: #b9e9fa;
  box-shadow: 0 18px 46px rgb(35 126 160 / 9%);
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

.card-heading-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-chip,
.editing-badge {
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
.editing-badge {
  height: 34px;
  padding: 0 13px;
  color: #158ebd;
  border: 1px solid #a7e5fa;
  background: #edfaff;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 65%);
}

.edit-button,
.primary-button,
.save-button {
  color: #fff;
  border-color: #32c5ff;
  background: #32c5ff;
  box-shadow: 0 7px 16px rgb(50 197 255 / 18%);
}

.edit-button:hover,
.primary-button:hover,
.save-button:hover {
  border-color: #1ab7f1;
  background: #1ab7f1;
  transform: translateY(-1px);
}

:deep(.el-button.edit-button) {
  min-width: 118px;
  height: 42px;
  margin: 0;
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #42cbff, #20afe9);
  box-shadow: 0 8px 18px rgb(36 181 235 / 24%);
  letter-spacing: .01em;
}

:deep(.el-button.edit-button:hover),
:deep(.el-button.edit-button:focus-visible) {
  color: #fff;
  background: linear-gradient(135deg, #25c2fb, #129fda);
  box-shadow: 0 10px 22px rgb(30 170 224 / 30%);
  transform: translateY(-1px);
}

:deep(.el-button.edit-button:active) {
  transform: translateY(0);
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 28px 36px;
  border-bottom: 1px solid #edf1f3;
  background: linear-gradient(115deg, #f7fcfe, #fff 58%);
}

.avatar-frame {
  position: relative;
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
  transition: filter .2s ease, opacity .2s ease;
}

.avatar-frame.is-processing img { filter: blur(2px); opacity: .55; }

.avatar-spinner,
.button-spinner {
  border: 2px solid rgb(255 255 255 / 45%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.avatar-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px;
}

.button-spinner { width: 15px; height: 15px; }

.avatar-copy { min-width: 0; }
.avatar-copy > span { display: block; margin-bottom: 5px; color: #9aa5aa; font-size: 11px; }
.avatar-copy strong { display: block; overflow: hidden; color: #26363e; font-size: 20px; text-overflow: ellipsis; white-space: nowrap; }
.avatar-copy p { max-width: 650px; margin: 8px 0 0; color: #748188; font-size: 12px; line-height: 1.6; }
.avatar-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 11px; }
.avatar-actions :deep(.el-button + .el-button),
.form-actions :deep(.el-button + .el-button) { margin-left: 0; }

:deep(.el-button.upload-button),
:deep(.el-button.remove-avatar-button) {
  height: 38px;
  margin: 0;
  padding: 0 16px;
  font-weight: 600;
}

:deep(.el-button.upload-button) {
  --el-button-text-color: #159bcf;
  --el-button-border-color: #8edcf7;
  --el-button-bg-color: #effaff;
  --el-button-hover-text-color: #fff;
  --el-button-hover-border-color: #2ab9ed;
  --el-button-hover-bg-color: #2ab9ed;
  box-shadow: 0 5px 12px rgb(46 185 236 / 10%);
}

:deep(.el-button.remove-avatar-button) {
  --el-button-text-color: #697980;
  --el-button-border-color: #dce5e9;
  --el-button-bg-color: #fff;
  --el-button-hover-text-color: #159bcf;
  --el-button-hover-border-color: #9bdff6;
  --el-button-hover-bg-color: #f3fbfe;
}
.avatar-copy .avatar-hint { color: #9aa4a9; }
.avatar-copy .avatar-notice { color: #27886c; }
.file-input { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }

.profile-list { margin: 0; padding: 0 36px 10px; }
.profile-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: start; gap: 24px; padding: 20px 0; border-bottom: 1px solid #edf1f3; transition: background-color .2s ease; }
.profile-row:last-child { border-bottom: 0; }
.profile-row dt { padding-top: 10px; color: #34434b; font-size: 14px; font-weight: 650; }
.profile-row dd { min-width: 0; margin: 0; padding-top: 10px; overflow-wrap: anywhere; color: #596970; font-size: 14px; line-height: 1.6; }
.profile-row dd.is-placeholder { color: #a6afb4; }
.profile-row-introduction dd { white-space: pre-wrap; }
.profile-row.has-error { background: linear-gradient(90deg, transparent, rgb(230 94 87 / 3%), transparent); }

.form-control-wrap {
  position: relative;
  width: min(560px, 100%);
  padding-top: 0 !important;
}

.profile-input,
.profile-textarea {
  width: 100%;
  border: 1px solid #dfe7ea;
  border-radius: 8px;
  outline: 0;
  color: #33434b;
  background: #fff;
  font: inherit;
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}

.profile-input { height: 42px; padding: 0 13px; }
.profile-textarea { min-height: 108px; padding: 11px 13px 28px; resize: vertical; line-height: 1.65; }
.profile-input::placeholder, .profile-textarea::placeholder { color: #aeb7bb; }
.profile-input:focus, .profile-textarea:focus { border-color: #5fcdf5; box-shadow: 0 0 0 3px rgb(50 197 255 / 11%); }
.profile-input[aria-invalid='true'], .profile-textarea[aria-invalid='true'] { border-color: #ed827d; box-shadow: 0 0 0 3px rgb(230 94 87 / 8%); }
.profile-input:disabled, .profile-textarea:disabled { background: #f5f7f8; }

.radio-group { display: flex; flex-wrap: wrap; gap: 10px; }
.radio-option { position: relative; cursor: pointer; }
.radio-option input { position: absolute; opacity: 0; pointer-events: none; }
.radio-option span { display: inline-flex; min-width: 72px; height: 40px; align-items: center; justify-content: center; border: 1px solid #dfe7ea; border-radius: 8px; color: #69777e; background: #fff; transition: all .2s ease; }
.radio-option input:checked + span { color: #148fbf; border-color: #79d5f5; background: #effaff; box-shadow: 0 0 0 3px rgb(50 197 255 / 8%); }
.radio-option input:focus-visible + span { outline: 2px solid rgb(50 197 255 / 70%); outline-offset: 2px; }
.radio-option input:disabled + span { cursor: not-allowed; opacity: .58; }

.field-error { margin: 7px 0 0 !important; color: #dc5b55 !important; font-size: 11px !important; line-height: 1.45 !important; }
.character-count { position: absolute; right: 11px; bottom: 8px; color: #9ba7ac; font-size: 10px; }

.form-footer {
  position: sticky;
  z-index: 3;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 36px;
  border-top: 1px solid #e7eef1;
  background: rgb(250 252 253 / 96%);
  box-shadow: 0 -9px 24px rgb(42 72 85 / 5%);
  backdrop-filter: blur(10px);
}

.submit-feedback { min-width: 0; }
.submit-feedback p { margin: 0; color: #8b979d; font-size: 12px; line-height: 1.55; }
.submit-feedback .submit-error { color: #d75550; }
.form-actions { display: flex; flex: 0 0 auto; gap: 10px; }

:deep(.el-button.cancel-button),
:deep(.el-button.save-button) {
  min-width: 118px;
  height: 44px;
  margin: 0;
  padding: 0 21px;
  font-weight: 650;
}

:deep(.el-button.cancel-button) {
  --el-button-text-color: #65747b;
  --el-button-border-color: #d9e3e7;
  --el-button-bg-color: #fff;
  --el-button-hover-text-color: #1a9fd2;
  --el-button-hover-border-color: #99dff7;
  --el-button-hover-bg-color: #f3fbfe;
}

:deep(.el-button.save-button) {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #43ccff, #1eaee8);
  box-shadow: 0 8px 18px rgb(35 181 235 / 25%);
}

:deep(.el-button.save-button:hover),
:deep(.el-button.save-button:focus-visible) {
  color: #fff;
  background: linear-gradient(135deg, #28c3fb, #119ed9);
  box-shadow: 0 10px 22px rgb(30 170 224 / 30%);
  transform: translateY(-1px);
}

:deep(.el-button.save-button.is-loading),
:deep(.el-button.save-button.is-disabled) {
  color: #fff;
  background: linear-gradient(135deg, #8cddfb, #72ccec);
  box-shadow: none;
}

.profile-loading { padding: 36px; }
.loading-header { display: grid; gap: 10px; padding-bottom: 28px; border-bottom: 1px solid #edf1f3; }
.loading-title { width: 150px; }
.loading-subtitle { width: 260px; max-width: 70%; }
.loading-avatar { width: 88px; height: 88px; margin: 28px 0; }
.loading-list { display: grid; gap: 26px; padding-top: 12px; border-top: 1px solid #edf1f3; }

.profile-error { display: flex; min-height: 518px; align-items: center; justify-content: center; flex-direction: column; padding: 48px 24px; text-align: center; }
.error-icon { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 50%; color: #e65e57; background: #fff1f0; font-size: 26px; font-weight: 700; }
.profile-error h2 { margin: 20px 0 8px; color: #293840; font-size: 20px; }
.profile-error p { max-width: 480px; margin: 0; color: #7c8990; font-size: 14px; line-height: 1.7; }
.error-actions { display: flex; gap: 10px; margin-top: 24px; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
.action-slide-enter-active, .action-slide-leave-active { transition: opacity .2s ease, transform .2s ease; }
.action-slide-enter-from, .action-slide-leave-to { opacity: 0; transform: translateY(6px); }

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 680px) {
  .profile-page { padding-top: 24px; }
  .profile-card { margin-top: 20px; border-radius: 13px; }
  .card-heading { align-items: flex-start; padding: 24px 20px 22px; }
  .card-heading h2 { font-size: 20px; }
  .card-heading-actions { align-items: flex-end; flex-direction: column; gap: 8px; }
  .avatar-section { align-items: flex-start; gap: 16px; padding: 24px 20px; }
  .avatar-frame { width: 72px; height: 72px; }
  .avatar-copy strong { font-size: 18px; }
  .profile-list { padding: 0 20px 8px; }
  .profile-row { grid-template-columns: 100px minmax(0, 1fr); gap: 14px; padding: 18px 0; }
  .profile-loading { padding: 26px 20px; }
  .form-footer { align-items: stretch; flex-direction: column; padding: 18px 20px; }
  .form-actions { justify-content: flex-end; }
}

@media (max-width: 480px) {
  .card-heading { flex-direction: column; gap: 16px; }
  .card-heading-actions { width: 100%; align-items: center; justify-content: space-between; flex-direction: row; }
  .avatar-section { flex-direction: column; }
  .profile-row { grid-template-columns: 1fr; gap: 7px; }
  .profile-row dt { padding-top: 0; }
  .form-control-wrap { width: 100%; }
  .error-actions, .form-actions { width: 100%; }
  .error-actions { flex-direction: column; }
  .form-actions > button { flex: 1; }
}
</style>
