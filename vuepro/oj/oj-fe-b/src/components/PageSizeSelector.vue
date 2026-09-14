<template>
  <div class="page-size-selector">
    <span class="page-size-selector__label">每页显示</span>
    <el-select
      ref="selectRef"
      :model-value="modelValue"
      :disabled="disabled"
      size="small"
      class="page-size-selector__select"
      aria-label="选择每页显示条数"
      @change="handlePresetChange"
      @visible-change="handleVisibleChange"
    >
      <el-option
        v-for="size in normalizedOptions"
        :key="size"
        :label="`${size} 条/页`"
        :value="size"
      />
      <el-option
        v-if="isCustomSize"
        :label="`${modelValue} 条/页（自定义）`"
        :value="modelValue"
      />

      <template #footer>
        <div class="page-size-selector__custom" @click.stop>
          <span class="page-size-selector__custom-title">自定义条数</span>
          <div class="page-size-selector__custom-row">
            <el-input
              v-model="customInput"
              size="small"
              inputmode="numeric"
              :placeholder="`${min}-${max}`"
              aria-label="自定义每页显示条数"
              @keydown.enter.prevent="applyCustomSize"
            />
            <el-button type="primary" size="small" @click="applyCustomSize">应用</el-button>
          </div>
          <span class="page-size-selector__hint">请输入 {{ min }}-{{ max }} 之间的整数</span>
        </div>
      </template>
    </el-select>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  normalizePageSize,
  PAGE_SIZE_MAX,
  PAGE_SIZE_MIN,
  PAGE_SIZE_OPTIONS,
} from '@/utils/pagination'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  min: {
    type: Number,
    default: PAGE_SIZE_MIN,
  },
  max: {
    type: Number,
    default: PAGE_SIZE_MAX,
  },
  options: {
    type: Array,
    default: () => [...PAGE_SIZE_OPTIONS],
  },
})

const emit = defineEmits(['update:modelValue', 'change'])
const selectRef = ref(null)
const customInput = ref('')

const normalizedOptions = computed(() => {
  return [...new Set(props.options.map(Number))]
    .filter((size) => Number.isInteger(size) && size >= props.min && size <= props.max)
    .sort((a, b) => a - b)
})
const isCustomSize = computed(() => !normalizedOptions.value.includes(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    if (!normalizedOptions.value.includes(value)) customInput.value = String(value)
  },
  { immediate: true },
)

const closeDropdown = () => nextTick(() => selectRef.value?.blur())

const applySize = (value) => {
  let normalized
  try {
    normalized = normalizePageSize(value, { min: props.min, max: props.max })
  } catch (error) {
    ElMessage.error(error.message)
    return
  }

  if (normalized !== props.modelValue) {
    emit('update:modelValue', normalized)
    emit('change', normalized)
  }
  customInput.value = String(normalized)
  closeDropdown()
}

const handlePresetChange = (value) => applySize(value)
const applyCustomSize = () => applySize(customInput.value)
const handleVisibleChange = (visible) => {
  if (visible && !isCustomSize.value) customInput.value = ''
}
</script>

<style lang="scss" scoped>
.page-size-selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  &__label {
    font-size: 13px;
    color: var(--app-text-regular);
  }

  &__select {
    width: 158px;
  }

  &__custom {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 2px 0;
    text-align: left;
  }

  &__custom-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--app-text-regular);
  }

  &__custom-row {
    display: flex;
    gap: 6px;
  }

  &__hint {
    font-size: 11px;
    color: var(--app-text-secondary);
  }
}

@media screen and (max-width: 480px) {
  .page-size-selector {
    justify-content: center;
  }
}
</style>

