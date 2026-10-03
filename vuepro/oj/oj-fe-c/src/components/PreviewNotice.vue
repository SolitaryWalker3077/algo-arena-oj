<template>
  <div class="preview-notice" role="status">
    <span class="preview-dot" aria-hidden="true"></span>
    <div>
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '界面预览模式' },
  description: {
    type: String,
    default: '对应后端接口尚未开放，当前展示演示数据；接口就绪后无需改动页面结构。',
  },
})
</script>

<style scoped>
.preview-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid #ccecf8;
  border-radius: 10px;
  color: #4f6670;
  background: #f1fbff;
  font-size: 13px;
  line-height: 1.55;
}
.preview-notice div { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px 10px; }
.preview-notice strong { color: #178caf; font-weight: 650; }
.preview-dot { width: 7px; height: 7px; flex: 0 0 7px; margin-top: 7px; border-radius: 50%; background: #32c5ff; box-shadow: 0 0 0 4px rgb(50 197 255 / 13%); }
</style>

