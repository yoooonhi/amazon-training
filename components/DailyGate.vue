<script setup>
import { ref, computed, onMounted } from 'vue'

const START_KEY = 'amazon-training-start-date'
const CHECKIN_KEY = 'amazon-training-checkins'

const startDate = ref(null)
const checkins = ref({}) // { 'YYYY-MM-DD': true }
const isMounted = ref(false)
const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const trainingDay = computed(() => {
  if (!startDate.value) return 1
  const diff = Math.floor((Date.now() - startDate.value) / 86400000) + 1
  return Math.max(1, Math.min(diff, 56))
})

const currentWeek = computed(() => Math.min(Math.ceil(trainingDay.value / 7), 8))

const weekThemes = [
  '运营全景 + 数据纪律',
  '利润链 + 费用分解',
  '每日驾驶舱 + 优先级',
  '执行层只读纪律',
  '广告 + Listing 优化',
  '定价 + 补货决策',
  '冷启动 + 竞品 + 多站点',
  '利润诊断 + 质量 + 复盘',
]

const currentTheme = computed(() => weekThemes[currentWeek.value - 1] || '')

const todayLessonPath = computed(() => {
  const w = currentWeek.value
  const d = ((trainingDay.value - 1) % 7) + 1
  // Map to lesson path; days 6,7 are weekend review
  if (d <= 5) return `/content/week${w}/day${d}`
  return `/content/week${w}/day5` // weekend → review day5
})

const checkedInToday = computed(() => !!checkins.value[today.value])

const streak = computed(() => {
  let count = 0
  let d = new Date()
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (checkins.value[key]) {
      count++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return count
})

function checkin() {
  checkins.value[today.value] = true
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins.value))
}

onMounted(() => {
  try {
    const sd = localStorage.getItem(START_KEY)
    if (sd) {
      startDate.value = parseInt(sd)
    } else {
      startDate.value = Date.now()
      localStorage.setItem(START_KEY, String(startDate.value))
    }
    const raw = localStorage.getItem(CHECKIN_KEY)
    if (raw) checkins.value = JSON.parse(raw)
  } catch (e) {
    startDate.value = Date.now()
  }
  isMounted.value = true
})
</script>

<template>
  <div v-if="isMounted" class="daily-gate">
    <div class="gate-row">
      <div class="gate-day">
        <span class="day-label">训练第</span>
        <span class="day-num">{{ trainingDay }}</span>
        <span class="day-label">天</span>
      </div>
      <div class="gate-week">
        <span class="week-badge">第 {{ currentWeek }} 周</span>
        <span class="week-theme">{{ currentTheme }}</span>
      </div>
      <div class="gate-streak">
        <span class="streak-num">🔥 {{ streak }}</span>
        <span class="streak-label">连续打卡</span>
      </div>
    </div>

    <div class="gate-action">
      <a v-if="!checkedInToday" :href="todayLessonPath" class="lesson-link">
        📖 开始今天的学习 →
      </a>
      <span v-else class="checked-badge">✅ 今日已打卡</span>
      <button
        v-if="!checkedInToday"
        class="checkin-btn"
        @click="checkin"
      >
        标记今日完成
      </button>
    </div>
  </div>
</template>

<style scoped>
.daily-gate {
  margin: 1rem 0 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--vp-c-brand-soft, rgba(52,81,178,0.06)), var(--vp-c-bg-soft));
  border-radius: 12px;
  border: 1px solid var(--vp-c-brand-1);
}
.gate-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.gate-day {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}
.day-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
.day-num {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  line-height: 1;
}
.gate-week {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.week-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.week-theme {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.gate-streak {
  margin-left: auto;
  text-align: center;
}
.streak-num {
  font-size: 1.5rem;
  font-weight: 800;
  display: block;
}
.streak-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.gate-action {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.lesson-link {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.lesson-link:hover { text-decoration: underline; }
.checked-badge {
  font-size: 0.9rem;
  color: #22c55e;
  font-weight: 600;
}
.checkin-btn {
  margin-left: auto;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
.checkin-btn:hover { opacity: 0.9; }
</style>
