<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { curriculum, totalLessons } from '../lib/curriculum'

const START_KEY = 'amazon-training-start-date'
const LOCAL_PROGRESS_KEY = 'amazon-training-progress'

const progress = ref({}) // { lessonId: { completed, completedAt } }
const startDate = ref(null)
const isMounted = ref(false)
const isLoggedIn = ref(false)
const loading = ref(false)

const completedCount = computed(() => Object.values(progress.value).filter(v => v.completed).length)
const overallPercent = computed(() => Math.round((completedCount.value / totalLessons) * 100))

function weekPercent(weekLessons) {
  const done = weekLessons.filter(l => progress.value[l]?.completed).length
  return Math.round((done / weekLessons.length) * 100)
}

function trainingDay() {
  if (!startDate.value) return 0
  const diff = Math.floor((Date.now() - startDate.value) / 86400000) + 1
  return Math.max(1, Math.min(diff, 56))
}

function currentWeek() {
  return Math.min(Math.ceil(trainingDay() / 7), 8)
}

function loadStartDate() {
  const sd = localStorage.getItem(START_KEY)
  if (sd) {
    startDate.value = parseInt(sd)
  } else {
    startDate.value = Date.now()
    localStorage.setItem(START_KEY, String(startDate.value))
  }
}

async function loadRemoteProgress() {
  loading.value = true
  const { data } = await supabase.from('progress').select('lesson_id, completed, completed_at')
  if (data) {
    const remote = {}
    data.forEach(r => {
      if (r.completed) remote[r.lesson_id] = { completed: true, completedAt: r.completed_at }
    })
    progress.value = remote
  }
  loading.value = false
}

function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
    if (raw) progress.value = JSON.parse(raw)
  } catch (e) {
    progress.value = {}
  }
}

// 登录后把本地进度迁移到云端
async function migrateLocalToRemote() {
  const localRaw = localStorage.getItem(LOCAL_PROGRESS_KEY)
  if (!localRaw) return
  const local = JSON.parse(localRaw)
  const remoteIds = Object.keys(progress.value)
  const toMigrate = Object.entries(local).filter(([id, v]) => v.completed && !remoteIds.includes(id))
  if (toMigrate.length === 0) return
  const rows = toMigrate.map(([id, v]) => ({
    lesson_id: id, completed: true, completed_at: new Date(v.completedAt || Date.now()).toISOString(),
  }))
  await supabase.from('progress').upsert(rows, { onConflict: 'user_id,lesson_id' })
}

onMounted(() => {
  loadStartDate()
  isMounted.value = true
  authState.onChange(async (user) => {
    isLoggedIn.value = !!user
    if (user) {
      await loadRemoteProgress()
      await migrateLocalToRemote()
    } else {
      // 退出登录后清空进度显示
      progress.value = {}
    }
  })
  // 检查当前 session
  supabase.auth.getSession().then(async ({ data }) => {
    isLoggedIn.value = !!data.session?.user
    if (data.session?.user) {
      await loadRemoteProgress()
    } else {
      // 未登录，进度清空（必须登录才显示进度）
      progress.value = {}
    }
  })
})
</script>

<template>
  <div v-if="isMounted" class="progress-tracker">
    <!-- 未登录提示 -->
    <div v-if="!isLoggedIn" class="login-prompt">
      <span class="login-prompt-icon">🔒</span>
      <span>登录后查看你的学习进度</span>
    </div>

    <template v-else>
    <div v-if="loading" class="loading">加载进度中...</div>
    <div class="overall">
      <div class="overall-info">
        <span class="big-num">{{ completedCount }}</span>
        <span class="total">/ {{ totalLessons }} 课时完成</span>
      </div>
      <div class="overall-percent">{{ overallPercent }}%</div>
    </div>
    <div class="progress-bar-outer">
      <div class="progress-bar-inner" :style="{ width: overallPercent + '%' }"></div>
    </div>

    <div class="training-info" v-if="startDate">
      <div class="training-day">📅 训练第 {{ trainingDay() }} 天 · 第 {{ currentWeek() }} 周</div>
    </div>

    <div class="week-list">
      <div v-for="w in curriculum" :key="w.week" class="week-item" :class="{ active: currentWeek() === w.week }">
        <div class="week-header">
          <span class="week-label">第 {{ w.week }} 模块</span>
          <span class="week-title">{{ w.title }}</span>
          <span class="week-pct">{{ weekPercent(w.lessons) }}%</span>
        </div>
        <div class="week-bar">
          <div class="week-bar-fill" :style="{ width: weekPercent(w.lessons) + '%' }"></div>
        </div>
        <div class="lesson-dots">
          <span
            v-for="l in w.lessons"
            :key="l"
            class="dot"
            :class="{ done: progress[l]?.completed }"
            :title="progress[l]?.completed ? '已完成' : '未完成'"
          >●</span>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.progress-tracker {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.login-prompt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  padding: 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
.login-prompt-icon {
  font-size: 1.2rem;
}
.loading {
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.overall {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}
.big-num {
  font-size: 2rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}
.total {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin-left: 0.25rem;
}
.overall-percent {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.progress-bar-outer {
  height: 10px;
  background: var(--vp-c-divider);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}
.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  border-radius: 5px;
  transition: width 0.3s ease;
}
.training-info {
  margin-bottom: 1rem;
}
.training-day {
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.week-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.week-item {
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: border-color 0.2s;
}
.week-item.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-1, #3451b2);
}
.week-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.week-label {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  min-width: 4rem;
}
.week-title {
  flex: 1;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}
.week-pct {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.week-bar {
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.35rem;
}
.week-bar-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.lesson-dots {
  display: flex;
  gap: 0.5rem;
}
.dot {
  font-size: 0.65rem;
  color: var(--vp-c-divider);
}
.dot.done {
  color: var(--vp-c-brand-1);
}
</style>
