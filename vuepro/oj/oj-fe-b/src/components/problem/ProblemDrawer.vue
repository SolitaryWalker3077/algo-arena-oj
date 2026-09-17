<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Close, DocumentChecked } from '@element-plus/icons-vue'
import ProblemForm from './ProblemForm.vue'
import { clearProblemDraft, loadProblemDraft, saveProblemDraft } from '@/utils/problemDraft'
import type { ProblemFormMetadata, ProblemFormValues } from '@/types/problem'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    mode?: 'add' | 'edit'
    metadata: ProblemFormMetadata
    initialValues?: ProblemFormValues
    submitting?: boolean
    submitError?: string
  }>(),
  {
    mode: 'add',
    initialValues: () => ({}),
    submitting: false,
    submitError: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: ProblemFormValues]
  'clear-submit-error': []
}>()

const formRef = ref<InstanceType<typeof ProblemForm> | null>(null)
const formKey = ref(0)
const workingInitial = ref<ProblemFormValues>({})
const currentValues = ref<ProblemFormValues>({})
const saveStatus = ref('尚未产生草稿')
const skipNextCloseSave = ref(false)
const draftId = computed(() =>
  props.mode === 'edit' ? String(props.initialValues.id || '') : undefined,
)
const title = computed(() => (props.mode === 'add' ? '添加题目' : '编辑题目'))

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    const draft = loadProblemDraft(props.metadata.version, draftId.value)
    workingInitial.value = {
      ...props.initialValues,
      ...(draft?.values || {}),
    }
    currentValues.value = { ...workingInitial.value }
    saveStatus.value = draft
      ? `已恢复 ${new Date(draft.savedAt).toLocaleString()} 的草稿`
      : '输入内容将在失焦或每 30 秒自动保存'
    formKey.value += 1
    await nextTick()
  },
  { immediate: true },
)

const saveDraft = (values = currentValues.value) => {
  currentValues.value = { ...values }
  const savedAt = saveProblemDraft(values, props.metadata.version, draftId.value)
  saveStatus.value = savedAt
    ? `草稿已保存 ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '浏览器禁止本地存储，草稿未保存'
}

const close = () => {
  if (props.submitting) return
  saveDraft(formRef.value?.getValues() || currentValues.value)
  emit('update:modelValue', false)
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (
    event.key !== 'Escape' ||
    !props.modelValue ||
    props.submitting ||
    props.metadata.behavior?.closeOnEscape === false
  ) {
    return
  }
  close()
}

const onDrawerClose = () => {
  if (skipNextCloseSave.value) skipNextCloseSave.value = false
  else saveDraft(formRef.value?.getValues() || currentValues.value)
  emit('update:modelValue', false)
}

const submit = async () => {
  if (props.submitting) return
  try {
    const values = await formRef.value?.validate()
    if (values) emit('submit', values)
  } catch {
    // The form has already focused and displayed the first validation error.
  }
}

const onFormChange = (values: ProblemFormValues) => {
  currentValues.value = values
  if (props.submitError) emit('clear-submit-error')
}

/** Called by the page only after the backend confirms a successful save. */
const discardDraft = () => {
  clearProblemDraft(draftId.value)
  skipNextCloseSave.value = true
  saveStatus.value = '草稿已清除'
}

defineExpose({ discardDraft })

onMounted(() => document.addEventListener('keydown', onDocumentKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onDocumentKeydown))
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="min(960px, 94vw)"
    :z-index="1900"
    :show-close="false"
    :close-on-click-modal="!submitting && metadata.behavior?.closeOnOverlay !== false"
    :close-on-press-escape="!submitting && metadata.behavior?.closeOnEscape !== false"
    :lock-scroll="true"
    :destroy-on-close="true"
    modal-class="problem-drawer-overlay"
    class="problem-drawer"
    @close="onDrawerClose"
  >
    <template #header>
      <div class="drawer-header" @click.stop>
        <div class="drawer-header__icon"><DocumentChecked /></div>
        <div class="drawer-header__copy">
          <h2>{{ title }}</h2>
          <p>{{ metadata.description }}</p>
        </div>
        <el-button
          circle
          text
          :icon="Close"
          aria-label="关闭题目表单"
          class="drawer-close"
          :disabled="submitting"
          @click.stop="close"
        />
      </div>
    </template>

    <div class="drawer-content" @click.stop>
      <el-alert
        v-if="saveStatus.includes('恢复')"
        :title="saveStatus"
        type="info"
        show-icon
        :closable="false"
        class="draft-alert"
      />
      <el-alert
        v-if="submitError"
        :title="submitError"
        type="error"
        show-icon
        :closable="false"
        class="submit-alert"
        role="alert"
      />
      <ProblemForm
        :key="formKey"
        ref="formRef"
        :metadata="metadata"
        :initial-values="workingInitial"
        @change="onFormChange"
        @autosave="saveDraft"
      />
    </div>

    <template #footer>
      <div class="drawer-footer" @click.stop>
        <span class="save-status" role="status">{{ saveStatus }}</span>
        <div class="drawer-footer__actions">
          <el-button :disabled="submitting" @click="close">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submit">
            {{ mode === 'add' ? '创建题目' : '保存修改' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 12px;
}

.drawer-header__icon {
  display: grid;
  flex: 0 0 42px;
  height: 42px;
  place-items: center;
  color: var(--app-brand);
  background: var(--app-brand-active-bg);
  border-radius: 12px;
  font-size: 22px;
}

.drawer-header__copy {
  flex: 1;
  min-width: 0;
}

.drawer-header h2,
.drawer-header p {
  margin: 0;
}

.drawer-header h2 {
  color: var(--app-text-primary);
  font-size: 20px;
  line-height: 26px;
}

.drawer-header p {
  margin-top: 3px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 18px;
}

.drawer-close {
  flex-shrink: 0;
}

.drawer-content {
  min-height: 100%;
}

.draft-alert,
.submit-alert {
  margin-bottom: 18px;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.save-status {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-footer__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 600px) {
  .drawer-header__icon,
  .drawer-header p,
  .save-status {
    display: none;
  }

  .drawer-footer {
    justify-content: flex-end;
  }
}
</style>
