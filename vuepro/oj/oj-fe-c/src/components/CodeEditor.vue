<template>
  <section class="code-editor" aria-label="代码编辑器">
    <header class="editor-toolbar">
      <div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <label>
        <span class="sr-only">编程语言</span>
        <select v-model="language" :disabled="readonly">
          <option value="java">Java 17</option>
          <option value="cpp" disabled>C++（即将支持）</option>
          <option value="python" disabled>Python（即将支持）</option>
        </select>
      </label>
      <span class="editor-file">Main.java</span>
    </header>
    <div class="editor-body">
      <pre ref="lineNumbers" class="line-numbers" aria-hidden="true">{{ lines }}</pre>
      <textarea
        ref="textarea"
        :value="modelValue"
        :readonly="readonly"
        spellcheck="false"
        aria-label="Java 代码"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown.tab.prevent="insertTab"
        @scroll="syncScroll"
      ></textarea>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const textarea = ref(null)
const lineNumbers = ref(null)
const language = ref('java')
const lines = computed(() => Array.from(
  { length: Math.max(1, props.modelValue.split('\n').length) },
  (_, index) => index + 1,
).join('\n'))

function insertTab(event) {
  const target = event.target
  const start = target.selectionStart
  const end = target.selectionEnd
  const value = `${props.modelValue.slice(0, start)}    ${props.modelValue.slice(end)}`
  emit('update:modelValue', value)
  requestAnimationFrame(() => {
    target.selectionStart = target.selectionEnd = start + 4
  })
}

function syncScroll(event) {
  if (lineNumbers.value) lineNumbers.value.scrollTop = event.target.scrollTop
}
</script>

<style scoped>
.code-editor { height: 100%; min-height: 420px; overflow: hidden; border: 1px solid #e6edf0; border-radius: 12px; background: #fff; }
.editor-toolbar { display: flex; height: 48px; align-items: center; gap: 14px; padding: 0 16px; border-bottom: 1px solid #edf1f3; background: #f8fafb; }
.window-dots { display: flex; gap: 6px; }
.window-dots i { width: 8px; height: 8px; border-radius: 50%; background: #d6dde1; }
.window-dots i:first-child { background: #ff8a7a; }
.window-dots i:nth-child(2) { background: #ffd16d; }
.window-dots i:last-child { background: #62d7a3; }
select { height: 30px; padding: 0 28px 0 10px; border: 1px solid #dfe7eb; border-radius: 6px; color: #52616a; background: #fff; font: inherit; }
.editor-file { margin-left: auto; color: #9aa4aa; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
.editor-body { display: grid; height: calc(100% - 48px); min-height: 370px; grid-template-columns: 48px minmax(0, 1fr); }
.line-numbers { height: 100%; margin: 0; padding: 17px 10px; overflow: hidden; color: #adb8be; background: #fbfcfd; font: 14px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace; text-align: right; user-select: none; }
textarea { width: 100%; height: 100%; min-height: 370px; resize: none; padding: 17px 18px; border: 0; outline: 0; color: #25343c; background: #fff; font: 14px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace; tab-size: 4; white-space: pre; }
textarea:focus { box-shadow: inset 0 0 0 2px rgb(50 197 255 / 28%); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 760px) { .code-editor { min-height: 360px; } .editor-body, textarea { min-height: 310px; } }
</style>

