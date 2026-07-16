<script setup>
/**
 * 数据概览页
 *
 * 4 张核心卡 + 近 30 天注册趋势 + 转化漏斗。
 * 独立加载 profiles + progress + site_visits。
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { totalLessons } from '../../lib/curriculum'

const loading = ref(true)
const totalStudents = ref(0)
const memberCount = ref(0)
const activeToday = ref(0) // 今日有 progress 记录
const visitsToday = ref(0)
const staleCount = ref(0)

// 注册趋势（近30天）
const registerTrend = ref([])

// 转化漏斗
const startedLearning = ref(0) // 至少完成1课
const completedHalf = ref(0) // 完成≥50%
const funnel = ref({})

function toLocalDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localDayKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return toLocalDateStr(d)
}

async function loadData() {
  loading.value = true
  // profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, created_at, is_member')
    .eq('role', 'student')
  const allProfiles = profiles || []
  totalStudents.value = allProfiles.length
  memberCount.value = allProfiles.filter((p) => p.is_member).length

  // 注册趋势（近30天）
  const regCounts = {}
  allProfiles.forEach((p) => {
    const k = toLocalDateStr(p.created_at)
    regCounts[k] = (regCounts[k] || 0) + 1
  })
  const today = new Date()
  const trend = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const k = toLocalDateStr(d)
    trend.push({
      key: `${d.getMonth() + 1}/${d.getDate()}`,
      count: regCounts[k] || 0,
    })
  }
  registerTrend.value = trend

  // progress（算活跃+转化）
  const { data: allProgress } = await supabase
    .from('progress')
    .select('user_id, completed, completed_at')
  const todayKey = localDayKey(0)
  const activeUsers = new Set()
  const userCompleted = {} // {userId: count}
  ;(allProgress || []).forEach((p) => {
    if (p.completed) {
      userCompleted[p.user_id] = (userCompleted[p.user_id] || 0) + 1
      if (toLocalDateStr(p.completed_at) === todayKey) {
        activeUsers.add(p.user_id)
      }
    }
  })
  activeToday.value = activeUsers.size
  startedLearning.value = Object.keys(userCompleted).length
  completedHalf.value = Object.values(userCompleted).filter(
    (c) => c >= totalLessons / 2
  ).length

  // 停滞预警（注册超3天但0进度，或最后活跃超3天）
  // 简化：注册超7天但0进度的算停滞
  staleCount.value = allProfiles.filter((p) => {
    const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
    return days > 7 && !userCompleted[p.id]
  }).length

  // 今日访问
  const { data: visits } = await supabase
    .from('site_visits')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  visitsToday.value =
    (visits || []).filter((v) => toLocalDateStr(v.created_at) === todayKey).length

  // 转化漏斗
  funnel.value = {
    registered: totalStudents.value,
    started: startedLearning.value,
    halfDone: completedHalf.value,
    member: memberCount.value,
  }

  loading.value = false
}

const maxRegCount = computed(() =>
  Math.max(1, ...registerTrend.value.map((d) => d.count))
)

function pct(n, total) {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载概览数据中...</div>
  <div v-else>
    <!-- 4 张核心卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ totalStudents }}</span>
        <span class="stat-label">总学员</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ activeToday }}</span>
        <span class="stat-label">今日活跃</span>
      </div>
      <div class="stat-card accent">
        <span class="stat-num">{{ memberCount }}</span>
        <span class="stat-label">会员</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ visitsToday }}</span>
        <span class="stat-label">今日访问</span>
      </div>
    </div>

    <!-- 注册趋势 -->
    <div class="data-section">
      <h3 class="section-title">📈 近 30 天注册趋势</h3>
      <div class="chart-bars">
        <div
          v-for="d in registerTrend"
          :key="d.key"
          class="chart-bar"
          :title="`${d.key}: ${d.count} 人`"
        >
          <div
            class="chart-bar-fill"
            :style="{ height: (d.count / maxRegCount * 100) + '%' }"
          ></div>
          <span v-if="d.count > 0" class="chart-bar-count">{{ d.count }}</span>
          <span class="chart-bar-label">{{ d.key }}</span>
        </div>
      </div>
    </div>

    <!-- 转化漏斗 -->
    <div class="data-section">
      <h3 class="section-title"> funnel 转化漏斗</h3>
      <div class="funnel">
        <div class="funnel-row">
          <span class="funnel-label">注册</span>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar" style="width: 100%; background: var(--vp-c-brand-1);">
              <span>{{ funnel.registered }} 人</span>
            </div>
          </div>
          <span class="funnel-pct">100%</span>
        </div>
        <div class="funnel-row">
          <span class="funnel-label">开始学习</span>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar" :style="{ width: pct(funnel.started, funnel.registered) + '%', background: 'var(--vp-c-brand-1)' }">
              <span>{{ funnel.started }} 人</span>
            </div>
          </div>
          <span class="funnel-pct">{{ pct(funnel.started, funnel.registered) }}%</span>
        </div>
        <div class="funnel-row">
          <span class="funnel-label">完成 50%</span>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar" :style="{ width: pct(funnel.halfDone, funnel.registered) + '%', background: '#16a34a' }">
              <span>{{ funnel.halfDone }} 人</span>
            </div>
          </div>
          <span class="funnel-pct">{{ pct(funnel.halfDone, funnel.registered) }}%</span>
        </div>
        <div class="funnel-row">
          <span class="funnel-label">👑 会员</span>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar" :style="{ width: pct(funnel.member, funnel.registered) + '%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }">
              <span>{{ funnel.member }} 人</span>
            </div>
          </div>
          <span class="funnel-pct">{{ pct(funnel.member, funnel.registered) }}%</span>
        </div>
      </div>
    </div>

    <!-- 快捷异常 -->
    <div class="data-section">
      <h3 class="section-title">⚠️ 需要关注</h3>
      <div class="alert-grid">
        <div class="alert-item warn">
          <span class="alert-num">{{ staleCount }}</span>
          <span class="alert-label">注册超7天未学习</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';

.funnel { display: flex; flex-direction: column; gap: 0.75rem; }
.funnel-row { display: flex; align-items: center; gap: 0.75rem; }
.funnel-label { width: 80px; font-size: 0.85rem; font-weight: 600; color: var(--vp-c-text-2); flex-shrink: 0; }
.funnel-bar-wrap { flex: 1; height: 28px; background: var(--vp-c-divider); border-radius: 6px; overflow: hidden; }
.funnel-bar { height: 100%; display: flex; align-items: center; padding-left: 0.6rem; color: #fff; font-size: 0.78rem; font-weight: 600; border-radius: 6px; min-width: 2px; transition: width 0.3s; }
.funnel-pct { width: 50px; text-align: right; font-size: 0.82rem; font-weight: 600; color: var(--vp-c-text-2); }

.alert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
.alert-item { padding: 1rem; border-radius: 8px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); text-align: center; }
.alert-item.warn { border-color: #ff9900; background: rgba(255, 153, 0, 0.05); }
.alert-num { display: block; font-size: 1.5rem; font-weight: 800; color: #ff9900; }
.alert-label { font-size: 0.78rem; color: var(--vp-c-text-2); }
</style>
