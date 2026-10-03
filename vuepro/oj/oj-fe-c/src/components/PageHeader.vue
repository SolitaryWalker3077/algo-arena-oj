<template>
  <header class="page-header">
    <div>
      <p v-if="eyebrow" class="page-eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <slot></slot>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.page-eyebrow { margin: 0 0 5px; color: #24b7ec; font-size: 11px; font-weight: 750; letter-spacing: .16em; }
h1 { margin: 0; color: #1d272d; font-size: clamp(24px, 2vw, 32px); letter-spacing: -.025em; }
.page-description { margin: 8px 0 0; color: #7b878e; font-size: 14px; line-height: 1.6; }
@media (max-width: 640px) { .page-header { align-items: flex-start; flex-direction: column; gap: 14px; } }
</style>

