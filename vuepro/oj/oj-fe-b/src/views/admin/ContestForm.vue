<template>
  <div class="contest-form-page">
    <div class="form-head">
      <div>
        <h2>{{ isEdit ? '竞赛编辑' : '添加竞赛' }}</h2>
        <p>
          {{
            isEdit
              ? '查看竞赛信息与题目，修改后可保存基本信息。'
              : '先保存基本信息，再从题库选择竞赛题目。'
          }}
        </p>
      </div>
      <el-button @click="router.push({ name: 'contestManage' })">返回列表</el-button>
    </div>

    <section class="form-card" v-loading="detailLoading" element-loading-text="正在加载竞赛…">
      <div class="section-head">
        <h3>基本信息</h3>
        <el-tag v-if="contestId" type="success" size="small">已保存</el-tag>
        <el-tag v-else type="info" size="small">未保存</el-tag>
      </div>
      <el-alert
        v-if="formError"
        :title="formError"
        type="error"
        show-icon
        :closable="false"
        class="form-alert"
      />
      <el-alert
        v-if="questionsError"
        :title="`竞赛详情加载失败：${questionsError}`"
        type="error"
        show-icon
        :closable="false"
        class="form-alert"
      >
        <el-button size="small" :loading="detailLoading" @click="loadDetail">重试</el-button>
      </el-alert>
      <el-alert
        v-if="editLocked"
        title="竞赛已开赛，无法修改基本信息或题目"
        type="warning"
        show-icon
        :closable="false"
        class="form-alert"
      />
      <el-alert
        v-if="createdWithoutId"
        title="竞赛已创建，但创建接口未返回竞赛 ID，暂无法关联题目。"
        type="warning"
        show-icon
        :closable="false"
        class="form-alert"
        ><el-button size="small" @click="startAnotherContest">新建另一场竞赛</el-button></el-alert
      >
      <el-form
        v-if="!isEdit || detailLoaded"
        :model="form"
        label-width="100px"
        class="basic-form"
        @submit.prevent="saveBasic"
      >
        <el-form-item label="竞赛标题" :error="showError('title')">
          <el-input
            v-model="form.title"
            :disabled="editLocked"
            maxlength="50"
            show-word-limit
            placeholder="请输入竞赛标题"
            aria-label="竞赛标题"
            @blur="touch('title')"
            @input="touch('title')"
          />
        </el-form-item>
        <el-form-item label="开始时间" :error="showError('startTime')">
          <el-date-picker
            v-model="form.startTime"
            :disabled="editLocked"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择开始时间"
            aria-label="竞赛开始时间"
            @change="touch('startTime')"
          />
        </el-form-item>
        <el-form-item label="结束时间" :error="showError('endTime')">
          <el-date-picker
            v-model="form.endTime"
            :disabled="editLocked"
            type="datetime"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择结束时间"
            aria-label="竞赛结束时间"
            @change="touch('endTime')"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="saving"
            :disabled="detailLoading || createdWithoutId || editLocked"
          >
            保存基本信息
          </el-button>
          <span class="form-hint">保存后可继续添加题目</span>
        </el-form-item>
      </el-form>
    </section>

    <section
      v-if="contestId"
      class="form-card question-card"
      v-loading="questionsLoading"
      element-loading-text="正在加载题目…"
    >
      <div class="section-head">
        <div>
          <h3>竞赛题目</h3>
          <p>共 {{ contestQuestions.length }} 道题目</p>
        </div>
        <el-button
          type="primary"
          :icon="Plus"
          :disabled="!contestId || !detailLoaded || editLocked"
          @click="openPicker"
          >添加题目</el-button
        >
      </div>
      <el-alert
        v-if="deleteError"
        :title="`删除题目“${deleteError.title}”失败：${deleteError.message}`"
        type="error"
        show-icon
        closable
        class="form-alert"
        @close="deleteError = null"
      >
        <el-button
          size="small"
          :loading="deletingIds.has(deleteError.id)"
          :disabled="editLocked"
          @click="retryDelete"
        >
          重试
        </el-button>
      </el-alert>
      <el-table
        v-if="detailLoaded"
        :data="visibleQuestions"
        stripe
        border
        style="width: 100%"
        class="question-table"
      >
        <el-table-column prop="id" label="题目ID" min-width="180" />
        <el-table-column prop="title" label="题目标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }"
            ><span class="ellipsis-title" :title="row.title">{{ row.title }}</span></template
          >
        </el-table-column>
        <el-table-column label="难度" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="difficultyType(row.difficulty)" size="small">{{
              difficultyLabel(row.difficulty)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              :loading="deletingIds.has(row.id)"
              :disabled="editLocked || deletingIds.has(row.id)"
              :aria-label="`删除题目 ${row.title}`"
              @click="requestDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty
          ><div class="empty-message">暂无题目，点击“添加题目”从题库选择</div></template
        >
      </el-table>
      <el-pagination
        v-if="detailLoaded && contestQuestions.length > questionPageSize"
        v-model:current-page="questionPage"
        :page-size="questionPageSize"
        :total="contestQuestions.length"
        layout="prev, pager, next"
        background
        class="table-pagination"
      />
    </section>

    <el-dialog
      v-model="deleteDialogVisible"
      title="删除题目"
      width="min(480px, 92vw)"
      class="delete-confirm-dialog"
      :close-on-click-modal="!confirmingDelete"
      :close-on-press-escape="!confirmingDelete"
      :show-close="!confirmingDelete"
      @closed="resetDeleteDialog"
    >
      <p class="delete-warning">确定要删除题目“{{ pendingDelete?.title }}”吗？此操作不可撤销。</p>
      <el-checkbox v-model="skipFutureDeleteConfirmation" :disabled="confirmingDelete">
        下次不再提醒
      </el-checkbox>
      <template #footer>
        <el-button :disabled="confirmingDelete" @click="deleteDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="confirmingDelete"
          :disabled="confirmingDelete"
          @click="confirmDelete"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="pickerVisible"
      title="选择题目"
      width="min(900px, 96vw)"
      :close-on-click-modal="!adding"
      :close-on-press-escape="!adding"
      :show-close="!adding"
    >
      <div class="picker-filters">
        <el-input
          v-model="searchTitle"
          clearable
          placeholder="搜索题目标题"
          aria-label="搜索题目标题"
          @keyup.enter="applySearch"
        />
        <el-select
          v-model="searchDifficulty"
          clearable
          placeholder="全部难度"
          aria-label="按难度筛选"
          @change="applySearch"
        >
          <el-option
            v-for="option in difficultyOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button :icon="Search" @click="applySearch">搜索</el-button>
      </div>
      <el-alert
        v-if="pickerError"
        :title="pickerError"
        type="error"
        show-icon
        :closable="false"
        class="form-alert"
      >
        <el-button size="small" @click="loadAvailableQuestions">重试</el-button>
      </el-alert>
      <el-table
        :data="availableQuestions"
        v-loading="pickerLoading"
        element-loading-text="正在加载题库…"
        max-height="380"
        border
      >
        <el-table-column label="选择" width="62" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="selectedIds.has(row.id)"
              :disabled="existingIds.has(row.id)"
              :aria-label="'选择题目 ' + row.title"
              @change="toggleSelection(row.id, $event)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="id" label="题目ID" min-width="175" />
        <el-table-column prop="title" label="题目标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="难度" width="90" align="center">
          <template #default="{ row }"
            ><el-tag :type="difficultyType(row.difficulty)" size="small">{{
              difficultyLabel(row.difficulty)
            }}</el-tag></template
          >
        </el-table-column>
        <template #empty><div class="empty-message">没有匹配的题目</div></template>
      </el-table>
      <div class="picker-bottom">
        <span>已选择 {{ selectedIds.size }} 道题目</span>
        <el-pagination
          v-model:current-page="pickerPage"
          :page-size="pickerPageSize"
          :total="pickerTotal"
          layout="prev, pager, next"
          background
          :disabled="pickerLoading"
          @current-change="loadAvailableQuestions"
        />
      </div>
      <template #footer>
        <el-button :disabled="adding" @click="pickerVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="adding"
          :disabled="!selectedIds.size || pickerLoading"
          @click="confirmAdd"
          >确认添加</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  addContestQuestions,
  clearContestResultsCache,
  createContest,
  deleteContestQuestion,
  getContestDetail,
  updateContest,
} from '@/api/contest'
import { formatContestTime, hasStarted, parseContestTimestamp } from '@/api/contestPolicy'
import { BASE_DIFFICULTY_OPTIONS, getProblemPage, mapProblemFromApi } from '@/api/problem'
import {
  clearQuestionDeleteConfirmationPreference,
  createQuestionDeleteConfirmationSession,
  saveQuestionDeleteConfirmationPreference,
  shouldSkipQuestionDeleteConfirmation,
} from '@/utils/deleteConfirmationPreference'

const route = useRoute()
const router = useRouter()
const draftKey = 'contestCreateDraft'
const createdKey = 'contestCreatedWithoutId'
const isEdit = computed(() => route.name === 'contestEdit')
const contestId = ref(isEdit.value ? String(route.params.examId || '') : '')
const form = reactive({ title: '', startTime: '', endTime: '' })
const touched = reactive({ title: false, startTime: false, endTime: false })
const attempted = ref(false)
const savedForm = ref(JSON.stringify({ title: '', startTime: '', endTime: '' }))
const saving = ref(false)
const detailLoading = ref(false)
const detailLoaded = ref(false)
const originalStartTime = ref('')
const now = ref(Date.now())
const formError = ref('')
const createdWithoutId = ref(false)
const contestQuestions = ref([])
const questionsLoading = ref(false)
const questionsError = ref('')
const questionPage = ref(1)
const questionPageSize = 10
const pickerVisible = ref(false)
const pickerLoading = ref(false)
const pickerError = ref('')
const searchTitle = ref('')
const searchDifficulty = ref('')
const appliedTitle = ref('')
const appliedDifficulty = ref('')
const pickerPage = ref(1)
const pickerPageSize = 10
const pickerTotal = ref(0)
const availableQuestions = ref([])
const selectedIds = reactive(new Set())
const adding = ref(false)
const deletingIds = reactive(new Set())
const deleteDialogVisible = ref(false)
const pendingDelete = ref(null)
const skipFutureDeleteConfirmation = ref(false)
const confirmingDelete = ref(false)
const deleteError = ref(null)
let pickerRequestId = 0
let detailRequestId = 0
let startTimeTimer
let deleteConfirmationSessionId = createQuestionDeleteConfirmationSession()

const difficultyOptions = BASE_DIFFICULTY_OPTIONS
const difficultyLabel = (value) =>
  difficultyOptions.find((item) => item.value === Number(value))?.label || '未知'
const difficultyType = (value) =>
  difficultyOptions.find((item) => item.value === Number(value))?.tagType || 'info'
const existingIds = computed(() => new Set(contestQuestions.value.map((item) => item.id)))
const visibleQuestions = computed(() =>
  contestQuestions.value.slice(
    (questionPage.value - 1) * questionPageSize,
    questionPage.value * questionPageSize,
  ),
)
const editLocked = computed(
  () =>
    isEdit.value &&
    detailLoaded.value &&
    hasStarted({ startTime: originalStartTime.value }, now.value),
)
watch(editLocked, (locked) => {
  if (!locked) return
  pickerVisible.value = false
  if (!confirmingDelete.value) deleteDialogVisible.value = false
})
const currentForm = () =>
  JSON.stringify({ title: form.title.trim(), startTime: form.startTime, endTime: form.endTime })
const dirty = computed(() => currentForm() !== savedForm.value)
const errors = computed(() => {
  const result = {}
  const title = form.title.trim()
  if (!title) result.title = '请输入竞赛标题'
  else if (Array.from(title).length > 50) result.title = '竞赛标题不能超过 50 个字符'
  if (!form.startTime) result.startTime = '请选择开始时间'
  else if (parseContestTimestamp(form.startTime) == null) result.startTime = '开始时间格式不正确'
  else if (!contestId.value && parseContestTimestamp(form.startTime) < Date.now())
    result.startTime = '开始时间不能早于当前时间'
  if (!form.endTime) result.endTime = '请选择结束时间'
  else if (parseContestTimestamp(form.endTime) == null) result.endTime = '结束时间格式不正确'
  else if (
    !result.startTime &&
    parseContestTimestamp(form.endTime) <= parseContestTimestamp(form.startTime)
  )
    result.endTime = '结束时间必须晚于开始时间'
  return result
})
const touch = (field) => {
  touched[field] = true
  formError.value = ''
}
const showError = (field) => (touched[field] || attempted.value ? errors.value[field] || '' : '')
const normalizeTime = (value) => formatContestTime(value, true).replace('—', '')
const mapQuestion = (raw) => mapProblemFromApi(raw)
const startAnotherContest = () => {
  createdWithoutId.value = false
  Object.assign(form, { title: '', startTime: '', endTime: '' })
  attempted.value = false
  Object.assign(touched, { title: false, startTime: false, endTime: false })
  savedForm.value = currentForm()
  try {
    localStorage.removeItem(createdKey)
    localStorage.removeItem(draftKey)
  } catch {
    /* storage unavailable */
  }
}

watch(
  () => [form.title, form.startTime, form.endTime],
  () => {
    if (contestId.value || createdWithoutId.value) return
    try {
      localStorage.setItem(draftKey, currentForm())
    } catch {
      /* storage unavailable */
    }
  },
)

const loadDetail = async () => {
  if (!contestId.value) return
  const requestId = ++detailRequestId
  const id = contestId.value
  detailLoading.value = true
  questionsLoading.value = true
  questionsError.value = ''
  detailLoaded.value = false
  try {
    const detail = await getContestDetail(id)
    if (requestId !== detailRequestId) return
    Object.assign(form, {
      title: detail?.title || '',
      startTime: normalizeTime(detail?.startTime),
      endTime: normalizeTime(detail?.endTime),
    })
    originalStartTime.value = detail.startTime
    now.value = Date.now()
    contestQuestions.value = (detail?.examQuestionList || []).map(mapQuestion)
    questionPage.value = Math.min(
      questionPage.value,
      Math.max(1, Math.ceil(contestQuestions.value.length / questionPageSize)),
    )
    savedForm.value = currentForm()
    detailLoaded.value = true
  } catch (error) {
    if (requestId !== detailRequestId) return
    questionsError.value = error?.message || '加载竞赛详情失败，请检查网络连接'
    if (!error?.handled) ElMessage.error(questionsError.value)
  } finally {
    if (requestId === detailRequestId) {
      detailLoading.value = false
      questionsLoading.value = false
    }
  }
}

watch(
  () => route.params.examId,
  (id) => {
    if (!isEdit.value || !id || String(id) === contestId.value) return
    clearQuestionDeleteConfirmationPreference(contestId.value, deleteConfirmationSessionId)
    contestId.value = String(id)
    deleteConfirmationSessionId = createQuestionDeleteConfirmationSession()
    originalStartTime.value = ''
    questionPage.value = 1
    contestQuestions.value = []
    deleteError.value = null
    deleteDialogVisible.value = false
    loadDetail()
  },
)

const saveBasic = async () => {
  if (editLocked.value) return
  attempted.value = true
  if (Object.keys(errors.value).length || saving.value) return
  saving.value = true
  formError.value = ''
  const values = { title: form.title.trim(), startTime: form.startTime, endTime: form.endTime }
  try {
    if (contestId.value) {
      await updateContest(contestId.value, values)
      ElMessage.success('竞赛基本信息已保存')
    } else {
      const id = await createContest(values)
      createdWithoutId.value = !id
      if (id) contestId.value = id
      else {
        try {
          localStorage.setItem(createdKey, currentForm())
        } catch {
          /* storage unavailable */
        }
      }
      ElMessage.success('竞赛创建成功')
    }
    savedForm.value = currentForm()
    clearContestResultsCache()
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* storage unavailable */
    }
    if (contestId.value && !isEdit.value)
      await router.replace({ name: 'contestEdit', params: { examId: contestId.value } })
    if (contestId.value) await loadDetail()
  } catch (error) {
    formError.value = error?.message || '保存失败，请检查网络连接后重试'
    if (!error?.handled) ElMessage.error(formError.value)
  } finally {
    saving.value = false
  }
}

