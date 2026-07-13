<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { curriculum, totalLessons } from '../lib/curriculum'

const isMounted = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const isMentor = ref(false)
const students = ref([])
const selectedStudent = ref(null)
const detailProgress = ref([])
const detailQuiz = ref([])

// 搜索和筛选
const searchQuery = ref('')
const filterStatus = ref('all') // all | active | stale | done | new

// 网站访问统计
const visits = ref([])

async function checkMentor() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) {
    errorMsg.value = '请先登录导师账号'
    loading.value = false
    return
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.session.user.id).single()
  if (!profile || profile.role !== 'mentor') {
    errorMsg.value = '你不是导师账号，无法查看后台'
    loading.value = false
    return
  }
  isMentor.value = true
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  // 拉 profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
  if (pErr) { errorMsg.value = '读取学员失败: ' + pErr.message; loading.value = false; return }
  // 拉 progress
  const { data: allProgress, error: progErr } = await supabase.from('progress').select('user_id, lesson_id, completed, completed_at')
  if (progErr) { errorMsg.value = '读取进度失败: ' + progErr.message; loading.value = false; return }
  // 拉 checkins
  const { data: allCheckins, error: checkErr } = await supabase.from('checkins').select('user_id, checkin_date')
  // 拉 quiz
  const { data: allQuiz } = await supabase.from('quiz_results').select('user_id, is_correct, lesson_id, question_index')

  students.value = profiles.map(p => {
    const prog = allProgress?.filter(x => x.user_id === p.id && x.completed) || []
    const checkins = allCheckins?.filter(x => x.user_id === p.id) || []
    const quizzes = allQuiz?.filter(x => x.user_id === p.id) || []
    const quizCorrect = quizzes.filter(x => x.is_correct).length
    const lastActive = prog.length > 0 ? prog.map(x => x.completed_at).sort().pop() : null

    // 计算连续打卡
    let streak = 0
    const dates = checkins.map(c => c.checkin_date).sort().reverse()
    if (dates.length > 0) {
      let d = new Date()
      for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(dates[i])
        const expected = new Date(d)
        expected.setDate(expected.getDate() - i)
        if (checkDate.toDateString() === expected.toDateString()) {
          streak++
        } else {
          break
        }
      }
    }

    // 停滞预警
    const daysSinceActive = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : null

    return {
      profile: p,
      progressCount: prog.length,
      percent: Math.round((prog.length / totalLessons) * 100),
      checkinDays: checkins.length,
      streak,
      quizCorrect,
      quizTotal: quizzes.length,
      lastActive,
      daysSinceActive,
      isStale: daysSinceActive !== null && daysSinceActive >= 3,
    }
  })
  // 拉网站访问统计（仅管理员能读，RLS 保证）
  const { data: visitData } = await supabase.from('site_visits')
    .select('path, page_type, is_logged_in, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)
  visits.value = visitData || []

  loading.value = false
}

async function viewDetail(student) {
  selectedStudent.value = student
  detailProgress.value = []
  detailQuiz.value = []
  // 拉该学生的进度明细
  const { data: prog } = await supabase.from('progress').select('lesson_id, completed, completed_at').eq('user_id', student.profile.id).eq('completed', true)
  detailProgress.value = prog || []
  // 拉答题明细
  const { data: quiz } = await supabase.from('quiz_results').select('lesson_id, question_index, is_correct, answered_at').eq('user_id', student.profile.id).order('answered_at', { ascending: false })
  detailQuiz.value = quiz || []
}

function lessonTitle(lessonId) {
  for (const w of curriculum) {
    if (w.lessons.includes(lessonId)) {
      return `模块${w.week} · ${lessonId}`
    }
  }
  return lessonId
}

