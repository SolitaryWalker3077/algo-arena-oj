<template>
  <article class="contest-card">
    <div class="cover-wrap">
      <img
        src="@/assets/images/exam.png"
        alt=""
        class="contest-cover"
        loading="lazy"
        decoding="async"
      >
      <span class="phase-badge" :class="`is-${presentation.phase}`">
        {{ presentation.phaseLabel }}
      </span>
    </div>

    <div class="contest-content">
      <h2 :title="contest.title">{{ contest.title || '未命名竞赛' }}</h2>
      <dl class="contest-time">
        <div>
          <dt>开赛时间</dt>
          <dd>{{ formatContestTime(contest.startTime) }}</dd>
        </div>
        <div>
          <dt>结束时间</dt>
          <dd>{{ formatContestTime(contest.endTime) }}</dd>
        </div>
      </dl>

      <div class="card-actions">
        <span
          v-if="presentation.tag"
          class="status-tag"
          :class="`is-${presentation.tag.tone}`"
          role="status"
        >
          <span class="status-dot" aria-hidden="true"></span>
          {{ presentation.tag.label }}
        </span>
        <button
          v-for="action in presentation.actions"
          :key="action.type"
          class="action-button"
          :class="{ 'is-secondary': action.secondary }"
          type="button"
          :disabled="registering"
          @click="emit('action', action.type, contest)"
        >
          <span v-if="registering && action.type === CONTEST_ACTION.REGISTER" class="button-spinner" aria-hidden="true"></span>
          {{ registering && action.type === CONTEST_ACTION.REGISTER ? '报名中…' : action.label }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import {
  CONTEST_ACTION,
  formatContestTime,
  getContestPresentation,
} from '@/utils/contestState'

const props = defineProps({
  contest: { type: Object, required: true },
  registering: { type: Boolean, default: false },
  now: { type: Number, required: true },
})

const emit = defineEmits(['action'])
const presentation = computed(() => getContestPresentation(props.contest, props.now))
</script>

<style lang="scss" scoped>
.contest-card {
  display: flex;
  min-width: 0;
  min-height: 216px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid #edf2f5;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff, #fbfdfe);
  box-shadow: 0 8px 24px rgb(46 71 84 / 6%);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.contest-card:hover {
  border-color: #d5eff9;
  box-shadow: 0 14px 30px rgb(50 197 255 / 12%);
  transform: translateY(-3px);
}

.cover-wrap {
  position: relative;
  width: 126px;
  height: 180px;
  flex: 0 0 126px;
}

.contest-cover {
  width: 126px;
  height: 180px;
  border-radius: 8px;
  object-fit: cover;
}

.phase-badge {
  position: absolute;
  top: 9px;
  left: 9px;
  padding: 4px 8px;
  border-radius: 10px;
  color: #fff;
  background: rgb(17 26 36 / 70%);
  backdrop-filter: blur(4px);
  font-size: 11px;
}

.phase-badge.is-ongoing { background: rgb(24 178 128 / 90%); }
.phase-badge.is-ended { background: rgb(93 105 116 / 84%); }

.contest-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 3px 0 0 20px;
}

.contest-content h2 {
  margin: 0 0 14px;
  overflow: hidden;
  color: #1d2328;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contest-time { margin: 0; }
.contest-time div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
}
.contest-time dt { color: #9aa2a8; }
.contest-time dd {
  margin: 0;
  overflow: hidden;
  color: #606a72;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 9px;
  margin-top: auto;
}

.action-button {
  display: inline-flex;
  min-width: 102px;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 1px solid #79d8fa;
  border-radius: 5px;
  color: #1ab8f1;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.action-button:hover:not(:disabled) {
  color: #fff;
  background: #32c5ff;
  box-shadow: 0 6px 14px rgb(50 197 255 / 25%);
  transform: translateY(-1px);
}
.action-button.is-secondary { border-color: #d8e1e5; color: #65727a; }
.action-button.is-secondary:hover:not(:disabled) { border-color: #738089; background: #738089; }
.action-button:disabled { cursor: wait; opacity: 0.65; }

.status-tag {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid #b9e8d7;
  border-radius: 16px;
  color: #259c76;
  background: #f1fbf7;
  font-size: 13px;
  font-weight: 600;
}
.status-tag.is-started { border-color: #f1d6aa; color: #b2761d; background: #fff9ef; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.button-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgb(26 184 241 / 24%);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 430px) {
  .contest-card { min-height: 184px; padding: 14px; }
  .cover-wrap, .contest-cover { width: 104px; height: 150px; }
  .cover-wrap { flex-basis: 104px; }
  .contest-content { padding-left: 14px; }
  .contest-content h2 { margin-bottom: 10px; font-size: 16px; }
  .contest-time div { display: block; margin-bottom: 6px; font-size: 12px; }
  .contest-time dt { margin-bottom: 1px; }
  .card-actions { min-height: 34px; gap: 6px; }
  .action-button { min-width: 82px; height: 34px; padding: 0 9px; font-size: 12px; }
  .status-tag { height: 30px; font-size: 12px; }
  .phase-badge { top: 6px; left: 6px; }
}
</style>