const loadAvailableQuestions = async () => {
  const requestId = ++pickerRequestId
  pickerLoading.value = true
  pickerError.value = ''
  try {
    const page = await getProblemPage(
      {
        current: pickerPage.value,
        size: pickerPageSize,
        title: appliedTitle.value,
        difficulty: appliedDifficulty.value,
      },
      { force: true },
    )
    if (requestId !== pickerRequestId) return
    availableQuestions.value = page.records
    pickerTotal.value = page.total
  } catch (error) {
    if (requestId !== pickerRequestId) return
    pickerError.value = error?.message || '题目加载失败，请检查网络连接'
    if (!error?.handled) ElMessage.error(pickerError.value)
  } finally {
    if (requestId === pickerRequestId) pickerLoading.value = false
  }
}
const openPicker = () => {
  if (!contestId.value || editLocked.value) return
  pickerVisible.value = true
  selectedIds.clear()
  pickerPage.value = 1
  loadAvailableQuestions()
}
const applySearch = () => {
  appliedTitle.value = searchTitle.value.trim()
  appliedDifficulty.value = searchDifficulty.value
  pickerPage.value = 1
  loadAvailableQuestions()
}
const toggleSelection = (id, checked) => {
  if (checked) selectedIds.add(id)
  else selectedIds.delete(id)
}
const confirmAdd = async () => {
  if (!contestId.value || !selectedIds.size || adding.value || editLocked.value) return
  adding.value = true
  pickerError.value = ''
  try {
    await addContestQuestions(contestId.value, [...selectedIds])
    ElMessage.success('题目添加成功')
    pickerVisible.value = false
    selectedIds.clear()
    await loadDetail()
  } catch (error) {
    pickerError.value = error?.message || '添加题目失败，请检查网络连接后重试'
    if (!error?.handled) ElMessage.error(pickerError.value)
  } finally {
    adding.value = false
  }
}

