<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'

const START_KEY = 'amazon-training-start-date'
const CHECKIN_KEY = 'amazon-training-checkins'

const startDate = ref(null)
const checkins = ref({}) // { 'YYYY-MM-DD': true }
const isMounted = ref(false)
const isLoggedIn = ref(false)
const syncing = ref(false)

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

const checkedInToday = computed(() => !!checkins.value[today.value])

// 连续打卡天数（从今天往回数）
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

// 累计打卡天数
const totalCheckins = computed(() => Object.keys(checkins.value).length)

// 最近 14 天打卡热力图（从今天往前 14 天）
const recentDays = computed(() => {
  const days = []
  const d = new Date()
  for (let i = 13; i >= 0; i--) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
    days.push({
      key,
      day: dd.getDate(),
      checked: !!checkins.value[key],
      isToday: key === today.value,
    })
  }
  return days
})

async function checkin() {
  checkins.value[today.value] = true
  // 乐观更新：立即写本地
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins.value))
  // 登录则同步云端
  if (isLoggedIn.value) {
    syncing.value = true
    try {
      const { data: session } = await supabase.auth.getSession()
      const userId = session.session?.user?.id
      if (!userId) { syncing.value = false; return }
      const { error } = await supabase.from('checkins').upsert({
        user_id: userId,
        checkin_date: today.value,
      }, { onConflict: 'user_id,checkin_date' })
      if (error) console.error('打卡同步失败:', error.message)
    } finally {
      syncing.value = false
    }
  }
}

// 读云端打卡记录
async function loadRemoteCheckins() {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) return
  const { data, error } = await supabase
    .from('checkins')
    .select('checkin_date')
    .eq('user_id', userId)
  if (error) {
    console.error('读取打卡失败:', error.message)
    return
  }
  const remote = {}
  ;(data || []).forEach(r => { remote[r.checkin_date] = true })
  checkins.value = remote
}

// 登录后把本地打卡迁移到云端
async function migrateLocalToRemote() {
  const localRaw = localStorage.getItem(CHECKIN_KEY)
  if (!localRaw) return
  const local = JSON.parse(localRaw)
  const existingDates = new Set(Object.keys(checkins.value))
  const toMigrate = Object.keys(local).filter(d => local[d] && !existingDates.has(d))
  if (toMigrate.length === 0) return
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) return
  const rows = toMigrate.map(d => ({ user_id: userId, checkin_date: d }))
  const { error } = await supabase.from('checkins')
    .upsert(rows, { onConflict: 'user_id,checkin_date' })
  if (error) console.error('迁移本地打卡失败:', error.message)
  else {
    // 合并到当前显示
    toMigrate.forEach(d => { checkins.value[d] = true })
  }
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
    // 先加载本地打卡（未登录也能用）
    const raw = localStorage.getItem(CHECKIN_KEY)
    if (raw) checkins.value = JSON.parse(raw)
  } catch (e) {
    startDate.value = Date.now()
  }
  isMounted.value = true

  // 监听登录状态变化
  authState.onChange(async (user) => {
    isLoggedIn.value = !!user
    if (user) {
      await loadRemoteCheckins()
      await migrateLocalToRemote()
    } else {
      // 退出登录：回退到本地数据
      try {
        const raw = localStorage.getItem(CHECKIN_KEY)
        checkins.value = raw ? JSON.parse(raw) : {}
      } catch (e) {
        checkins.value = {}
      }
    }
  })
  // 兜底：直接查一次 session
  supabase.auth.getSession().then(async ({ data }) => {
    isLoggedIn.value = !!data.session?.user
    if (data.session?.user) {
      await loadRemoteCheckins()
      await migrateLocalToRemote()
    }
  })
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
      <div class="gate-stats">
        <div class="stat-item">
          <span class="stat-num">🔥 {{ streak }}</span>
          <span class="stat-label">连续打卡</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">📅 {{ totalCheckins }}</span>
          <span class="stat-label">累计打卡</span>
        </div>
      </div>
    </div>

    <!-- 近 14 天打卡热力图 -->
    <div class="heatmap">
      <div
        v-for="d in recentDays"
        :key="d.key"
        class="heat-cell"
        :class="{ checked: d.checked, today: d.isToday }"
        :title="d.key + (d.checked ? ' 已打卡' : '')"
      >
        <span class="heat-day">{{ d.day }}</span>
      </div>
    </div>

    <div class="gate-action">
      <a v-if="!checkedInToday" href="/content/modules/m1-platform/00-amazon-basics.html" class="lesson-link">
        📖 开始今天的学习 →
      </a>
      <span v-else class="checked-badge">✅ 今日已打卡</span>
      <button
        v-if="!checkedInToday"
        class="checkin-btn"
        :disabled="syncing"
        @click="checkin"
      >
        {{ syncing ? '同步中…' : '标记今日完成' }}
      </button>
    </div>
    <div v-if="!isLoggedIn" class="sync-hint">
      ⚠️ 未登录，打卡仅保存在本机。登录后可跨设备同步。
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
.gate-stats {
  margin-left: auto;
  display: flex;
  gap: 1.5rem;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}
.stat-label {
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

/* 打卡热力图 */
.heatmap {
  display: flex;
  gap: 4px;
  margin-bottom: 1rem;
}
.heat-cell {
  flex: 1;
  aspect-ratio: 1;
  min-width: 0;
  border-radius: 4px;
  background: var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.heat-cell.checked {
  background: var(--vp-c-brand-1);
}
.heat-cell.today {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 1px;
}
.heat-cell.checked.today {
  outline-color: var(--vp-c-brand-2);
}
.heat-day {
  font-size: 0.68rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.heat-cell.checked .heat-day {
  color: #fff;
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
.checkin-btn:hover:not(:disabled) { opacity: 0.9; }
.checkin-btn:disabled { opacity: 0.6; cursor: default; }
.sync-hint {
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
</style>
