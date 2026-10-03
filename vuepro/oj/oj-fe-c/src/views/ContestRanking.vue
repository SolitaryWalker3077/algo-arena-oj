<template>
  <main class="ranking-page" aria-labelledby="ranking-title">
    <PageHeader id="ranking-title" eyebrow="CONTEST RANKING" :title="contestTitle" description="按解题数、总分与罚时展示竞赛排名。">
      <button class="back-button" type="button" @click="router.push({ name: 'exam', query: { status: 'history' } })">← 返回竞赛</button>
    </PageHeader>
    <PreviewNotice v-if="previewMode" class="preview-banner" description="排名接口尚未开放，当前榜单为界面演示数据。" />

    <section class="podium" aria-label="前三名">
      <article v-for="item in podium" :key="item.userId" :class="`rank-${item.rank}`">
        <span class="medal">{{ item.rank }}</span><div class="avatar">{{ item.nickName.slice(0, 1) }}</div><h2>{{ item.nickName }}</h2><p>{{ item.score }} 分 · {{ item.solved }} 题</p>
      </article>
    </section>

    <section class="ranking-panel">
      <header><div><h2>实时排行榜</h2><p>榜单更新时间：{{ updateTime }}</p></div><label><span aria-hidden="true">⌕</span><input v-model.trim="keyword" placeholder="搜索参赛者" aria-label="搜索参赛者"></label></header>
      <div v-if="loading" class="loading-list"><el-skeleton animated :rows="8" /></div>
      <div v-else class="ranking-table-wrap">
        <table>
          <thead><tr><th>排名</th><th>参赛者</th><th>解题数</th><th>总分</th><th>罚时</th></tr></thead>
          <tbody><tr v-for="item in filteredRanking" :key="item.userId"><td><strong :class="{ 'top-rank': item.rank <= 3 }">{{ item.rank }}</strong></td><td><div class="user-cell"><span>{{ item.nickName.slice(0, 1) }}</span><b>{{ item.nickName }}</b></div></td><td>{{ item.solved }}</td><td class="score">{{ item.score }}</td><td>{{ item.penalty }} min</td></tr></tbody>
        </table>
        <div v-if="!filteredRanking.length" class="empty-ranking">没有找到匹配的参赛者</div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PreviewNotice from '@/components/PreviewNotice.vue'
import { getExamRanking } from '@/apis/exam'
import { demoRanking } from '@/data/demoData'
import { withPreviewFallback } from '@/utils/previewFallback'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const previewMode = ref(false)
const ranking = ref([])
const keyword = ref('')
const controller = new AbortController()
const contestTitle = computed(() => typeof route.query.title === 'string' && route.query.title ? route.query.title : '竞赛排行榜')
const podium = computed(() => ranking.value.slice(0, 3))
const filteredRanking = computed(() => ranking.value.filter((item) => item.nickName.toLowerCase().includes(keyword.value.toLowerCase())))
const updateTime = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date())

async function loadRanking() {
  loading.value = true
  try {
    const result = await withPreviewFallback(
      () => getExamRanking(route.params.examId, { pageNum: 1, pageSize: 100 }, { signal: controller.signal }),
      { rows: demoRanking },
    )
    previewMode.value = result.preview
    const rows = Array.isArray(result.data?.rows) ? result.data.rows : []
    ranking.value = rows.map((item, index) => ({
      rank: Number(item.rank) || index + 1,
      userId: String(item.userId ?? index),
      nickName: item.nickName || item.userName || `参赛者 ${index + 1}`,
      solved: Number(item.solved ?? item.passCount) || 0,
      score: Number(item.score) || 0,
      penalty: Number(item.penalty ?? item.useTime) || 0,
    }))
  } finally {
    loading.value = false
  }
}

onMounted(loadRanking)
onBeforeUnmount(() => controller.abort())
</script>

