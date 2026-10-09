<template>
  <main class="message-page" aria-labelledby="message-title">
    <PageHeader id="message-title" eyebrow="NOTIFICATION CENTER" title="消息中心" description="集中查看竞赛、评测与系统通知。">
      <button class="back-button" type="button" @click="goBack">← 返回</button>
    </PageHeader>

    <PreviewNotice v-if="previewMode" class="preview-banner" />

    <section class="message-panel">
      <header class="message-toolbar">
        <div class="message-label">全部消息</div>
        <button class="read-all" type="button" :disabled="!unreadCount" @click="markAllRead">全部标为已读</button>
      </header>

      <div v-if="loading" class="message-loading" aria-label="消息正在加载">
        <el-skeleton v-for="index in 4" :key="index" animated :rows="2" />
      </div>

      <div v-else-if="!visibleMessages.length" class="empty-state">
        <div aria-hidden="true">✓</div><h2>暂无消息</h2><p>有新的动态时，我们会第一时间通知你。</p>
      </div>

      <ul v-else class="message-list">
        <li v-for="item in visibleMessages" :key="item.messageId" :class="{ 'is-unread': !item.read }" @click="markRead(item)">
          <div class="message-icon" :class="`is-${item.type}`"><img src="@/assets/message/notice.png" alt=""></div>
          <div class="message-content">
            <div class="message-title-row"><span v-if="!item.read" class="unread-dot" aria-label="未读"></span><h2>{{ item.messageTitle }}</h2><time>{{ item.createTime }}</time></div>
            <p>{{ item.messageContent }}</p>
          </div>
          <button class="delete-button" type="button" aria-label="删除此消息" @click.stop="removeMessage(item)">删除</button>
        </li>
      </ul>

      <el-pagination v-if="messages.length > pageSize" class="pagination" background layout="prev, pager, next" :current-page="pageNum" :page-size="pageSize" :total="messages.length" @current-change="pageNum = $event" />
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PreviewNotice from '@/components/PreviewNotice.vue'
import { deleteMessageService, getMessageListService } from '@/apis/message'
import { demoMessages } from '@/data/demoData'
import { withPreviewFallback } from '@/utils/previewFallback'

const router = useRouter()
const messages = ref([])
const loading = ref(true)
const previewMode = ref(false)
const pageNum = ref(1)
const pageSize = 8
let controller

const unreadCount = computed(() => messages.value.filter((item) => !item.read).length)
const visibleMessages = computed(() => messages.value.slice((pageNum.value - 1) * pageSize, pageNum.value * pageSize))

function normalizeMessage(item, index) {
  return {
    messageId: String(item?.messageId ?? item?.id ?? index),
    messageTitle: item?.messageTitle || item?.title || '系统通知',
    messageContent: item?.messageContent || item?.content || '暂无详细内容',
    createTime: item?.createTime || item?.sendTime || '',
    read: Boolean(item?.read ?? item?.isRead),
    type: item?.type || 'system',
  }
}

async function loadMessages() {
  controller = new AbortController()
  loading.value = true
  try {
    const result = await withPreviewFallback(
      () => getMessageListService({ pageNum: 1, pageSize: 100 }, { signal: controller.signal }),
      { rows: demoMessages, total: demoMessages.length },
    )
    previewMode.value = result.preview
    messages.value = (Array.isArray(result.data?.rows) ? result.data.rows : []).map(normalizeMessage)
  } finally {
    loading.value = false
  }
}

function markRead(item) {
  item.read = true
}

function markAllRead() {
  messages.value.forEach((item) => { item.read = true })
  ElMessage.success('已将全部消息标为已读')
}

