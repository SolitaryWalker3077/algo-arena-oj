<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, FullScreen, MagicStick, Rank } from '@element-plus/icons-vue'
import * as monacoApi from 'monaco-editor/editor/editor.api'
import 'monaco-editor/languages/definitions/cpp/register.js'
import 'monaco-editor/languages/definitions/csharp/register.js'
import 'monaco-editor/languages/definitions/go/register.js'
import 'monaco-editor/languages/definitions/java/register.js'
import 'monaco-editor/languages/definitions/javascript/register.js'
import 'monaco-editor/languages/definitions/kotlin/register.js'
import 'monaco-editor/languages/definitions/php/register.js'
import 'monaco-editor/languages/definitions/python/register.js'
import 'monaco-editor/languages/definitions/ruby/register.js'
import 'monaco-editor/languages/definitions/rust/register.js'
import 'monaco-editor/languages/definitions/swift/register.js'
import 'monaco-editor/languages/definitions/typescript/register.js'
import { configureMonacoEnvironment } from './monacoEnvironment'
import type { CodeEditorPlugin } from '@/types/problem'

type MonacoModule = typeof monacoApi
type MonacoEditor = import('monaco-editor').editor.IStandaloneCodeEditor
type MonacoDisposable = import('monaco-editor').IDisposable

let typeScriptFeatures: Promise<unknown> | null = null
const ensureLanguageFeatures = (language: string) => {
  if (language !== 'javascript' && language !== 'typescript') return Promise.resolve()
  typeScriptFeatures ||= import('monaco-editor/language/typescript/monaco.contribution.js')
  return typeScriptFeatures
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    language?: string
    height?: number
    minimap?: boolean
    readonly?: boolean
    autosaveSeconds?: number
    plugins?: CodeEditorPlugin[]
  }>(),
  {
    modelValue: '',
    label: '代码编辑器',
    language: 'java',
    height: 320,
    minimap: false,
    readonly: false,
    autosaveSeconds: 30,
    plugins: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:language': [value: string]
  save: [value: string, reason: 'blur' | 'interval']
  ready: [editor: MonacoEditor]
}>()

