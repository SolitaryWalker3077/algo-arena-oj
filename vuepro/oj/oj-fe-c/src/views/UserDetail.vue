<template>
  <main class="profile-page" aria-labelledby="profile-title">
    <PageHeader id="profile-title" eyebrow="PERSONAL PROFILE" title="个人中心" description="完善你的个人信息，让学习记录更有归属。">
      <div class="header-actions">
        <button v-if="!editing" class="edit-button" type="button" :disabled="loading" @click="startEditing">编辑资料</button>
        <button class="back-button" type="button" @click="router.back()">← 返回</button>
      </div>
    </PageHeader>

    <PreviewNotice v-if="previewMode" class="preview-banner" description="个人资料接口尚未开放，当前内容保存在页面预览中，不会写入服务器。" />

    <section class="profile-card">
      <div v-if="loading" class="profile-loading"><el-skeleton animated :rows="9" /></div>
      <form v-else @submit.prevent="saveProfile">
        <section class="avatar-section">
          <div class="avatar-wrap"><img :src="form.headImage || defaultAvatar" alt="个人头像"><span v-if="editing">更换</span><input v-if="editing" type="file" accept="image/png,image/jpeg,image/webp" aria-label="更换头像" @change="selectAvatar"></div>
          <div><h2>{{ form.nickName || '未设置昵称' }}</h2><p>支持 JPG、PNG 或 WebP，图片大小不超过 2 MB。</p></div>
          <span class="profile-status"><i></i>账号状态正常</span>
        </section>

        <div class="form-heading"><div><h2>基本信息</h2><p>这些信息仅用于完善你的个人主页。</p></div><span>{{ editing ? '编辑中' : '只读' }}</span></div>
        <div class="form-grid">
          <label><span>昵称 <b>*</b></span><input v-model.trim="form.nickName" :disabled="!editing" maxlength="12" placeholder="请输入昵称"><small v-if="errors.nickName">{{ errors.nickName }}</small></label>
          <fieldset><legend>性别</legend><div class="radio-row"><label><input v-model="form.sex" :disabled="!editing" type="radio" :value="1">男</label><label><input v-model="form.sex" :disabled="!editing" type="radio" :value="2">女</label><label><input v-model="form.sex" :disabled="!editing" type="radio" :value="0">不公开</label></div></fieldset>
          <label><span>学校</span><input v-model.trim="form.schoolName" :disabled="!editing" maxlength="40" placeholder="请输入学校名称"></label>
          <label><span>专业</span><input v-model.trim="form.majorName" :disabled="!editing" maxlength="40" placeholder="请输入专业名称"></label>
          <label><span>手机</span><input v-model.trim="form.phone" :disabled="!editing" maxlength="20" placeholder="请输入常用手机号"><small v-if="errors.phone">{{ errors.phone }}</small></label>
          <label><span>常用邮箱</span><input v-model.trim="form.email" :disabled="!editing" maxlength="60" placeholder="name@example.com"><small v-if="errors.email">{{ errors.email }}</small></label>
          <label class="wide"><span>微信号</span><input v-model.trim="form.wechat" :disabled="!editing" maxlength="30" placeholder="请输入微信号"></label>
          <label class="wide"><span>个人介绍</span><textarea v-model.trim="form.introduce" :disabled="!editing" maxlength="120" rows="4" placeholder="用一段话介绍自己"></textarea><em>{{ form.introduce?.length || 0 }}/120</em></label>
        </div>

        <footer v-if="editing" class="form-actions"><button class="cancel-button" type="button" :disabled="saving" @click="cancelEditing">取消</button><button class="save-button" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存资料' }}</button></footer>
      </form>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PreviewNotice from '@/components/PreviewNotice.vue'
import defaultAvatar from '@/assets/user/head_image.png'
import { editUserService, getUserDetailService } from '@/apis/user'
import { demoProfile } from '@/data/demoData'
import { withPreviewFallback } from '@/utils/previewFallback'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const previewMode = ref(false)
const form = reactive({})
const errors = reactive({ nickName: '', phone: '', email: '' })
let snapshot = {}
let avatarObjectUrl = ''
let controller

function applyProfile(profile) {
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, demoProfile, profile || {})
  form.sex = Number(form.sex ?? 0)
}

async function loadProfile() {
  controller = new AbortController()
  loading.value = true
  try {
    const result = await withPreviewFallback(() => getUserDetailService({ signal: controller.signal }), { data: demoProfile })
    previewMode.value = result.preview
    applyProfile(result.data?.data || result.data)
  } finally {
    loading.value = false
  }
}

function startEditing() {
  snapshot = { ...form }
  editing.value = true
}

function cancelEditing() {
  applyProfile(snapshot)
  editing.value = false
  clearErrors()
}

function clearErrors() {
  Object.keys(errors).forEach((key) => { errors[key] = '' })
}

function validate() {
  clearErrors()
  if (!form.nickName) errors.nickName = '请填写昵称'
  if (form.phone && !/^(?:1\d{10}|\d{3}\*{4}\d{4})$/.test(form.phone)) errors.phone = '请输入有效的手机号'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '请输入有效的邮箱地址'
  return !Object.values(errors).some(Boolean)
}