async function removeMessage(item) {
  try {
    await ElMessageBox.confirm('删除后此消息将不再显示，确定继续吗？', '删除消息', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }

  if (!previewMode.value) {
    try {
      await deleteMessageService(item.messageId)
    } catch (error) {
      if (error?.code === 3001) return
      previewMode.value = true
    }
  }
  messages.value = messages.value.filter((message) => message.messageId !== item.messageId)
  ElMessage.success(previewMode.value ? '已从当前预览中移除' : '消息已删除')
}

function goBack() {
  router.back()
}

onMounted(loadMessages)
onBeforeUnmount(() => controller?.abort())
</script>

<style lang="scss" scoped>
.message-page { max-width: 1180px; margin: 0 auto; padding: 34px 0 64px; }
.back-button { height: 38px; padding: 0 15px; border: 1px solid #dfe7ea; border-radius: 7px; color: #64727a; background: #fff; cursor: pointer; }
.preview-banner { margin-top: 20px; }
.message-panel { margin-top: 22px; overflow: hidden; border: 1px solid #eaf0f2; border-radius: 14px; background: #fff; box-shadow: 0 12px 36px rgb(38 65 79 / 5%); }
.message-toolbar { display: flex; min-height: 66px; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid #edf1f3; }
.message-label { position: relative; display: flex; align-items: center; align-self: stretch; color: #26343b; font-size: 14px; font-weight: 650; }
.message-label::after { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; background: #32c5ff; content: ''; }
.read-all { color: #1bb6ee; font-size: 13px; cursor: pointer; }.read-all:disabled { color: #b4bdc2; cursor: default; }
.message-list { margin: 0; padding: 0 22px; list-style: none; }
.message-list li { display: grid; min-height: 112px; grid-template-columns: 48px minmax(0, 1fr) 54px; align-items: center; gap: 16px; padding: 18px 4px; border-bottom: 1px solid #eff2f3; cursor: pointer; transition: background .18s; }
.message-list li:last-child { border-bottom: 0; }.message-list li:hover { background: #fbfdfe; }.message-list li.is-unread { background: linear-gradient(90deg, #f4fbfe, #fff 35%); }
.message-icon { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 12px; background: #edf9fe; }.message-icon img { width: 24px; height: 24px; object-fit: contain; }.message-icon.is-contest { background: #fff6e8; }.message-icon.is-judge { background: #eefaf5; }.message-icon.is-report { background: #f2efff; }
.message-content { min-width: 0; }.message-title-row { display: flex; align-items: center; gap: 8px; }.message-title-row h2 { margin: 0; color: #2b373e; font-size: 15px; }.message-title-row time { margin-left: auto; color: #a2acb1; font-size: 11px; }.unread-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: #32c5ff; }
.message-content p { margin: 9px 0 0; overflow: hidden; color: #758189; font-size: 13px; line-height: 1.7; text-overflow: ellipsis; white-space: nowrap; }
.delete-button { visibility: hidden; color: #e26963; font-size: 12px; cursor: pointer; }.message-list li:hover .delete-button, .delete-button:focus { visibility: visible; }
.message-loading { display: grid; gap: 28px; padding: 30px 26px; }.empty-state { display: grid; min-height: 360px; place-items: center; align-content: center; color: #98a4aa; text-align: center; }.empty-state div { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 50%; color: #27b988; background: #edfaf5; font-size: 24px; }.empty-state h2 { margin: 15px 0 6px; color: #4f5d64; font-size: 18px; }.empty-state p { margin: 0; font-size: 13px; }
.pagination { justify-content: flex-end; padding: 18px 22px; border-top: 1px solid #edf1f3; }
@media (max-width: 640px) { .message-page { padding-top: 24px; }.message-toolbar { padding: 0 14px; }.message-list { padding: 0 12px; }.message-list li { min-height: 126px; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; }.message-icon { width: 40px; height: 40px; }.message-title-row { align-items: flex-start; flex-wrap: wrap; }.message-title-row time { width: 100%; margin-left: 0; }.message-content p { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal; }.delete-button { display: none; }.read-all { font-size: 12px; } }
</style>

