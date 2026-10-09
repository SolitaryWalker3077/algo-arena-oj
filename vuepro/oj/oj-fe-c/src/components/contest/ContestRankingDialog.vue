<template>
  <el-dialog
    :model-value="modelValue"
    class="contest-ranking-dialog"
    width="min(646px, calc(100vw - 32px))"
    top="22vh"
    :aria-label="`${contestTitle || '竞赛'}排名`"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-table v-loading="loading" :data="ranking" empty-text="暂无数据" class="ranking-table">
      <el-table-column prop="rank" label="排名" min-width="100" />
      <el-table-column prop="nickName" label="用户昵称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="score" label="用户得分" min-width="130" />
      <template #empty>
        <div v-if="errorMessage" class="ranking-error" role="alert">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="loadRanking">重新加载</button>
        </div>
        <span v-else>暂无数据</span>
      </template>
    </el-table>
    <el-pagination
      class="ranking-pagination"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :current-page="pageNum"
      :page-size="pageSize"
      :page-sizes="[9, 18, 36]"
      :pager-count="5"
      :total="total"
      :disabled="loading || Boolean(errorMessage)"
      @size-change="changePageSize"
      @current-change="changePage"
    />
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { getExamRanking } from '@/apis/exam'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  examId: { type: [String, Number], default: '' },
  contestTitle: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const ranking = ref([])
const loading = ref(false)
const errorMessage = ref('')
const pageNum = ref(1)
const pageSize = ref(9)
const total = ref(0)
let controller
let requestSequence = 0

async function loadRanking() {
  controller?.abort()
  const requestController = new AbortController()
  controller = requestController
  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''
  ranking.value = []
  try {
    const result = await getExamRanking(props.examId, {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    }, { signal: requestController.signal })
    if (sequence !== requestSequence) return
    const rows = Array.isArray(result.rows) ? result.rows : []
    total.value = Math.max(0, Number(result.total) || 0)
    ranking.value = rows.map((item, index) => ({
      rank: Number(item.examRank ?? item.rank) || (pageNum.value - 1) * pageSize.value + index + 1,
      nickName: item.nickName || item.userName || '未设置昵称',
      score: Number(item.score) || 0,
    }))
  } catch (error) {
    if (requestController.signal.aborted || sequence !== requestSequence) return
    total.value = 0
    errorMessage.value = error.message || '排名加载失败，请稍后重试'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function changePage(page) {
  if (pageNum.value === page) return
  pageNum.value = page
  loadRanking()
}

function changePageSize(size) {
  pageSize.value = size
  pageNum.value = 1
  loadRanking()
}

watch(() => [props.modelValue, props.examId], ([visible, examId]) => {
  controller?.abort()
  requestSequence++
  if (visible && examId) {
    pageNum.value = 1
    pageSize.value = 9
    total.value = 0
    loadRanking()
  }
}, { immediate: true })

onBeforeUnmount(() => controller?.abort())
</script>

<style lang="scss">
.contest-ranking-dialog {
  padding: 18px;
  border-radius: 2px;

  .el-dialog__header { min-height: 18px; padding: 0; margin-bottom: 0; }
  .el-dialog__headerbtn { top: 4px; right: 4px; }
  .el-dialog__body { padding: 0; }
  .ranking-table { --el-table-header-text-color: #909399; --el-table-text-color: #606266; }
  .ranking-table th.el-table__cell { height: 42px; font-size: 14px; }
  .ranking-table .el-table__empty-block { min-height: 64px; }
  .ranking-table .el-table__empty-text { color: #909399; }
  .ranking-pagination {
    justify-content: flex-start;
    margin-top: 0;
    padding-top: 0;
    overflow-x: auto;
    --el-color-primary: #409eff;
    --el-pagination-button-height: 34px;
    --el-pagination-button-width: 34px;
  }
  .ranking-pagination .el-select { width: 138px; }
  .ranking-pagination .el-pagination__sizes { margin-right: 16px; }
  .ranking-pagination .el-pagination__jump { margin-left: 16px; }
  .ranking-error { display: flex; align-items: center; justify-content: center; gap: 12px; line-height: 1.5; }
  .ranking-error button { border: 0; color: #409eff; background: transparent; cursor: pointer; }
}
</style>