const resetDeleteDialog = () => {
  if (confirmingDelete.value) return
  pendingDelete.value = null
  skipFutureDeleteConfirmation.value = false
}

const removeQuestionFromList = (questionId) => {
  contestQuestions.value = contestQuestions.value.filter((item) => item.id !== questionId)
  questionPage.value = Math.min(
    questionPage.value,
    Math.max(1, Math.ceil(contestQuestions.value.length / questionPageSize)),
  )
}

const performDelete = async (question) => {
  if (!contestId.value || !question?.id || deletingIds.has(question.id) || editLocked.value) return
  const examId = contestId.value
  deletingIds.add(question.id)
  deleteError.value = null
  try {
    await deleteContestQuestion(examId, question.id)
    if (contestId.value === examId) removeQuestionFromList(question.id)
    ElMessage.success(`题目“${question.title}”已删除`)
    return true
  } catch (error) {
    if (contestId.value === examId)
      deleteError.value = {
        id: question.id,
        title: question.title,
        message: error?.message || '网络异常，请检查连接后重试',
      }
    return false
  } finally {
    deletingIds.delete(question.id)
  }
}

const requestDelete = (question) => {
  if (deletingIds.has(question.id) || editLocked.value) return
  if (shouldSkipQuestionDeleteConfirmation(contestId.value, deleteConfirmationSessionId)) {
    performDelete(question)
    return
  }
  pendingDelete.value = question
  skipFutureDeleteConfirmation.value = false
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!pendingDelete.value || confirmingDelete.value) return
  confirmingDelete.value = true
  const question = pendingDelete.value
  try {
    if (
      skipFutureDeleteConfirmation.value &&
      !saveQuestionDeleteConfirmationPreference(contestId.value, deleteConfirmationSessionId)
    ) {
      ElMessage.warning('浏览器未能保存提醒偏好，下次删除时仍会询问确认')
    }
    await performDelete(question)
    deleteDialogVisible.value = false
  } finally {
    confirmingDelete.value = false
  }
}