// 过滤 + 搜索 + 排序
const filteredStudents = computed(() => {
  let result = [...students.value]
  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(s => {
      const name = (s.profile.nickname || '').toLowerCase()
      const email = (s.profile.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }
  // 状态筛选
  if (filterStatus.value !== 'all') {
    result = result.filter(s => {
      if (filterStatus.value === 'stale') return s.isStale
      if (filterStatus.value === 'done') return s.percent === 100
      if (filterStatus.value === 'new') return s.percent === 0
      if (filterStatus.value === 'active') return s.percent > 0 && s.percent < 100 && !s.isStale
      return true
    })
  }
  // 按完成率降序
  return result.sort((a, b) => b.percent - a.percent)
})

// ---------------- 网站访问统计派生 ----------------
// 时区修正：created_at 存的是 UTC，聚合时必须转成本地日期，否则跨天会算错
function toLocalDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDayKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDayLabel(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return `${d.getMonth()+1}/${d.getDate()}`
}

// 总访问数
const totalVisits = computed(() => visits.value.length)
// 今日访问数（本地时区）
const todayVisits = computed(() => visits.value.filter(v => toLocalDateStr(v.created_at) === localDayKey(0)).length)

// 近 14 天趋势（本地时区）
const visitTrend = computed(() => {
  const countsByKey = {}
  visits.value.forEach(v => {
    const k = toLocalDateStr(v.created_at)
    countsByKey[k] = (countsByKey[k] || 0) + 1
  })
  const days = []
  for (let i = 13; i >= 0; i--) {
    days.push({ key: localDayLabel(i), count: countsByKey[localDayKey(i)] || 0 })
  }
  return days
})
const maxTrendCount = computed(() => Math.max(1, ...visitTrend.value.map(d => d.count)))

// 热门页面 Top 5
const topPages = computed(() => {
  const counts = {}
  visits.value.forEach(v => {
    const label = pageTypeLabel(v.page_type)
    counts[label] = (counts[label] || 0) + 1
  })
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})
function pageTypeLabel(t) {
  return { home: '首页', lesson: '课程页', overview: '总览', dashboard: '导师后台', other: '其他' }[t] || t
}
const maxTopCount = computed(() => Math.max(1, ...topPages.value.map(p => p.count)))

// 登录/游客占比
const loginRatio = computed(() => {
  const total = visits.value.length
  if (total === 0) return { logged: 0, guest: 0, loggedPct: 0, guestPct: 0 }
  const logged = visits.value.filter(v => v.is_logged_in).length
  return {
    logged,
    guest: total - logged,
    loggedPct: Math.round((logged / total) * 100),
    guestPct: Math.round(((total - logged) / total) * 100),
  }
})

onMounted(async () => {
  isMounted.value = true
  await checkMentor()
  if (isMentor.value) await loadData()
})
</script>

<template>
  <div v-if="isMounted" class="dashboard">
    <!-- 未登录或非导师 -->
    <div v-if="errorMsg" class="error-box">
      <p>🔒 {{ errorMsg }}</p>
      <a href="/" class="back-link">← 返回首页</a>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="loading-box">
      加载全员数据中...
    </div>

    <!-- 导师后台 -->
    <div v-else-if="isMentor && !selectedStudent">
      <div class="dash-header">
        <h2>📊 导师后台 · 全员进度</h2>
        <button class="refresh-btn" @click="loadData">🔄 刷新</button>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ students.length }}</span>
          <span class="stat-label">总学员</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ students.filter(s => s.percent > 0).length }}</span>
          <span class="stat-label">已开始学习</span>
        </div>
        <div class="stat-card warn">
          <span class="stat-num">{{ students.filter(s => s.isStale).length }}</span>
          <span class="stat-label">停滞预警(3天+)</span>
        </div>
        <div class="stat-card accent">
          <span class="stat-num">{{ totalVisits }}</span>
          <span class="stat-label">网站访问 · 今日 {{ todayVisits }}</span>
        </div>
      </div>

      <!-- 网站访问统计详情 -->
      <div class="visits-section">
        <h3 class="section-title">📈 网站访问</h3>

        <!-- 近14天趋势 -->
        <div class="trend-chart">
          <div class="trend-bars">
            <div
              v-for="d in visitTrend"
              :key="d.key"
              class="trend-bar"
              :title="`${d.key}: ${d.count} 次`"
            >
              <div class="bar-fill" :style="{ height: (d.count / maxTrendCount * 100) + '%' }"></div>
              <span class="bar-count" v-if="d.count > 0">{{ d.count }}</span>
              <span class="bar-label">{{ d.key }}</span>
            </div>
          </div>
          <div class="trend-legend">近 14 天访问趋势</div>
        </div>

        <div class="visits-grid">
          <!-- 热门页面 -->
          <div class="visits-card">
            <div class="vc-title">🔥 热门页面</div>
            <div v-if="topPages.length === 0" class="vc-empty">暂无数据</div>
            <div v-else class="vc-list">
              <div v-for="p in topPages.slice(0, 5)" :key="p.label" class="vc-row">
                <span class="vc-label">{{ p.label }}</span>
                <div class="vc-bar">
                  <div class="vc-bar-fill" :style="{ width: (p.count / maxTopCount * 100) + '%' }"></div>
                </div>
                <span class="vc-count">{{ p.count }}</span>
              </div>
            </div>
          </div>

          <!-- 登录/游客占比 -->
          <div class="visits-card">
            <div class="vc-title">👤 登录 / 游客</div>
            <div v-if="totalVisits === 0" class="vc-empty">暂无数据</div>
            <template v-else>
              <div class="ratio-bar">
                <div class="ratio-logged" :style="{ width: loginRatio.loggedPct + '%' }"></div>
                <div class="ratio-guest" :style="{ width: loginRatio.guestPct + '%' }"></div>
              </div>
              <div class="ratio-legend">
                <span class="rl-item"><span class="dot logged"></span>登录 {{ loginRatio.logged }} ({{ loginRatio.loggedPct }}%)</span>
                <span class="rl-item"><span class="dot guest"></span>游客 {{ loginRatio.guest }} ({{ loginRatio.guestPct }}%)</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 搜索和筛选栏 -->
      <div v-if="students.length > 0" class="filter-bar">
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="🔍 搜索学员昵称或邮箱..."
        />
        <div class="filter-tabs">
          <button :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">全部</button>
          <button :class="{ active: filterStatus === 'active' }" @click="filterStatus = 'active'">活跃</button>
          <button :class="{ active: filterStatus === 'stale' }" @click="filterStatus = 'stale'">停滞</button>
          <button :class="{ active: filterStatus === 'new' }" @click="filterStatus = 'new'">未开始</button>
          <button :class="{ active: filterStatus === 'done' }" @click="filterStatus = 'done'">毕业</button>
        </div>
      </div>

      <!-- 学员表格 -->
      <div v-if="students.length > 0" class="table-wrap">
        <table class="student-table">
          <thead>
            <tr>
              <th>学员</th>
              <th>完成进度</th>
              <th>打卡</th>
              <th>答题</th>
              <th>最后学习</th>
              <th>状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStudents" :key="s.profile.id" :class="{ stale: s.isStale }" @click="viewDetail(s)">
              <td class="col-name">
                <strong>{{ s.profile.nickname || s.profile.email }}</strong>
                <small>{{ new Date(s.profile.created_at).toLocaleDateString('zh-CN') }} 注册</small>
              </td>
              <td class="col-progress">
                <div class="tbl-bar">
                  <div class="tbl-bar-fill" :style="{ width: s.percent + '%' }"></div>
                </div>
                <span class="tbl-pct">{{ s.percent }}%</span>
                <span class="tbl-count">{{ s.progressCount }}/{{ totalLessons }}</span>
              </td>
              <td class="col-streak"><span class="streak-tag">🔥 {{ s.streak }}</span> <small>{{ s.checkinDays }}天</small></td>
              <td>{{ s.quizCorrect }}/{{ s.quizTotal }}</td>
              <td>
                <span v-if="s.lastActive">{{ s.daysSinceActive === 0 ? '今天' : s.daysSinceActive + '天前' }}</span>
                <span v-else class="never">未开始</span>
              </td>
              <td>
                <span v-if="s.isStale" class="badge-warn">停滞</span>
                <span v-else-if="s.percent === 0" class="badge-new">新</span>
                <span v-else-if="s.percent === 100" class="badge-done">毕业</span>
                <span v-else class="badge-active">活跃</span>
              </td>
              <td><span class="detail-link">详情 →</span></td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="7" class="no-result">没有匹配的学员</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <p>还没有学员注册</p>
        <p class="empty-hint">分享你的网站链接，等学员注册后这里就能看到数据</p>
      </div>
    </div>

    <!-- 学员详情 -->
    <div v-else-if="selectedStudent" class="student-detail">
      <button class="back-btn" @click="selectedStudent = null">← 返回列表</button>
      <h2>{{ selectedStudent.profile.nickname || selectedStudent.profile.email }}</h2>
      <p class="detail-email">{{ selectedStudent.profile.email }} · {{ new Date(selectedStudent.profile.created_at).toLocaleDateString('zh-CN') }} 注册</p>

      <div class="detail-stats">
        <div class="ds-item"><span class="ds-num">{{ selectedStudent.percent }}%</span><span class="ds-label">总完成率</span></div>
        <div class="ds-item"><span class="ds-num">{{ selectedStudent.progressCount }}/{{ totalLessons }}</span><span class="ds-label">完成课时</span></div>
        <div class="ds-item"><span class="ds-num">{{ selectedStudent.quizCorrect }}/{{ selectedStudent.quizTotal }}</span><span class="ds-label">答题正确率</span></div>
      </div>

      <h3>已完成的课程（{{ detailProgress.length }}）</h3>
      <div v-if="detailProgress.length > 0" class="completed-list">
        <div v-for="p in detailProgress" :key="p.lesson_id" class="completed-item">
          <span class="check-mark">✅</span>
          <span>{{ lessonTitle(p.lesson_id) }}</span>
          <small>{{ new Date(p.completed_at).toLocaleString('zh-CN') }}</small>
        </div>
      </div>
      <p v-else class="empty-hint">还没有完成任何课程</p>

      <h3>答题记录（{{ detailQuiz.length }}）</h3>
      <div v-if="detailQuiz.length > 0" class="quiz-list">
        <div v-for="q in detailQuiz.slice(0, 30)" :key="q.lesson_id + q.question_index" class="quiz-item" :class="{ correct: q.is_correct, wrong: !q.is_correct }">
          <span class="q-result">{{ q.is_correct ? '✅' : '❌' }}</span>
          <span>{{ lessonTitle(q.lesson_id) }} · Q{{ q.question_index + 1 }}</span>
          <small>{{ new Date(q.answered_at).toLocaleString('zh-CN') }}</small>
        </div>
      </div>
      <p v-else class="empty-hint">还没有答题记录</p>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 100%;
}
.error-box, .loading-box {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
}
.back-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.dash-header h2 {
  margin: 0;
  font-size: 1.4rem;
}
.refresh-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.85rem;
}
.stats-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.stat-card {
  flex: 1;
  text-align: center;
  padding: 1rem;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}
