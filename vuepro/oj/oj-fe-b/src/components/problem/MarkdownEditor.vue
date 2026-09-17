<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder as editorPlaceholder } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import {
  ChatLineSquare,
  CollectionTag,
  DocumentCopy,
  EditPen,
  Grid,
  Link,
  List,
  Minus,
  Picture,
  Tickets,
  View,
} from '@element-plus/icons-vue'
import { basicSetup } from 'codemirror'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { applyMarkdownEdit, type MarkdownEditAction } from '@/utils/markdownEditing'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    minHeight?: number
    maxLength?: number
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '使用 Markdown 编写题目描述…',
    minHeight: 360,
    maxLength: 0,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

type ViewMode = 'split' | 'edit' | 'preview'

const editorHost = ref<HTMLElement | null>(null)
const viewMode = ref<ViewMode>('split')
const characterCount = computed(() => props.modelValue.length)
const overLimit = computed(() => props.maxLength > 0 && characterCount.value > props.maxLength)
const editorStyle = computed(() => ({ minHeight: `${Math.max(280, props.minHeight)}px` }))
const readOnlyCompartment = new Compartment()
let editorView: EditorView | null = null

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--app-brand)', fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: 'var(--app-brand)', textDecoration: 'underline' },
  { tag: [tags.monospace, tags.processingInstruction], color: 'var(--el-color-warning)' },
  { tag: tags.meta, color: 'var(--app-text-secondary)' },
])

const toolbarItems: Array<{
  action: MarkdownEditAction
  label: string
  icon?: unknown
  text?: string
}> = [
  { action: 'heading', label: '二级标题', text: 'H₂' },
  { action: 'bold', label: '加粗（Ctrl+B）', text: 'B' },
  { action: 'italic', label: '斜体（Ctrl+I）', text: 'I' },
  { action: 'unordered-list', label: '无序列表', icon: List },
  { action: 'ordered-list', label: '有序列表', icon: Tickets },
  { action: 'quote', label: '引用', icon: ChatLineSquare },
  { action: 'inline-code', label: '行内代码', icon: CollectionTag },
  { action: 'code-block', label: '代码块', icon: DocumentCopy },
  { action: 'link', label: '链接（Ctrl+K）', icon: Link },
  { action: 'image', label: '图片', icon: Picture },
  { action: 'horizontal-rule', label: '分隔线', icon: Minus },
]

const format = (action: MarkdownEditAction): boolean => {
  if (props.disabled || !editorView) return false
  const selection = editorView.state.selection.main
  const source = editorView.state.doc.toString()
  const result = applyMarkdownEdit(source, selection.from, selection.to, action)
  editorView.dispatch({
    changes: { from: 0, to: source.length, insert: result.value },
    selection: { anchor: result.selectionStart, head: result.selectionEnd },
    scrollIntoView: true,
    userEvent: 'input.markdown-toolbar',
  })
  editorView.focus()
  return true
}

onMounted(() => {
  if (!editorHost.value) return
  editorView = new EditorView({
    parent: editorHost.value,
    doc: props.modelValue,
    extensions: [
      basicSetup,
      markdown(),
      syntaxHighlighting(markdownHighlight),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': '题目内容 Markdown',
        'aria-multiline': 'true',
      }),
      editorPlaceholder(props.placeholder),
      readOnlyCompartment.of(EditorState.readOnly.of(props.disabled)),
      keymap.of([
        { key: 'Mod-b', run: () => format('bold') },
        { key: 'Mod-i', run: () => format('italic') },
        { key: 'Mod-k', run: () => format('link') },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        if (update.focusChanged && !update.view.hasFocus) emit('blur')
      }),
    ],
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editorView || value === editorView.state.doc.toString()) return
    editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: value } })
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    editorView?.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(disabled)),
    })
  },
)

onBeforeUnmount(() => {
  editorView?.destroy()
  editorView = null
})
</script>