const retryDelete = () => {
  if (!deleteError.value) return
  performDelete({ id: deleteError.value.id, title: deleteError.value.title })
}

const clearDeleteConfirmationSession = () => {
  if (!contestId.value) return
  clearQuestionDeleteConfirmationPreference(contestId.value, deleteConfirmationSessionId)
}

const beforeUnload = (event) => {
  if (!dirty.value || saving.value) return
  event.preventDefault()
  event.returnValue = ''
}
onBeforeRouteLeave(async () => {
  if (!dirty.value || saving.value) return true
  try {
    await ElMessageBox.confirm('基本信息尚未保存，确定离开吗？', '未保存的修改', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
    })
    return true
  } catch {
    return false
  }
})
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('pagehide', clearDeleteConfirmationSession)
  startTimeTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  if (contestId.value) loadDetail()
  else {
    try {
      const created = JSON.parse(localStorage.getItem(createdKey) || 'null')
      if (created && typeof created === 'object') {
        Object.assign(form, {
          title: created.title || '',
          startTime: created.startTime || '',
          endTime: created.endTime || '',
        })
        createdWithoutId.value = true
        savedForm.value = currentForm()
        return
      }
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null')
      if (draft && typeof draft === 'object')
        Object.assign(form, {
          title: draft.title || '',
          startTime: draft.startTime || '',
          endTime: draft.endTime || '',
        })
    } catch {
      /* ignore invalid draft */
    }
    savedForm.value = JSON.stringify({ title: '', startTime: '', endTime: '' })
  }
})
onBeforeUnmount(() => {
  detailRequestId += 1
  clearDeleteConfirmationSession()
  clearInterval(startTimeTimer)
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('pagehide', clearDeleteConfirmationSession)
})
</script>