async function saveProfile() {
  if (!validate()) return
  saving.value = true
  try {
    if (!previewMode.value) {
      try {
        await editUserService({ ...form })
      } catch (error) {
        if (error?.code === 3001) throw error
        previewMode.value = true
      }
    }
    editing.value = false
    snapshot = { ...form }
    ElMessage.success(previewMode.value ? '资料已保存到当前预览' : '个人资料已更新')
  } finally {
    saving.value = false
  }
}

function selectAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像大小不能超过 2 MB')
    event.target.value = ''
    return
  }
  if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
  avatarObjectUrl = URL.createObjectURL(file)
  form.headImage = avatarObjectUrl
  previewMode.value = true
}

onMounted(loadProfile)
onBeforeUnmount(() => {
  controller?.abort()
  if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
})
</script>

<style lang="scss" scoped>
.profile-page { max-width: 1120px; margin: 0 auto; padding: 34px 0 70px; }.header-actions { display: flex; gap: 9px; }.edit-button, .back-button, .cancel-button, .save-button { height: 40px; padding: 0 17px; border-radius: 7px; font-size: 13px; cursor: pointer; }.edit-button, .save-button { color: #fff; background: #32c5ff; box-shadow: 0 6px 14px rgb(50 197 255 / 18%); }.back-button, .cancel-button { color: #68767d; border: 1px solid #dfe6e9; background: #fff; }.preview-banner { margin-top: 20px; }
.profile-card { margin-top: 22px; overflow: hidden; border: 1px solid #e9eff1; border-radius: 14px; background: #fff; box-shadow: 0 14px 38px rgb(39 67 81 / 5%); }.profile-loading { padding: 35px; }
.avatar-section { display: grid; grid-template-columns: 84px minmax(0, 1fr) auto; align-items: center; gap: 20px; padding: 28px 32px; border-bottom: 1px solid #edf1f3; background: linear-gradient(110deg, #f3fbfe, #fff 48%); }.avatar-wrap { position: relative; width: 82px; height: 82px; overflow: hidden; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 6px 20px rgb(55 93 109 / 13%); }.avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }.avatar-wrap span { position: absolute; right: 0; bottom: 0; left: 0; padding: 4px 0 6px; color: #fff; background: rgb(20 35 43 / 68%); font-size: 10px; text-align: center; }.avatar-wrap input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }.avatar-section h2 { margin: 0 0 6px; color: #26343b; font-size: 20px; }.avatar-section p { margin: 0; color: #8c979d; font-size: 12px; }.profile-status { display: flex; align-items: center; gap: 7px; color: #3e9b7c; font-size: 12px; }.profile-status i { width: 7px; height: 7px; border-radius: 50%; background: #2bc28f; box-shadow: 0 0 0 4px rgb(43 194 143 / 12%); }
.form-heading { display: flex; align-items: center; justify-content: space-between; padding: 26px 32px 6px; }.form-heading h2 { margin: 0; color: #28353c; font-size: 17px; }.form-heading p { margin: 5px 0 0; color: #9aa4aa; font-size: 12px; }.form-heading > span { padding: 4px 9px; border-radius: 10px; color: #859198; background: #f3f6f7; font-size: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 28px; padding: 22px 32px 30px; }.form-grid > label, fieldset { position: relative; min-width: 0; margin: 0; padding: 0; border: 0; }.form-grid label > span, legend { display: block; margin-bottom: 8px; color: #536169; font-size: 12px; font-weight: 600; }.form-grid label > span b { color: #ef6b65; }.form-grid input:not([type='radio']), textarea { width: 100%; border: 1px solid #e0e7ea; border-radius: 7px; outline: 0; color: #344249; background: #fff; font: inherit; transition: border-color .2s, box-shadow .2s; }.form-grid input:not([type='radio']) { height: 42px; padding: 0 12px; }.form-grid textarea { resize: vertical; min-height: 104px; padding: 11px 12px; line-height: 1.6; }.form-grid input:focus, textarea:focus { border-color: #63d0f6; box-shadow: 0 0 0 3px rgb(50 197 255 / 10%); }.form-grid input:disabled, textarea:disabled { color: #5f6c73; background: #f7f9fa; cursor: default; opacity: 1; }.form-grid small { position: absolute; bottom: -18px; left: 1px; color: #e65e57; font-size: 10px; }.form-grid em { position: absolute; right: 10px; bottom: 8px; color: #aab3b8; font-size: 10px; font-style: normal; }.wide { grid-column: 1 / -1; }.radio-row { display: flex; height: 42px; align-items: center; gap: 28px; border-bottom: 1px solid #edf0f2; }.radio-row label { display: flex; align-items: center; gap: 7px; color: #66747b; font-size: 13px; }.radio-row input { accent-color: #32c5ff; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 20px 32px; border-top: 1px solid #edf1f3; background: #fbfcfd; }.cancel-button, .save-button { min-width: 92px; }.save-button:disabled { opacity: .6; cursor: wait; }
@media (max-width: 680px) { .profile-page { padding-top: 24px; }.avatar-section { grid-template-columns: 70px 1fr; padding: 22px 18px; }.avatar-wrap { width: 68px; height: 68px; }.profile-status { grid-column: 2; }.form-heading { padding-right: 18px; padding-left: 18px; }.form-grid { grid-template-columns: 1fr; padding-right: 18px; padding-left: 18px; }.wide { grid-column: auto; }.form-actions { padding-right: 18px; padding-left: 18px; } }
</style>