<style lang="scss" scoped>
.ranking-page { max-width: 1120px; margin: 0 auto; padding: 34px 0 70px; }.back-button { height: 39px; padding: 0 15px; border: 1px solid #dce5e8; border-radius: 7px; color: #637179; background: #fff; cursor: pointer; }.preview-banner { margin-top: 20px; }
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 14px; min-height: 270px; padding: 38px 20px 22px; }.podium article { position: relative; display: flex; width: 190px; height: 186px; align-items: center; flex-direction: column; padding: 25px 15px 15px; border: 1px solid #e7eef0; border-radius: 14px 14px 6px 6px; background: #fff; box-shadow: 0 12px 30px rgb(42 69 83 / 6%); }.podium article.rank-1 { order: 2; height: 218px; border-color: #f4db94; background: linear-gradient(160deg, #fffaf0, #fff 55%); }.podium article.rank-2 { order: 1; }.podium article.rank-3 { order: 3; }.medal { position: absolute; top: -15px; display: grid; width: 32px; height: 32px; place-items: center; border: 3px solid #fff; border-radius: 50%; color: #fff; background: #aeb8bd; box-shadow: 0 4px 10px rgb(45 62 70 / 16%); font-weight: 700; }.rank-1 .medal { background: #f2b93f; }.rank-2 .medal { background: #91a7b1; }.rank-3 .medal { background: #c9895f; }.avatar { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 50%; color: #fff; background: linear-gradient(135deg, #65d6fa, #32aee9); font-size: 20px; font-weight: 650; }.podium h2 { margin: 13px 0 6px; color: #354249; font-size: 15px; }.podium p { margin: 0; color: #909ba1; font-size: 11px; }
.ranking-panel { overflow: hidden; border: 1px solid #e8eef0; border-radius: 14px; background: #fff; box-shadow: 0 12px 34px rgb(40 68 82 / 5%); }.ranking-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px 24px; border-bottom: 1px solid #edf1f3; }.ranking-panel h2 { margin: 0; color: #2f3d44; font-size: 17px; }.ranking-panel header p { margin: 5px 0 0; color: #9ca6ab; font-size: 10px; }.ranking-panel label { display: flex; width: 220px; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid #e0e7e9; border-radius: 7px; background: #f9fbfc; }.ranking-panel label span { color: #9ca6ab; }.ranking-panel input { width: 100%; outline: 0; font: inherit; font-size: 12px; }.ranking-table-wrap { overflow-x: auto; }.ranking-panel table { width: 100%; border-collapse: collapse; }.ranking-panel th, .ranking-panel td { height: 58px; padding: 0 24px; border-bottom: 1px solid #eff2f3; color: #69767d; font-size: 12px; text-align: left; }.ranking-panel th { height: 42px; color: #9aa5aa; background: #f8fafb; font-size: 10px; font-weight: 600; }.ranking-panel tbody tr:hover { background: #fbfdfe; }.ranking-panel td > strong { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 6px; color: #7e8a90; }.ranking-panel td > strong.top-rank { color: #1eb4eb; background: #eaf9ff; }.user-cell { display: flex; align-items: center; gap: 10px; }.user-cell span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; color: #168eb9; background: #e9f8fd; font-size: 11px; }.user-cell b { color: #3e4b52; font-weight: 600; }.score { color: #22a77d !important; font-weight: 650; }.loading-list { padding: 28px; }.empty-ranking { padding: 50px; color: #99a4a9; text-align: center; }
@media (max-width: 660px) { .ranking-page { padding-top: 24px; }.podium { gap: 5px; min-height: 230px; padding-right: 0; padding-left: 0; }.podium article { width: 32%; height: 162px; padding-right: 5px; padding-left: 5px; }.podium article.rank-1 { height: 188px; }.avatar { width: 46px; height: 46px; }.podium h2 { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ranking-panel > header { align-items: stretch; flex-direction: column; }.ranking-panel label { width: 100%; }.ranking-panel th, .ranking-panel td { min-width: 72px; padding: 0 12px; }.ranking-panel th:nth-child(2), .ranking-panel td:nth-child(2) { min-width: 150px; } }
</style>