<style lang="scss" scoped>
.contest-form-page {
  max-width: 1080px;
  margin: 0 auto;
}
.form-head,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.form-head {
  margin-bottom: 18px;
}
h2,
h3,
p {
  margin: 0;
}
h2 {
  font-size: 20px;
  color: var(--app-text-primary);
}
h3 {
  font-size: 17px;
  color: var(--app-text-primary);
}
p,
.form-hint,
.picker-bottom {
  color: var(--app-text-regular);
}
.form-head p,
.section-head p {
  margin-top: 5px;
  font-size: 13px;
}
.form-card {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius);
  box-shadow: var(--app-shadow);
  padding: 24px;
  margin-bottom: 20px;
}
.section-head {
  margin-bottom: 20px;
}
.form-alert {
  margin-bottom: 18px;
}
.basic-form {
  max-width: 620px;
}
.basic-form :deep(.el-date-editor) {
  width: 100%;
}
.form-hint {
  margin-left: 12px;
  font-size: 12px;
}
.ellipsis-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
.empty-message {
  text-align: center;
  padding: 20px;
  color: var(--app-text-secondary);
}
.delete-warning {
  margin-bottom: 18px;
  color: var(--app-text-primary);
  line-height: 1.6;
}
:deep(.delete-confirm-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.picker-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.picker-filters .el-input {
  flex: 1;
}
.picker-filters .el-select {
  width: 140px;
}
.picker-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  font-size: 13px;
}
@media (max-width: 767px) {
  .form-card {
    padding: 16px 12px;
  }
  .form-head {
    align-items: flex-start;
  }
  .picker-filters {
    flex-wrap: wrap;
  }
  .picker-filters .el-input {
    flex-basis: 100%;
  }
  .picker-bottom {
    flex-wrap: wrap;
  }
  .question-table {
    overflow-x: auto;
  }
  :deep(.delete-confirm-dialog .el-dialog__footer) {
    flex-wrap: wrap;
  }
}
</style>
