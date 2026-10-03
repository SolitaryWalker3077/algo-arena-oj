<template>
  <main class="destination-page">
    <button class="back-button" type="button" @click="goBack">← 返回竞赛</button>
    <section class="destination-card">
      <span class="destination-kicker">{{ modeContent.kicker }}</span>
      <h1>{{ contestTitle }}</h1>
      <p>{{ modeContent.description }}</p>
      <dl>
        <div><dt>竞赛编号</dt><dd>{{ route.params.examId }}</dd></div>
        <div><dt>当前模块</dt><dd>{{ modeContent.label }}</dd></div>
      </dl>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const contentByMode = {
  answer: { kicker: 'CONTEST', label: '竞赛答题', description: '答题入口已完成路由衔接，题目内容将由竞赛题目接口加载。' },
  practice: { kicker: 'PRACTICE', label: '竞赛练习', description: '练习入口已完成路由衔接，支持后续接入题目练习模块。' },
  ranking: { kicker: 'RANKING', label: '竞赛排名', description: '排名入口已完成路由衔接，支持后续接入竞赛榜单接口。' },
}

const modeContent = computed(() => contentByMode[route.meta.contestMode] || contentByMode.answer)
const contestTitle = computed(() => (
  typeof route.query.title === 'string' && route.query.title.trim() ? route.query.title : '竞赛详情'
))

function goBack() {
  router.push({ name: 'exam', query: { view: 'registration' } })
}
</script>

<style lang="scss" scoped>
.destination-page { max-width: 960px; margin: 0 auto; padding: 38px 0 64px; }
.back-button { margin-bottom: 18px; color: #5b6870; font-size: 14px; cursor: pointer; }
.back-button:hover { color: #20b9f4; }
.destination-card { padding: 42px; border: 1px solid #eaf0f3; border-radius: 16px; background: #fff; box-shadow: 0 14px 42px rgb(39 74 92 / 7%); }
.destination-kicker { color: #32bced; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; }
h1 { margin: 8px 0 10px; color: #1f272c; font-size: 28px; }
p { margin: 0 0 28px; color: #77828a; line-height: 1.7; }
dl { margin: 0; padding-top: 22px; border-top: 1px solid #edf1f3; }
dl div { display: flex; margin: 10px 0; font-size: 14px; }
dt { width: 90px; color: #9aa3a9; }
dd { margin: 0; color: #4e5960; }
@media (max-width: 760px) {
  .destination-page { padding: 24px 0 40px; }
  .destination-card { padding: 26px 20px; border-radius: 12px; }
  h1 { font-size: 22px; }
}
</style>