.stat-card.warn {
  border-color: #ff9900;
  background: rgba(255, 153, 0, 0.05);
}
.stat-num {
  display: block;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}
.stat-card.warn .stat-num {
  color: #ff9900;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
/* 搜索筛选栏 */
.filter-bar {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
}
.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.filter-tabs {
  display: flex;
  gap: 0.3rem;
}
.filter-tabs button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}
.filter-tabs button.active {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  font-weight: 600;
}
/* 表格 */
.table-wrap {
  overflow-x: auto;
}
.student-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.student-table th {
  text-align: left;
  padding: 0.7rem 0.6rem;
  border-bottom: 2px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}
.student-table td {
  padding: 0.7rem 0.6rem;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: middle;
}
.student-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}
.student-table tbody tr:hover {
  background: var(--vp-c-bg-soft);
}
.student-table tr.stale td {
  background: rgba(255, 153, 0, 0.04);
}
.col-name strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 0.92rem;
}
.col-name small {
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
}
.col-progress {
  white-space: nowrap;
}
.tbl-bar {
  display: inline-block;
  width: 60px;
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
  vertical-align: middle;
  margin-right: 0.4rem;
}
.tbl-bar-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  border-radius: 3px;
}
.tbl-pct {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-right: 0.3rem;
}
.tbl-count {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.col-streak {
  white-space: nowrap;
}
.streak-tag {
  font-size: 0.82rem;
}
.col-streak small {
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
  margin-left: 0.2rem;
}
.no-result {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 2rem !important;
}
.never {
  color: var(--vp-c-text-2);
}
.badge-warn { color: #ff9900; font-weight: 600; font-size: 0.78rem; }
.badge-new { color: var(--vp-c-text-2); font-size: 0.78rem; }
.badge-done { color: #22c55e; font-weight: 600; font-size: 0.78rem; }
.badge-active { color: var(--vp-c-brand-1); font-size: 0.78rem; }
.detail-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}
.empty-state {
  text-align: center;
  padding: 3rem;
}
.empty-hint {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
}
.student-detail {
  padding: 1rem 0;
}
.back-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.student-detail h2 {
  margin: 0 0 0.3rem;
}
.detail-email {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0 0 1.5rem;
}
.detail-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
.ds-item {
  flex: 1;
  text-align: center;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}
.ds-num {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.ds-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.completed-list, .quiz-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 2rem;
}
.completed-item, .quiz-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  font-size: 0.85rem;
}
.completed-item small, .quiz-item small {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
}
.quiz-item.wrong {
  background: rgba(239, 68, 68, 0.05);
}
h3 {
  font-size: 1rem;
  margin: 1.5rem 0 0.75rem;
  color: var(--vp-c-text-1);
}

/* 第4张统计卡用强调色 */
.stat-card.accent .stat-num {
  color: var(--vp-c-brand-1);
}

/* 网站访问区块 */
.visits-section {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.section-title {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  font-weight: 700;
}

/* 趋势柱状图 */
.trend-chart {
  margin-bottom: 1.25rem;
}
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100px;
}
.trend-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  min-width: 0;
  position: relative;
}
.bar-fill {
  width: 100%;
  min-height: 2px;
  background: var(--vp-c-brand-1);
  border-radius: 3px 3px 0 0;
  opacity: 0.85;
  transition: opacity 0.15s;
}
.trend-bar:hover .bar-fill { opacity: 1; }
.bar-count {
  position: absolute;
  top: -1.1rem;
  font-size: 0.68rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.bar-label {
  font-size: 0.62rem;
  color: var(--vp-c-text-3);
  margin-top: 0.25rem;
  white-space: nowrap;
}
.trend-legend {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

/* 双栏：热门页面 + 登录占比 */
.visits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 640px) {
  .visits-grid { grid-template-columns: 1fr; }
}
.visits-card {
  padding: 0.85rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}
.vc-title {
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
  color: var(--vp-c-text-1);
}
.vc-empty {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 0.75rem 0;
}
.vc-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.vc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.vc-label {
  width: 4rem;
  flex-shrink: 0;
  color: var(--vp-c-text-2);
}
.vc-bar {
  flex: 1;
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}
.vc-bar-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  border-radius: 4px;
}
.vc-count {
  font-weight: 700;
  color: var(--vp-c-text-1);
  min-width: 1.5rem;
  text-align: right;
}

/* 登录/游客占比条 */
.ratio-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.ratio-logged {
  background: var(--vp-c-brand-1);
  transition: width 0.3s;
}
.ratio-guest {
  background: var(--vp-c-divider);
  transition: width 0.3s;
}
.ratio-legend {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.rl-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.logged { background: var(--vp-c-brand-1); }
.dot.guest { background: var(--vp-c-divider); }
</style>
