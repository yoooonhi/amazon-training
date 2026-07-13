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
      // 退出登录：清空打卡显示（打卡为登录专属功能）
      checkins.value = {}
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
  <div v-if="isMounted && isLoggedIn" class="daily-gate">
    <!-- 左侧：核心信息 -->
    <div class="gate-main">
      <div class="gate-headline">
        <span class="hl-num">第 {{ trainingDay }} 天</span>
        <span class="hl-sep">·</span>
        <span class="hl-week">第{{ currentWeek }}周 {{ currentTheme }}</span>
      </div>
      <div class="gate-stats">
        <span class="stat">🔥 连续 <b>{{ streak }}</b></span>
        <span class="stat-sep">·</span>
        <span class="stat">📅 累计 <b>{{ totalCheckins }}</b></span>
      </div>
      <!-- 紧凑热力图 -->
      <div class="heatmap" aria-label="近14天打卡">
        <div
          v-for="d in recentDays"
          :key="d.key"
          class="heat-cell"
          :class="{ checked: d.checked, today: d.isToday }"
          :title="d.key + (d.checked ? ' 已打卡' : '')"
        ></div>
      </div>
      <div v-if="!isLoggedIn" class="sync-hint">⚠️ 未登录，打卡仅存本机</div>
    </div>

    <!-- 右侧：打卡按钮 -->
    <div class="gate-action">
      <span v-if="checkedInToday" class="checked-badge">✅ 今日已打卡</span>
      <button
        v-else
        class="checkin-btn"
        :disabled="syncing"
        @click="checkin"
      >
        {{ syncing ? '…' : '打卡' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.daily-gate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
}
.gate-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.gate-headline {
  font-size: 0.92rem;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.hl-num {
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.hl-sep {
  color: var(--vp-c-text-3);
}
.hl-week {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
.gate-stats {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.gate-stats b {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}
.stat-sep {
  color: var(--vp-c-text-3);
}

/* 紧凑热力图：14 个小方块横排 */
.heatmap {
  display: flex;
  gap: 3px;
  margin-top: 0.15rem;
}
.heat-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--vp-c-divider);
  transition: background 0.15s;
}
.heat-cell.checked {
  background: var(--vp-c-brand-1);
}
.heat-cell.today {
  box-shadow: 0 0 0 1.5px var(--vp-c-brand-1);
}

/* 右侧按钮 */
.gate-action {
  flex-shrink: 0;
}
.checkin-btn {
  padding: 0.45rem 1.1rem;
  border-radius: 8px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.checkin-btn:hover:not(:disabled) { opacity: 0.9; }
.checkin-btn:disabled { opacity: 0.6; cursor: default; }
.checked-badge {
  font-size: 0.85rem;
  color: #22c55e;
  font-weight: 600;
  white-space: nowrap;
}
.sync-hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
</style>
