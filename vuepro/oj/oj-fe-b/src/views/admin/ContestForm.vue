<template>
  <div class="contest-form-page">
    <div class="form-head">
      <div>
        <h2>{{ isEdit ? '编辑竞赛' : '添加竞赛' }}</h2>
        <p>设置竞赛标题与开赛时间。新竞赛默认保存为未发布。</p>
      </div>
      <el-button @click="router.push({ name: 'contestManage' })">返回列表</el-button>
    </div>
    <div class="form-card">
      <el-alert
        title="当前后端只提供竞赛列表接口，暂无法保存竞赛"
        type="warning"
        show-icon
        :closable="false"
        class="form-alert"
      />
      <el-form :model="form" :rules="rules" label-width="100px">
        <el-form-item label="竞赛标题" prop="title"
          ><el-input
            v-model="form.title"
            maxlength="50"
            show-word-limit
            placeholder="请输入竞赛标题"
            aria-label="竞赛标题"
        /></el-form-item>
        <el-form-item label="开始时间" prop="startTime"
          ><el-date-picker
            v-model="form.startTime"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择开始时间"
            aria-label="竞赛开始时间"
        /></el-form-item>
        <el-form-item label="结束时间" prop="endTime"
          ><el-date-picker
            v-model="form.endTime"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择结束时间"
            aria-label="竞赛结束时间"
        /></el-form-item>
        <el-form-item
          ><el-tooltip content="后端尚未提供新增或编辑竞赛接口"
            ><span><el-button type="primary" disabled>保存竞赛</el-button></span></el-tooltip
          ><el-button @click="router.push({ name: 'contestManage' })">取消</el-button></el-form-item
        >
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name === 'contestEdit')
const form = reactive({ title: '', startTime: '', endTime: '' })
const rules = {
  title: [
    { required: true, whitespace: true, message: '请输入竞赛标题', trigger: 'blur' },
    { max: 50, message: '竞赛标题不能超过50个字符', trigger: 'blur' },
  ],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
}
</script>

<style lang="scss" scoped>
.contest-form-page {
  max-width: 800px;
  margin: 0 auto;
}
.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
h2 {
  margin: 0 0 4px;
  font-size: 20px;
  color: var(--app-text-primary);
}
p {
  margin: 0;
  color: var(--app-text-regular);
}
.form-card {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius);
  box-shadow: var(--app-shadow);
  padding: 28px;
  min-height: 280px;
}
.form-alert {
  margin-bottom: 16px;
}
:deep(.el-date-editor) {
  width: 260px;
}
@media (max-width: 767px) {
  .form-head {
    align-items: flex-start;
  }
  .form-card {
    padding: 16px 10px;
  }
  :deep(.el-date-editor) {
    width: 100%;
  }
}
</style>
