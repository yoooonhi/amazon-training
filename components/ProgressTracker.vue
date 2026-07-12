<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const STORAGE_KEY = 'amazon-training-progress'
const START_KEY = 'amazon-training-start-date'

// 7 modules, ability-based
const curriculum = [
  { week: 1, title: '平台认知与账号安全', lessons: ['m1-00','m1-01','m1-02','m1-03','m1-04','m1-05','m1-06','m1-07'] },
  { week: 2, title: '选品与采购', lessons: ['m7-01','m7-02','m7-03','m7-04','m7-05','m7-06'] },
  { week: 3, title: 'Listing搭建基本功', lessons: ['m2-00','m2-01','m2-02','m2-03','m2-03b','m2-04','m2-05','m2-06','m2-07','m2-08','m2-09','m2-10'] },
  { week: 4, title: '库存与FBA物流', lessons: ['m3-01','m3-02','m3-03','m3-04','m3-05','m3-06','m3-07'] },
  { week: 5, title: '广告体系', lessons: ['m4-01','m4-02','m4-03','m4-04','m4-05','m4-06','m4-07','m4-08','m4-09','m4-10','m4-11'] },
  { week: 6, title: '定价与利润', lessons: ['m5-01','m5-02','m5-03','m5-04','m5-05'] },
  { week: 7, title: '日常运营与判断力', lessons: ['m6-01','m6-02','m6-03','m6-04','m6-05','m6-06','m6-07'] },
]

const progress = ref({})
const startDate = ref(null)
const isMounted = ref(false)

const totalLessons = computed(() => curriculum.reduce((sum, w) => sum + w.lessons.length, 0))
const completedCount = computed(() => Object.values(progress.value).filter(v => v.completed).length)
const overallPercent = computed(() => Math.round((completedCount.value / totalLessons.value) * 100))

function weekPercent(weekLessons) {
  const done = weekLessons.filter(l => progress.value[l]?.completed).length
  return Math.round((done / weekLessons.length) * 100)
}

function trainingDay() {
  if (!startDate.value) return 0
  const diff = Math.floor((Date.now() - startDate.value) / 86400000) + 1
  return Math.max(1, Math.min(diff, 56)) // 8 weeks = 56 days
}

function currentWeek() {
  const day = trainingDay()
  return Math.min(Math.ceil(day / 7), 8)
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) progress.value = JSON.parse(raw)
    const sd = localStorage.getItem(START_KEY)
    if (sd) {
      startDate.value = parseInt(sd)
    } else {
      startDate.value = Date.now()
      localStorage.setItem(START_KEY, String(startDate.value))
    }
  } catch (e) {
    progress.value = {}
  }
  isMounted.value = true
}

watch(progress, (val) => {
  if (isMounted.value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }
}, { deep: true })

onMounted(loadProgress)
</script>

<template>
  <div v-if="isMounted" class="progress-tracker">
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
          <span class="week-label">第 {{ w.week }} 周</span>
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
  min-width: 3.5rem;
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
