<script setup lang="ts">
defineProps<{
  message?: string
  help?: string
}>()
</script>

<template>
  <div class="field-message" aria-live="polite">
    <p v-if="message" class="field-message__error" role="alert">{{ message }}</p>
    <p v-else-if="help" class="field-message__help">{{ help }}</p>
  </div>
</template>

<style scoped>
.field-message {
  min-height: 20px;
  padding-top: 4px;
}

.field-message p {
  margin: 0;
  font-size: 12px;
  line-height: 16px;
}

.field-message__error {
  color: var(--app-danger);
}

.field-message__help {
  color: var(--app-text-secondary);
}
</style>
