<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { validateFieldValue, validateProblemValues } from '@/utils/formValidation'
import type {
  FormValue,
  ProblemFieldMetadata,
  ProblemFormErrors,
  ProblemFormMetadata,
  ProblemFormValues,
} from '@/types/problem'

const FormField = defineAsyncComponent({
  loader: () => import('./FormField.vue'),
  delay: 80,
  timeout: 20_000,
})

const props = withDefaults(
  defineProps<{
    metadata: ProblemFormMetadata
    initialValues?: ProblemFormValues
  }>(),
  { initialValues: () => ({}) },
)

const emit = defineEmits<{
  change: [values: ProblemFormValues]
  autosave: [values: ProblemFormValues]
}>()

const values = ref<ProblemFormValues>({})
const errors = ref<ProblemFormErrors>({})

const groupInfo = {
  basic: { title: '基本信息', description: '设置题目名称、难度与运行资源限制。' },
  statement: { title: '题面内容', description: '清楚说明题意，并提供便于理解的公开样例。' },
  code: { title: '判题代码', description: '配置选手初始代码和负责输入输出的 main 方法。' },
} as const

const groupedFields = computed(() => {
  const groups = new Map<string, ProblemFieldMetadata[]>()
  for (const field of props.metadata.fields) {
    const group = field.group || 'basic'
    groups.set(group, [...(groups.get(group) || []), field])
  }
  return Array.from(groups, ([name, fields]) => ({
    name,
    fields,
    title: groupInfo[name as keyof typeof groupInfo]?.title || name,
    description: groupInfo[name as keyof typeof groupInfo]?.description || '',
  }))
})

const resetValues = () => {
  const defaults = props.metadata.fields.reduce<ProblemFormValues>((result, field) => {
    const fallback = field.type === 'checkbox' || field.type === 'multiselect' ? [] : ''
    result[field.name] = field.defaultValue ?? fallback
    return result
  }, {})
  values.value = { ...defaults, ...props.initialValues }
  errors.value = {}
}

watch(() => [props.metadata, props.initialValues], resetValues, { immediate: true })

const updateField = (field: ProblemFieldMetadata, value: FormValue) => {
  values.value = { ...values.value, [field.name]: value }
  const error = validateFieldValue(value, field)
  errors.value = { ...errors.value, [field.name]: error }
  emit('change', { ...values.value })
}

const blurField = (field: ProblemFieldMetadata) => {
  errors.value = {
    ...errors.value,
    [field.name]: validateFieldValue(values.value[field.name], field),
  }
  emit('autosave', { ...values.value })
}

const focusFirstInvalid = async () => {
  await nextTick()
  const firstName = Object.keys(errors.value)[0]
  if (!firstName) return
  const target = document.querySelector<HTMLElement>(`[data-field-name="${CSS.escape(firstName)}"]`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target?.querySelector<HTMLElement>('input, textarea, button, [tabindex]')?.focus()
}

/** Validate all current values. Resolves with a defensive copy or rejects after focusing the first error. */
const validate = async (): Promise<ProblemFormValues> => {
  errors.value = validateProblemValues(values.value, props.metadata.fields)
  if (Object.keys(errors.value).length) {
    await focusFirstInvalid()
    throw new Error('请检查表单中的必填项和格式提示')
  }
  return { ...values.value }
}

const getValues = (): ProblemFormValues => ({ ...values.value })

defineExpose({ validate, getValues, resetValues })
</script>

<template>
  <el-form
    class="problem-form"
    :model="values"
    :label-width="`${metadata.layout?.labelWidth || 104}px`"
    label-position="top"
    novalidate
    @submit.prevent
  >
    <section v-for="group in groupedFields" :key="group.name" class="form-section">
      <header class="form-section__header">
        <div>
          <h3>{{ group.title }}</h3>
          <p v-if="group.description">{{ group.description }}</p>
        </div>
        <span class="form-section__count">{{ group.fields.length }} 项</span>
      </header>

      <div class="form-grid">
        <div
          v-for="field in group.fields"
          :key="field.name"
          :data-field-name="field.name"
          :class="['form-grid__item', { 'form-grid__item--wide': field.colSpan === 2 }]"
        >
          <Suspense>
            <FormField
              :field="field"
              :model-value="values[field.name]"
              :form-values="values"
              :error="errors[field.name]"
              :autosave-seconds="metadata.behavior?.autosaveSeconds || 30"
              @update:model-value="updateField(field, $event)"
              @blur="blurField(field)"
              @autosave="emit('autosave', { ...values })"
            />
            <template #fallback>
              <el-skeleton :rows="2" animated />
            </template>
          </Suspense>
        </div>
      </div>
    </section>
  </el-form>
</template>

<style scoped>
.problem-form {
  padding: 2px 2px 24px;
}

.form-section {
  padding: 22px 0 12px;
  border-bottom: 1px solid var(--app-border-color);
}

.form-section:first-child {
  padding-top: 0;
}

.form-section:last-child {
  border-bottom: 0;
}

.form-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.form-section__header h3,
.form-section__header p {
  margin: 0;
}

.form-section__header h3 {
  color: var(--app-text-primary);
  font-size: 16px;
  line-height: 24px;
}

.form-section__header p {
  margin-top: 3px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.form-section__count {
  flex-shrink: 0;
  padding: 3px 9px;
  color: var(--app-text-secondary);
  background: var(--app-hover-bg);
  border-radius: 12px;
  font-size: 11px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 20px;
}

.form-grid__item--wide {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-grid__item--wide {
    grid-column: auto;
  }
}
</style>
