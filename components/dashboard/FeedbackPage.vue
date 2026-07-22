<script setup>
/**
 * 反馈分析页
 *
 * 「本文是否对你有帮助」的运营视图：
 *   1. 全站有帮助占比（大数字）
 *   2. 按课程汇总：每课的有帮助 / 无帮助数 + 帮助率（可排序）
 *   3. 反馈明细：哪个用户对哪节课点了什么（可按课程 / 选择筛选）
 *
 * 直接回答「哪个用户对哪个课程进行了点击」。
 * 加载模式仿 CommentsPage：一次拉 lesson_feedback，再批量 join profiles 取昵称。
 */
import { ref, computed, reactive, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { getLessonLabel } from '../../lib/curriculum'

const loading = ref(true)
const allFeedback = ref([]) // 原始反馈（含 user_id）

// 筛选
const filter = reactive({ lesson: 'all', choice: 'all' })
const sortKey = ref('helpfulRate') // helpfulRate | total | helpful | unhelpful
const sortDir = ref('desc')

// lessonId → 可读标签（课序号 + 课名，如 '5.4 BE ACOS'）
function lessonLabel(id) {
  return getLessonLabel(id)
}

async function loadData() {
  loading.value = true
  const { data: raw } = await supabase
    .from('lesson_feedback')
    .select('lesson_id, user_id, helpful, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)
  const list = raw || []
  // 批量查昵称
  const userIds = [...new Set(list.map((f) => f.user_id))]
  const profileMap = {}
  if (userIds.length) {
    const { data: ps } = await supabase
      .from('profiles')
      .select('id, nickname, role')
      .in('id', userIds)
    ;(ps || []).forEach((p) => (profileMap[p.id] = p))
  }
  allFeedback.value = list.map((f) => {
    const p = profileMap[f.user_id] || {}
    return {
      ...f,
      authorName: p.nickname || '同学',
      authorRole: p.role || null,
      lessonLabel: lessonLabel(f.lesson_id),
    }
  })
  loading.value = false
}

// ---- 汇总 ----
const totalCount = computed(() => allFeedback.value.length)
const helpfulCount = computed(() => allFeedback.value.filter((f) => f.helpful).length)
const unhelpfulCount = computed(() => totalCount.value - helpfulCount.value)
const helpfulRate = computed(() =>
  totalCount.value ? Math.round((helpfulCount.value / totalCount.value) * 100) : 0
)

// 出现过反馈的课程（筛选用）
const feedbackLessons = computed(() => {
  const map = {}
  allFeedback.value.forEach((f) => {
    if (!map[f.lesson_id]) map[f.lesson_id] = f.lessonLabel
  })
  return Object.entries(map).map(([id, label]) => ({ id, label }))
})

// 按课程聚合（用于汇总表）
const lessonSummary = computed(() => {
  const map = {}
  allFeedback.value.forEach((f) => {
    if (!map[f.lesson_id]) {
      map[f.lesson_id] = { lessonId: f.lesson_id, label: f.lessonLabel, helpful: 0, unhelpful: 0 }
    }
    if (f.helpful) map[f.lesson_id].helpful++
    else map[f.lesson_id].unhelpful++
  })
  const arr = Object.values(map).map((s) => {
    const total = s.helpful + s.unhelpful
    return { ...s, total, helpfulRate: total ? Math.round((s.helpful / total) * 100) : 0 }
  })
  // 排序
  const k = sortKey.value
  arr.sort((a, b) => (sortDir.value === 'desc' ? b[k] - a[k] : a[k] - b[k]))
  return arr
})

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

// 反馈明细（筛选后）
const filteredFeedback = computed(() => {
  return allFeedback.value
    .filter((f) => filter.lesson === 'all' || f.lesson_id === filter.lesson)
    .filter((f) => {
      if (filter.choice === 'helpful') return f.helpful
      if (filter.choice === 'unhelpful') return !f.helpful
      return true
    })
})

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
function isAdminAuthor(f) {
  return f.authorRole === 'mentor' || f.authorRole === 'admin'
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载反馈数据中...</div>
  <div v-else>
    <!-- 统计卡 -->
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">{{ totalCount }}</span><span class="stat-label">反馈总数</span></div>
      <div class="stat-card"><span class="stat-num" style="color:#16a34a;">{{ helpfulCount }}</span><span class="stat-label">👍 有帮助</span></div>
      <div class="stat-card"><span class="stat-num" style="color:#ef4444;">{{ unhelpfulCount }}</span><span class="stat-label">👎 无帮助</span></div>
    </div>

    <!-- 大数字：全站有帮助占比 -->
    <div class="data-section" style="text-align: center;">
      <span class="big-number" :style="{ color: helpfulRate >= 70 ? '#16a34a' : helpfulRate >= 50 ? '#f59e0b' : '#ef4444' }">
        {{ helpfulRate }}%
      </span>
      <div class="big-number-label">全站「有帮助」占比（{{ helpfulCount }}/{{ totalCount }}）</div>
    </div>

    <!-- 按课程汇总 -->
    <div class="data-section">
      <h3 class="section-title">📚 按课程汇总反馈</h3>
      <div v-if="lessonSummary.length === 0" class="empty-hint">暂无反馈数据</div>
      <div v-else class="table-wrap">
        <table class="rank-table">
          <thead>
            <tr>
              <th>课程</th>
              <th class="sortable num-head" @click="toggleSort('helpful')">👍 有帮助 <span :class="['sort-arrow', { active: sortKey === 'helpful' }]">{{ sortKey === 'helpful' ? (sortDir === 'desc' ? '↓' : '↑') : '↕' }}</span></th>
              <th class="sortable num-head" @click="toggleSort('unhelpful')">👎 无帮助 <span :class="['sort-arrow', { active: sortKey === 'unhelpful' }]">{{ sortKey === 'unhelpful' ? (sortDir === 'desc' ? '↓' : '↑') : '↕' }}</span></th>
              <th class="sortable fb-rate-head" @click="toggleSort('helpfulRate')">帮助率 <span :class="['sort-arrow', { active: sortKey === 'helpfulRate' }]">{{ sortKey === 'helpfulRate' ? (sortDir === 'desc' ? '↓' : '↑') : '↕' }}</span></th>
              <th class="sortable num-head" @click="toggleSort('total')">合计 <span :class="['sort-arrow', { active: sortKey === 'total' }]">{{ sortKey === 'total' ? (sortDir === 'desc' ? '↓' : '↑') : '↕' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in lessonSummary" :key="s.lessonId">
              <td class="fb-lesson">{{ s.label }}</td>
              <td class="num-cell" style="color:#16a34a;">{{ s.helpful }}</td>
              <td class="num-cell" style="color:#ef4444;">{{ s.unhelpful }}</td>
              <td>
                <div class="fb-rate-wrap">
                  <div class="fb-rate-bar"><div class="fb-rate-fill" :style="{ width: s.helpfulRate + '%', background: s.helpfulRate >= 70 ? '#16a34a' : s.helpfulRate >= 50 ? '#f59e0b' : '#ef4444' }"></div></div>
                  <span class="fb-rate-num">{{ s.helpfulRate }}%</span>
                </div>
              </td>
              <td class="num-cell muted">{{ s.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 反馈明细：哪个用户对哪节课点了什么 -->
    <div class="data-section">
      <h3 class="section-title">👥 反馈明细（{{ filteredFeedback.length }} 条）</h3>
      <!-- 筛选 -->
      <div class="cm-filters">
        <select v-model="filter.lesson" class="cm-select">
          <option value="all">全部课程</option>
          <option v-for="l in feedbackLessons" :key="l.id" :value="l.id">{{ l.label }}</option>
        </select>
        <select v-model="filter.choice" class="cm-select">
          <option value="all">全部选择</option>
          <option value="helpful">👍 有帮助</option>
          <option value="unhelpful">👎 无帮助</option>
        </select>
      </div>

      <div v-if="filteredFeedback.length === 0" class="empty-hint" style="padding:2rem;text-align:center;">没有匹配的反馈</div>
      <div v-else class="cm-list">
        <div v-for="(f, i) in filteredFeedback" :key="i" class="cm-item" :class="{ positive: f.helpful, negative: !f.helpful }">
          <div class="cm-meta">
            <span class="cm-lesson">{{ f.lessonLabel }}</span>
            <span class="cm-choice" :class="f.helpful ? 'pos' : 'neg'">{{ f.helpful ? '👍 有帮助' : '👎 无帮助' }}</span>
            <span class="cm-author" :class="{ admin: isAdminAuthor(f) }">{{ f.authorName }}</span>
            <span v-if="isAdminAuthor(f)" class="cm-role">管理员</span>
            <span class="cm-time">{{ timeAgo(f.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';

.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.sortable:hover { color: var(--vp-c-brand-1); }
.sort-arrow { font-size: 0.68rem; color: var(--vp-c-text-3); margin-left: 0.15rem; }
.sort-arrow.active { color: var(--vp-c-brand-1); font-weight: 700; }

.fb-lesson { color: var(--vp-c-text-1); }
.num-head { text-align: right; white-space: nowrap; }
.num-cell { font-weight: 700; text-align: right; white-space: nowrap; }
.fb-rate-head { white-space: nowrap; }
.fb-rate-wrap { display: flex; align-items: center; gap: 0.5rem; justify-content: flex-end; }
.fb-rate-bar { width: 90px; height: 14px; background: var(--dash-track); border-radius: 4px; overflow: hidden; flex-shrink: 0; }
.fb-rate-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.fb-rate-num { font-size: 0.78rem; font-weight: 700; min-width: 2.5rem; text-align: right; color: var(--vp-c-text-1); }

/* 明细列表（复用 comments 管理页的视觉） */
.cm-filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
.cm-select { padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 0.8rem; cursor: pointer; }
.cm-list { display: flex; flex-direction: column; gap: 0.5rem; }
.cm-item { padding: 0.7rem 1rem; border-radius: 8px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-left: 3px solid transparent; }
.cm-item.positive { border-left-color: #16a34a; background: rgba(22, 163, 74, 0.03); }
.cm-item.negative { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.03); }
.cm-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.8rem; }
.cm-lesson { font-weight: 600; color: var(--vp-c-brand-1); }
.cm-choice { font-size: 0.74rem; font-weight: 600; padding: 0.05rem 0.45rem; border-radius: 3px; }
.cm-choice.pos { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
.cm-choice.neg { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.cm-author { font-weight: 600; color: var(--vp-c-text-1); }
.cm-author.admin { color: var(--vp-c-brand-1); }
.cm-role { font-size: 0.68rem; padding: 0.05rem 0.35rem; border-radius: 3px; background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.12)); color: var(--vp-c-brand-1); font-weight: 600; }
.cm-time { font-size: 0.72rem; color: var(--vp-c-text-3); margin-left: auto; }
</style>