<template>
  <section
    class="markdown-editor"
    :class="{ 'is-disabled': disabled }"
    aria-label="Markdown 编辑器"
  >
    <header class="markdown-editor__toolbar">
      <div class="format-tools" role="toolbar" aria-label="Markdown 格式工具">
        <el-tooltip
          v-for="item in toolbarItems"
          :key="item.action"
          :content="item.label"
          placement="top"
        >
          <el-button
            text
            :disabled="disabled || viewMode === 'preview'"
            :icon="item.icon"
            :aria-label="item.label"
            :class="[
              'format-button',
              {
                'format-button--bold': item.action === 'bold',
                'format-button--italic': item.action === 'italic',
              },
            ]"
            @click="format(item.action)"
          >
            {{ item.text }}
          </el-button>
        </el-tooltip>
      </div>

      <el-button-group class="view-switch" aria-label="编辑器视图">
        <el-button
          :type="viewMode === 'edit' ? 'primary' : 'default'"
          :icon="EditPen"
          aria-label="仅编辑"
          @click="viewMode = 'edit'"
        />
        <el-button
          class="split-button"
          :type="viewMode === 'split' ? 'primary' : 'default'"
          :icon="Grid"
          aria-label="分栏预览"
          @click="viewMode = 'split'"
        />
        <el-button
          :type="viewMode === 'preview' ? 'primary' : 'default'"
          :icon="View"
          aria-label="仅预览"
          @click="viewMode = 'preview'"
        />
      </el-button-group>
    </header>

    <div class="markdown-editor__panels" :data-mode="viewMode" :style="editorStyle">
      <div class="editor-pane">
        <div class="pane-title">Markdown</div>
        <div ref="editorHost" class="markdown-source" />
      </div>

      <div class="preview-pane">
        <div class="pane-title">实时预览</div>
        <div class="preview-scroll">
          <MarkdownRenderer :content="modelValue" />
        </div>
      </div>
    </div>

    <footer class="markdown-editor__footer">
      <span>支持标准 Markdown、表格与围栏代码块</span>
      <span :class="{ 'is-over-limit': overLimit }">
        {{ characterCount }}{{ maxLength ? ` / ${maxLength}` : '' }} 字符
      </span>
    </footer>
  </section>
</template>

<style scoped>
.markdown-editor {
  width: 100%;
  overflow: hidden;
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.markdown-editor:focus-within {
  border-color: var(--app-brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-brand) 18%, transparent);
}

.markdown-editor.is-disabled {
  opacity: 0.65;
}

.markdown-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 46px;
  padding: 6px 8px;
  background: var(--app-hover-bg);
  border-bottom: 1px solid var(--app-border-color);
}

.format-tools {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 1px;
}

.format-button {
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--app-text-regular);
}

.format-button--bold {
  font-weight: 800;
}

.format-button--italic {
  font-family: Georgia, serif;
  font-style: italic;
}

.view-switch {
  flex-shrink: 0;
}

.markdown-editor__panels {
  display: grid;
  min-height: 280px;
}

.markdown-editor__panels[data-mode='split'] {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.markdown-editor__panels[data-mode='edit'] .preview-pane,
.markdown-editor__panels[data-mode='preview'] .editor-pane {
  display: none;
}

.editor-pane,
.preview-pane {
  display: flex;
  min-width: 0;
  min-height: inherit;
  flex-direction: column;
}

.preview-pane {
  border-left: 1px solid var(--app-border-color);
}

.pane-title {
  padding: 6px 12px;
  color: var(--app-text-secondary);
  background: var(--app-card-bg);
  border-bottom: 1px solid var(--app-border-color);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.markdown-source {
  width: 100%;
  min-height: inherit;
  flex: 1;
}

.markdown-source :deep(.cm-editor) {
  height: 100%;
  min-height: inherit;
  color: var(--app-text-primary);
  background: var(--app-card-bg);
  font:
    14px/1.7 Consolas,
    'Courier New',
    monospace;
}

.markdown-source :deep(.cm-editor.cm-focused) {
  outline: 0;
}

.markdown-source :deep(.cm-scroller) {
  min-height: inherit;
  overflow: auto;
  font-family: inherit;
}

.markdown-source :deep(.cm-content) {
  min-height: inherit;
  padding: 12px 4px;
  caret-color: var(--app-brand);
}

.markdown-source :deep(.cm-line) {
  padding: 0 10px;
}

.markdown-source :deep(.cm-gutters) {
  color: var(--app-text-secondary);
  background: var(--app-hover-bg);
  border-right: 1px solid var(--app-border-color);
}

.markdown-source :deep(.cm-activeLine),
.markdown-source :deep(.cm-activeLineGutter) {
  background: color-mix(in srgb, var(--app-brand) 8%, transparent);
}

.markdown-source :deep(.cm-placeholder) {
  color: var(--app-text-secondary);
  font-style: normal;
}

.preview-scroll {
  min-height: inherit;
  max-height: 560px;
  flex: 1;
  padding: 8px 18px 24px;
  overflow: auto;
  background: var(--app-card-bg);
}

.markdown-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  padding: 4px 10px;
  color: var(--app-text-secondary);
  background: var(--app-hover-bg);
  border-top: 1px solid var(--app-border-color);
  font-size: 11px;
}

.is-over-limit {
  color: var(--app-danger);
}

@media (max-width: 768px) {
  .markdown-editor__toolbar {
    align-items: flex-start;
  }

  .markdown-editor__panels[data-mode='split'] {
    grid-template-columns: minmax(0, 1fr);
  }

  .markdown-editor__panels[data-mode='split'] .preview-pane {
    display: none;
  }

  .preview-pane {
    border-left: 0;
  }

  .split-button {
    display: none;
  }

  .markdown-editor__footer span:first-child {
    display: none;
  }

  .markdown-editor__footer {
    justify-content: flex-end;
  }
}
</style>
