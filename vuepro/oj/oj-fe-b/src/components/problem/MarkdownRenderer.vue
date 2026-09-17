<script setup lang="ts">
import { computed } from 'vue'
import 'highlight.js/styles/github-dark-dimmed.css'
import { renderMarkdown } from '@/utils/markdown'

const props = withDefaults(
  defineProps<{
    content?: string
    emptyText?: string
  }>(),
  {
    content: '',
    emptyText: '预览将在此处实时显示',
  },
)

const rendered = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-renderer">
    <div v-if="rendered.error" class="markdown-renderer__error" role="alert">
      {{ rendered.error }}
    </div>
    <div v-else-if="!rendered.html" class="markdown-renderer__empty">{{ emptyText }}</div>
    <!-- HTML has already been sanitized by renderMarkdown. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <article v-else class="markdown-body" v-html="rendered.html" />
  </div>
</template>

<style scoped>
.markdown-renderer {
  min-width: 0;
  color: var(--app-text-primary);
}

.markdown-renderer__empty,
.markdown-renderer__error {
  display: grid;
  min-height: 180px;
  place-items: center;
  padding: 24px;
  color: var(--app-text-secondary);
  text-align: center;
}

.markdown-renderer__error {
  color: var(--app-danger);
  background: color-mix(in srgb, var(--app-danger) 7%, transparent);
}

.markdown-body {
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.75;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 1.2em 0 0.55em;
  color: var(--app-text-primary);
  line-height: 1.35;
}

.markdown-body :deep(h1) {
  padding-bottom: 0.35em;
  border-bottom: 1px solid var(--app-border-color);
  font-size: 1.8em;
}

.markdown-body :deep(h2) {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--app-border-color);
  font-size: 1.45em;
}

.markdown-body :deep(h3) {
  font-size: 1.2em;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre),
.markdown-body :deep(table) {
  margin: 0.7em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.6em;
}

.markdown-body :deep(blockquote) {
  padding: 0.4em 0.9em;
  color: var(--app-text-regular);
  background: var(--app-hover-bg);
  border-left: 4px solid var(--app-brand);
}

.markdown-body :deep(code:not(.hljs)) {
  padding: 0.15em 0.35em;
  color: var(--app-danger);
  background: var(--app-hover-bg);
  border-radius: 4px;
  font-family: Consolas, 'Courier New', monospace;
}

.markdown-body :deep(pre) {
  overflow: auto;
  border-radius: 8px;
}

.markdown-body :deep(pre code.hljs) {
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.6;
}

.markdown-body :deep(a) {
  color: var(--app-brand);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px auto;
  border-radius: 8px;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 7px 10px;
  border: 1px solid var(--app-border-color);
}

.markdown-body :deep(th) {
  background: var(--app-hover-bg);
}

.markdown-body :deep(hr) {
  margin: 1.5em 0;
  border: 0;
  border-top: 1px solid var(--app-border-color);
}
</style>