const languageOptions = [
  ['java', 'Java'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['go', 'Go'],
  ['rust', 'Rust'],
  ['kotlin', 'Kotlin'],
  ['swift', 'Swift'],
  ['php', 'PHP'],
  ['ruby', 'Ruby'],
].map(([value, label]) => ({ value, label }))

const editorHost = ref<HTMLElement | null>(null)
const editor = shallowRef<MonacoEditor | null>(null)
const monaco = shallowRef<MonacoModule | null>(null)
const loading = ref(true)
const loadError = ref('')
const fullscreen = ref(false)
const markerCount = ref(0)
const dirty = ref(false)
const currentLanguage = ref(props.language)
const disposables: MonacoDisposable[] = []
const pluginCleanups: Array<() => void> = []
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let saveTimer: ReturnType<typeof setInterval> | null = null

const editorStyle = computed(() => ({ height: `${Math.max(300, props.height)}px` }))
const toMonacoLanguage = (language: string) => (language === 'c' ? 'cpp' : language)

const basicFormat = (source: string): string => {
  let level = 0
  return source
    .split('\n')
    .map((rawLine) => {
      const line = rawLine.replace(/\s+$/u, '').trimStart()
      if (!line) return ''
      if (/^[}\])]/u.test(line)) level = Math.max(0, level - 1)
      const formatted = `${'  '.repeat(level)}${line}`
      if (/[{[(]\s*(?:\/\/.*)?$/u.test(line)) level += 1
      return formatted
    })
    .join('\n')
}

const saveIfDirty = (reason: 'blur' | 'interval') => {
  if (!dirty.value || !editor.value) return
  dirty.value = false
  emit('save', editor.value.getValue(), reason)
}

const updateMarkers = () => {
  const model = editor.value?.getModel()
  if (!model || !monaco.value) return
  markerCount.value = monaco.value.editor.getModelMarkers({ resource: model.uri }).length
}

const createEditor = async () => {
  if (!editorHost.value) return
  try {
    configureMonacoEnvironment()
    await ensureLanguageFeatures(currentLanguage.value)
    const module = monacoApi
    monaco.value = module
    editor.value = module.editor.create(editorHost.value, {
      value: props.modelValue,
      language: toMonacoLanguage(currentLanguage.value),
      theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
      automaticLayout: false,
      readOnly: props.readonly,
      lineNumbers: 'on',
      folding: true,
      glyphMargin: true,
      minimap: { enabled: props.minimap },
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      tabCompletion: 'on',
      wordBasedSuggestions: 'allDocuments',
      suggest: { showKeywords: true, showSnippets: true, preview: true },
      formatOnPaste: true,
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 22,
      padding: { top: 12, bottom: 12 },
      ariaLabel: props.label,
    })

    disposables.push(
      editor.value.onDidChangeModelContent(() => {
        const value = editor.value?.getValue() ?? ''
        dirty.value = true
        emit('update:modelValue', value)
      }),
      editor.value.onDidBlurEditorWidget(() => saveIfDirty('blur')),
      module.editor.onDidChangeMarkers(updateMarkers),
    )

    resizeObserver = new ResizeObserver(() => editor.value?.layout())
    resizeObserver.observe(editorHost.value)
    for (const plugin of props.plugins) {
      const cleanup = plugin.setup({ monaco: module, editor: editor.value })
      if (typeof cleanup === 'function') pluginCleanups.push(cleanup)
    }
    emit('ready', editor.value)
    updateMarkers()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '编辑器加载失败'
  } finally {
    loading.value = false
  }
}

const copyCode = async () => {
  const value = editor.value?.getValue() ?? props.modelValue
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('代码已复制')
  } catch {
    ElMessage.warning('浏览器未授权剪贴板，请在编辑器中手动复制')
    editor.value?.focus()
  }
}

const formatCode = async () => {
  if (!editor.value || !monaco.value) return
  const action = editor.value.getAction('editor.action.formatDocument')
  if (action?.isSupported()) {
    await action.run()
  } else {
    const model = editor.value.getModel()
    if (model) {
      editor.value.executeEdits('oj-basic-formatter', [
        { range: model.getFullModelRange(), text: basicFormat(model.getValue()) },
      ])
    }
  }
  ElMessage.success('代码已格式化')
}

const toggleFullscreen = async () => {
  fullscreen.value = !fullscreen.value
  document.body.classList.toggle('problem-editor-fullscreen-open', fullscreen.value)
  await nextTick()
  editor.value?.layout()
  editor.value?.focus()
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && fullscreen.value) {
    event.stopPropagation()
    toggleFullscreen()
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== editor.value.getValue()) editor.value.setValue(value ?? '')
  },
)

watch(
  () => props.language,
  (language) => {
    currentLanguage.value = language
    ensureLanguageFeatures(language)
    const model = editor.value?.getModel()
    if (model && monaco.value) {
      monaco.value.editor.setModelLanguage(model, toMonacoLanguage(language))
    }
  },
)

watch(currentLanguage, (language) => {
  emit('update:language', language)
  ensureLanguageFeatures(language)
  const model = editor.value?.getModel()
  if (model && monaco.value) {
    monaco.value.editor.setModelLanguage(model, toMonacoLanguage(language))
  }
})

