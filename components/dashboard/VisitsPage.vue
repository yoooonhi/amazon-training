<script setup>
/**
 * 访问分析页
 * 近14天趋势 + UV独立访客 + 热门课程页Top10 + 登录/游客占比 + 人均访问页数
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

const loading = ref(true)
const visits = ref([])
const visitTrend = ref([])
const topPaths = ref([])
const loginRatio = ref({ logged: 0, guest: 0 })
const uniqueVisitors = ref(0)

function toLocalDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localDayKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return toLocalDateStr(d)
}
function localDayLabel(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function loadData() {
  loading.value = true
  const { data } = await supabase
    .from('site_visits')
    .select('path, page_type, is_logged_in, created_at, visitor_id')
    .order('created_at', { ascending: false })
    .limit(5000)
  const all = data || []
  visits.value = all

  // 近14天趋势
  const dayCounts = {}
  all.forEach((v) => {
    const k = toLocalDateStr(v.created_at)
    dayCounts[k] = (dayCounts[k] || 0) + 1
  })
  const trend = []
  for (let i = 13; i >= 0; i--) {
    trend.push({ key: localDayLabel(i), count: dayCounts[localDayKey(i)] || 0 })
  }
  visitTrend.value = trend

  // UV（按 visitor_id 去重）
  const visitorSet = new Set()
  all.forEach((v) => { if (v.visitor_id) visitorSet.add(v.visitor_id) })
  uniqueVisitors.value = visitorSet.size

  // 热门路径 Top10（按 path，只取课程页 lesson 类型）
  const pathCounts = {}
  all.filter((v) => v.page_type === 'lesson' && v.path).forEach((v) => {
    pathCounts[v.path] = (pathCounts[v.path] || 0) + 1
  })
  topPaths.value = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  // 登录占比
  const logged = all.filter((v) => v.is_logged_in).length
  loginRatio.value = { logged, guest: all.length - logged }

  loading.value = false
}

const totalVisits = computed(() => visits.value.length)
const maxTrend = computed(() => Math.max(1, ...visitTrend.value.map((d) => d.count)))
const maxPath = computed(() => Math.max(1, ...topPaths.value.map((p) => p.count)))
const avgPages = computed(() => (uniqueVisitors.value ? (totalVisits.value / uniqueVisitors.value).toFixed(1) : 0))

function shortenPath(p) {
  return p.replace('/content/', '').replace(/\/$/, '')
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载访问数据中...</div>
  <div v-else>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">{{ totalVisits }}</span><span class="stat-label">总访问(PV)</span></div>
      <div class="stat-card"><span class="stat-num">{{ uniqueVisitors }}</span><span class="stat-label">独立访客(UV)</span></div>
      <div class="stat-card"><span class="stat-num">{{ avgPages }}</span><span class="stat-label">人均访问页数</span></div>
    </div>

    <div class="data-section">
      <h3 class="section-title">📈 近 14 天访问趋势</h3>
      <div class="chart-bars">
        <div v-for="d in visitTrend" :key="d.key" class="chart-bar" :title="`${d.key}: ${d.count} 次`">
          <div class="chart-bar-fill" :style="{ height: (d.count / maxTrend * 100) + '%' }"></div>
          <span v-if="d.count > 0" class="chart-bar-count">{{ d.count }}</span>
          <span class="chart-bar-label">{{ d.key }}</span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="data-section">
        <h3 class="section-title">📄 热门课程页 Top 10</h3>
        <div v-if="topPaths.length === 0" class="empty-hint">暂无课程页访问数据</div>
        <div v-else class="path-list">
          <div v-for="(p, i) in topPaths" :key="i" class="path-item">
            <span class="path-rank">{{ i + 1 }}</span>
            <span class="path-name">{{ shortenPath(p.path) }}</span>
            <div class="path-bar-wrap"><div class="path-bar-fill" :style="{ width: (p.count / maxPath * 100) + '%' }"></div></div>
            <span class="path-count">{{ p.count }}</span>
          </div>
        </div>
      </div>

      <div class="data-section">
        <h3 class="section-title">👤 登录 / 游客占比</h3>
        <div v-if="totalVisits > 0">
          <div class="ratio-bar">
            <div class="ratio-seg-a" :style="{ width: (loginRatio.logged / totalVisits * 100) + '%' }"></div>
            <div class="ratio-seg-b" :style="{ width: (loginRatio.guest / totalVisits * 100) + '%' }"></div>
          </div>
          <div class="ratio-legend">
            <span><span class="dot" style="background: var(--vp-c-brand-1);"></span>登录 {{ loginRatio.logged }} ({{ Math.round(loginRatio.logged / totalVisits * 100) }}%)</span>
            <span><span class="dot" style="background: var(--dash-track); border: 1px solid var(--vp-c-divider);"></span>游客 {{ loginRatio.guest }} ({{ Math.round(loginRatio.guest / totalVisits * 100) }}%)</span>
          </div>
        </div>
        <p v-else class="empty-hint">暂无数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';
.path-list { display: flex; flex-direction: column; gap: 0.4rem; }
.path-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
.path-rank { width: 1.5rem; font-weight: 700; color: var(--vp-c-brand-1); text-align: center; }
.path-name { flex: 1; color: var(--vp-c-text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-bar-wrap { width: 60px; height: 14px; background: var(--dash-track); border-radius: 3px; overflow: hidden; }
.path-bar-fill { height: 100%; background: var(--vp-c-brand-1); border-radius: 3px; }
.path-count { font-weight: 700; color: var(--vp-c-text-1); min-width: 2rem; text-align: right; }
</style>
