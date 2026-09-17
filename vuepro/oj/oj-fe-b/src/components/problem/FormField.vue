<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import ValidationMessage from './ValidationMessage.vue'
import { getProblemFieldRenderer } from './fieldRegistry'
import type { FormValue, ProblemFieldMetadata, ProblemFormValues } from '@/types/problem'

const CodeEditor = defineAsyncComponent({
  loader: () => import('./CodeEditor.vue'),
  delay: 120,
  timeout: 20_000,
})

const MarkdownEditor = defineAsyncComponent({
  loader: () => import('./MarkdownEditor.vue'),
  delay: 120,
  timeout: 20_000,
})

const props = withDefaults(
  defineProps<{
    field: ProblemFieldMetadata
    modelValue?: FormValue
    formValues: ProblemFormValues
    error?: string
    autosaveSeconds?: number
  }>(),
  {
    modelValue: '',
    error: '',
    autosaveSeconds: 30,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: FormValue]
  input: []
  blur: []
  autosave: []
}>()

const customRenderer = computed(() => getProblemFieldRenderer(props.field.type))
const codeHost = ref<HTMLElement | null>(null)
const codeEditorVisible = ref(props.field.type !== 'code')
let visibilityObserver: IntersectionObserver | null = null
const editorLanguage = computed(() => {
  const source = props.field.editor?.languageField
  return String((source && props.formValues[source]) || props.field.editor?.language || 'java')
})

const update = (value: FormValue) => {
  emit('update:modelValue', value)
  emit('input')
}

const onNativeInput = (event: Event) => update((event.target as HTMLInputElement).value)

onMounted(() => {
  if (props.field.type !== 'code') return
  if (typeof IntersectionObserver === 'undefined' || !codeHost.value) {
    codeEditorVisible.value = true
    return
  }
  visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      codeEditorVisible.value = true
      visibilityObserver?.disconnect()
    },
    { rootMargin: '240px 0px' },
  )
  visibilityObserver.observe(codeHost.value)
})

onBeforeUnmount(() => visibilityObserver?.disconnect())
</script>

<template>
  <el-form-item
    :label="field.label"
    :prop="field.name"
    :validate-status="error ? 'error' : ''"
    :class="['dynamic-field', `dynamic-field--${field.type}`]"
  >
    <component
      :is="customRenderer"
      v-if="customRenderer"
      :field="field"
      :model-value="modelValue"
      :form-values="formValues"
      @update:model-value="update"
      @blur="emit('blur')"
    />

    <el-input
      v-else-if="field.type === 'text'"
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder"
      :maxlength="field.validation?.find((rule) => rule.maxLength)?.maxLength"
      :clearable="field.clearable !== false"
      @input="update"
      @blur="emit('blur')"
    />

    <el-input
      v-else-if="field.type === 'textarea'"
      type="textarea"
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder"
      :rows="field.rows || 5"
      :maxlength="field.validation?.find((rule) => rule.maxLength)?.maxLength"
      show-word-limit
      resize="vertical"
      @input="update"
      @blur="emit('blur')"
    />

    <Suspense v-else-if="field.type === 'markdown'">
      <MarkdownEditor
        :model-value="String(modelValue ?? '')"
        :placeholder="field.placeholder"
        :min-height="Math.max(320, (field.rows || 12) * 26)"
        :max-length="field.validation?.find((rule) => rule.maxLength)?.maxLength"
        @update:model-value="update"
        @blur="emit('blur')"
      />
      <template #fallback>
        <el-skeleton :rows="8" animated class="markdown-skeleton" />
      </template>
    </Suspense>

    <el-select
      v-else-if="field.type === 'select' || field.type === 'multiselect'"
      :model-value="modelValue"
      :multiple="field.type === 'multiselect'"
      :placeholder="field.placeholder"
      :clearable="field.clearable !== false"
      :filterable="field.filterable"
      class="field-control"
      @update:model-value="update"
      @blur="emit('blur')"
    >
      <el-option
        v-for="option in field.options"
        :key="String(option.value)"
        :label="option.label"
        :value="option.value"
        :disabled="option.disabled"
      />
    </el-select>

    <el-radio-group
      v-else-if="field.type === 'radio'"
      :model-value="modelValue"
      @update:model-value="update"
      @blur="emit('blur')"
    >
      <el-radio-button
        v-for="option in field.options"
        :key="String(option.value)"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-radio-button>
    </el-radio-group>

    <el-checkbox-group
      v-else-if="field.type === 'checkbox'"
      :model-value="Array.isArray(modelValue) ? modelValue : []"
      @update:model-value="update"
      @blur="emit('blur')"
    >
      <el-checkbox
        v-for="option in field.options"
        :key="String(option.value)"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </el-checkbox>
    </el-checkbox-group>

    <el-date-picker
      v-else-if="field.type === 'date'"
      :model-value="modelValue"
      type="date"
      value-format="YYYY-MM-DD"
      :placeholder="field.placeholder"
      class="field-control"
      @update:model-value="update"
      @blur="emit('blur')"
    />

    <el-time-picker
      v-else-if="field.type === 'time'"
      :model-value="modelValue"
      value-format="HH:mm:ss"
      :placeholder="field.placeholder"
      class="field-control"
      @update:model-value="update"
      @blur="emit('blur')"
    />

    <el-input-number
      v-else-if="field.type === 'number'"
      :model-value="typeof modelValue === 'number' ? modelValue : Number(modelValue)"
      :min="field.min"
      :max="field.max"
      :step="field.step || 1"
      controls-position="right"
      class="field-control"
      @update:model-value="update"
      @blur="emit('blur')"
    />

    <div v-else-if="field.type === 'code'" ref="codeHost" class="lazy-editor-host">
      <Suspense v-if="codeEditorVisible">
        <CodeEditor
          :model-value="String(modelValue ?? '')"
          :label="field.label"
          :language="editorLanguage"
          :height="field.editor?.height || 320"
          :minimap="field.editor?.minimap"
          :autosave-seconds="autosaveSeconds"
          @update:model-value="update"
          @save="emit('autosave')"
        />
        <template #fallback>
          <el-skeleton :rows="7" animated class="editor-skeleton" />
        </template>
      </Suspense>
      <div v-else class="editor-placeholder" role="status">滚动至此处时加载代码编辑器…</div>
    </div>

    <input
      v-else
      class="unknown-field"
      :value="String(modelValue ?? '')"
      :placeholder="field.placeholder"
      @input="onNativeInput"
      @blur="emit('blur')"
    />

    <ValidationMessage :message="error" :help="field.help" />
  </el-form-item>
</template>

<style scoped>
.dynamic-field {
  width: 100%;
  margin-bottom: 6px;
}

.field-control,
.unknown-field {
  width: 100%;
}

.unknown-field {
  box-sizing: border-box;
  height: 32px;
  padding: 0 11px;
  color: var(--app-text-primary);
  background: var(--app-input-bg);
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
}

.editor-skeleton {
  min-height: 300px;
  padding: 16px;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
}

.markdown-skeleton {
  min-height: 360px;
  padding: 16px;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
}

.lazy-editor-host {
  width: 100%;
  min-height: 300px;
}

.editor-placeholder {
  display: grid;
  min-height: 300px;
  place-items: center;
  color: var(--app-text-secondary);
  background: var(--app-hover-bg);
  border: 1px dashed var(--app-border-color);
  border-radius: 8px;
  font-size: 13px;
}

:deep(.el-form-item__content) {
  display: block;
}

:deep(.el-form-item__error) {
  display: none;
}
</style>
