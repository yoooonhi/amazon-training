<script setup>
/**
 * 访问分析页
 * 近14天趋势 + UV独立访客 + 热门课程页Top10 + 登录/游客占比 + 人均访问页数
 *
 * 数据源：rpc('visit_stats')（docs/supabase-visit-stats-rpc.sql）。
 * 背景（2026-08-19）：原实现一次拉最近 5000 条在浏览器里数数，但
 * Supabase PostgREST 服务端硬上限 db-max-rows=1000（单次最多返回
 * 1000 行，limit(5000) 无效且静默截断），site_visits 突破 1000 条后
 * 「总访问(PV)」恒为 1000。改为服务端聚合 RPC，一次返回全部指标。
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { getLessonIdByUrl, getLessonLabel } from '../../lib/curriculum'

const loading = ref(true)
const errorMsg = ref('')
const totalVisits = ref(0)
const visitTrend = ref([])
const topPaths = ref([])
const loginRatio = ref({ logged: 0, guest: 0 })
const uniqueVisitors = ref(0)

function localDayKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 'YYYY-MM-DD' → 'M/D'（与原 localDayLabel 展示格式一致）
function dayLabel(dayKey) {
  const [, m, d] = dayKey.split('-')
  return `${Number(m)}/${Number(d)}`
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  const { data, error } = await supabase.rpc('visit_stats')
  if (error) {
    errorMsg.value = '访问统计加载失败：' + (error.message || error) + '（若首次接入，请先在 Supabase 执行 docs/supabase-visit-stats-rpc.sql）'
    loading.value = false
    return
  }
  if (data == null) {
    // is_mentor() 为 false 时函数返回空集（见 SQL 头注释）
    errorMsg.value = '仅导师/管理员可查看访问统计'
    loading.value = false
    return
  }

  totalVisits.value = data.total || 0
  uniqueVisitors.value = data.uv || 0
  loginRatio.value = { logged: data.logged || 0, guest: data.guest || 0 }
  topPaths.value = data.top_paths || []

  // 近14天趋势：本地日期做骨架，填入服务端按上海时区聚合的计数
  const dayCounts = {}
  ;(data.trend || []).forEach((t) => { dayCounts[t.day] = t.count })
  const trend = []
  for (let i = 13; i >= 0; i--) {
    const k = localDayKey(i)
    trend.push({ key: dayLabel(k), count: dayCounts[k] || 0 })
  }
  visitTrend.value = trend

  loading.value = false
}

const maxTrend = computed(() => Math.max(1, ...visitTrend.value.map((d) => d.count)))
const maxPath = computed(() => Math.max(1, ...topPaths.value.map((p) => p.count)))
const avgPages = computed(() => (uniqueVisitors.value ? (totalVisits.value / uniqueVisitors.value).toFixed(1) : 0))

function shortenPath(p) {
  return p.replace('/content/', '').replace(/\/$/, '')
}

// 访问 URL → 可读课名（课序号 + 课名），反查不到回退到路径简写
function pathLabel(p) {
  const lid = getLessonIdByUrl(p)
  if (lid) return getLessonLabel(lid)
  return shortenPath(p)
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载访问数据中...</div>
  <div v-else-if="errorMsg" class="empty-hint">
    <p>{{ errorMsg }}</p>
    <button type="button" class="retry-btn" @click="loadData">重试</button>
  </div>
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
            <span class="path-name">{{ pathLabel(p.path) }}</span>
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
.retry-btn {
  margin-top: 0.6rem;
  padding: 0.35rem 1.1rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 0.8rem;
}
.retry-btn:hover { background: var(--vp-c-brand-1); color: #fff; }
.path-list { display: flex; flex-direction: column; gap: 0.4rem; }
.path-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
.path-rank { width: 1.5rem; font-weight: 700; color: var(--vp-c-brand-1); text-align: center; }
.path-name { flex: 1; color: var(--vp-c-text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-bar-wrap { width: 60px; height: 14px; background: var(--dash-track); border-radius: 3px; overflow: hidden; }
.path-bar-fill { height: 100%; background: var(--vp-c-brand-1); border-radius: 3px; }
.path-count { font-weight: 700; color: var(--vp-c-text-1); min-width: 2rem; text-align: right; }
</style>
