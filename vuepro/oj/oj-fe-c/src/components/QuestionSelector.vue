<template>
  <el-select
    :model-value="modelValue"
    placeholder="全部难度"
    clearable
    aria-label="按题目难度筛选"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="item in difficultyList"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], default: '' },
})

const emit = defineEmits(['update:modelValue'])
const difficultyList = [
  { value: 1, label: '简单' },
  { value: 2, label: '中等' },
  { value: 3, label: '困难' },
]
</script>