onMounted(() => {
  createEditor()
  document.addEventListener('keydown', onDocumentKeydown, true)
  themeObserver = new MutationObserver(() => {
    monaco.value?.editor.setTheme(
      document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
    )
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  saveTimer = setInterval(() => saveIfDirty('interval'), Math.max(5, props.autosaveSeconds) * 1000)
})

onBeforeUnmount(() => {
  saveIfDirty('blur')
  if (saveTimer) clearInterval(saveTimer)
  document.removeEventListener('keydown', onDocumentKeydown, true)
  document.body.classList.remove('problem-editor-fullscreen-open')
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  disposables.forEach((item) => item.dispose())
  pluginCleanups.forEach((cleanup) => cleanup())
  editor.value?.dispose()
})
</script>

<template>
  <section
    class="code-editor"
    :class="{ 'code-editor--fullscreen': fullscreen }"
    :aria-label="label"
  >
    <header class="code-editor__toolbar">
      <div class="code-editor__language">
        <span class="code-editor__caption">{{ label }}</span>
        <el-select
          v-model="currentLanguage"
          size="small"
          aria-label="代码语言"
          class="language-select"
        >
          <el-option
            v-for="option in languageOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
      <div class="code-editor__actions">
        <el-tooltip content="复制代码" placement="top">
          <el-button text :icon="CopyDocument" aria-label="复制代码" @click="copyCode" />
        </el-tooltip>
        <el-tooltip content="格式化代码" placement="top">
          <el-button text :icon="MagicStick" aria-label="格式化代码" @click="formatCode" />
        </el-tooltip>
        <el-tooltip :content="fullscreen ? '退出全屏' : '全屏编辑'" placement="top">
          <el-button
            text
            :icon="fullscreen ? Rank : FullScreen"
            :aria-label="fullscreen ? '退出全屏' : '全屏编辑'"
            @click="toggleFullscreen"
          />
        </el-tooltip>
      </div>
    </header>

    <div class="code-editor__surface" :style="editorStyle">
      <div ref="editorHost" class="code-editor__host" />
      <div v-if="loading" class="code-editor__loading" role="status">正在按需加载编辑器…</div>
      <div v-else-if="loadError" class="code-editor__error" role="alert">
        编辑器加载失败：{{ loadError }}
      </div>
    </div>

    <footer class="code-editor__status">
      <span>{{ currentLanguage }}</span>
      <span :class="{ 'has-errors': markerCount > 0 }">
        {{ markerCount ? `${markerCount} 个代码提示` : '未发现代码问题' }}
      </span>
      <span>{{ dirty ? '尚未保存' : '已保存' }}</span>
    </footer>
  </section>
</template>

<style scoped>
.code-editor {
  position: relative;
  overflow: hidden;
  width: 100%;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
  background: var(--app-card-bg);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.code-editor:focus-within {
  border-color: var(--app-brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-brand) 18%, transparent);
}

.code-editor__toolbar,
.code-editor__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  background: var(--app-hover-bg);
}

.code-editor__toolbar {
  min-height: 42px;
  border-bottom: 1px solid var(--app-border-color);
}

.code-editor__language,
.code-editor__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-editor__caption {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-regular);
}

.language-select {
  width: 132px;
}

.code-editor__surface {
  position: relative;
  min-height: 300px;
}

.code-editor__host {
  width: 100%;
  height: 100%;
}

.code-editor__loading,
.code-editor__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  color: var(--app-text-secondary);
  background: var(--app-card-bg);
}

.code-editor__error {
  color: var(--app-danger);
}

.code-editor__status {
  justify-content: flex-end;
  min-height: 30px;
  border-top: 1px solid var(--app-border-color);
  color: var(--app-text-secondary);
  font-size: 11px;
}

.code-editor__status .has-errors {
  color: var(--el-color-warning);
}

.code-editor--fullscreen {
  position: fixed;
  inset: 16px;
  z-index: 1950;
  width: auto;
  border-radius: 12px;
  box-shadow: var(--app-shadow-strong);
}

.code-editor--fullscreen .code-editor__surface {
  height: calc(100vh - 106px) !important;
}

@media (max-width: 768px) {
  .code-editor__surface {
    height: clamp(300px, 52vh, 420px) !important;
  }

  .code-editor__caption {
    display: none;
  }

  .language-select {
    width: 112px;
  }

  .code-editor--fullscreen {
    inset: 0;
    border: 0;
    border-radius: 0;
  }
}
</style>
