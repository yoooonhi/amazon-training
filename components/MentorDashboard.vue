<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { curriculum, totalLessons } from '../lib/curriculum'

const isMounted = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const isMentor = ref(false)
const students = ref([]) // [{ profile, progressCount, checkins, lastActive, quizCorrect, quizTotal }]
const selectedStudent = ref(null) // for detail view
const detailProgress = ref([])
const detailQuiz = ref([])

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

const sortedStudents = computed(() => {
  return [...students.value].sort((a, b) => b.percent - a.percent)
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
      </div>

      <div v-if="students.length > 0" class="student-cards">
        <div
          v-for="s in sortedStudents"
          :key="s.profile.id"
          class="student-card"
          :class="{ stale: s.isStale }"
          @click="viewDetail(s)"
        >
          <!-- 卡片头部：名字+状态 -->
          <div class="card-top">
            <div class="card-name">
              <strong>{{ s.profile.nickname || s.profile.email }}</strong>
              <small>{{ new Date(s.profile.created_at).toLocaleDateString('zh-CN') }} 注册</small>
            </div>
            <span v-if="s.isStale" class="badge-warn">停滞</span>
            <span v-else-if="s.percent === 0" class="badge-new">新</span>
            <span v-else-if="s.percent === 100" class="badge-done">毕业</span>
            <span v-else class="badge-active">活跃</span>
          </div>

          <!-- 进度条 -->
          <div class="card-progress">
            <div class="card-bar">
              <div class="card-bar-fill" :style="{ width: s.percent + '%' }"></div>
            </div>
            <span class="card-pct">{{ s.percent }}%</span>
            <span class="card-count">{{ s.progressCount }}/{{ totalLessons }}课</span>
          </div>

          <!-- 数据行 -->
          <div class="card-stats">
            <div class="card-stat">
              <span class="card-stat-num">🔥 {{ s.streak }}</span>
              <span class="card-stat-label">连续打卡</span>
            </div>
            <div class="card-stat">
              <span class="card-stat-num">{{ s.checkinDays }}</span>
              <span class="card-stat-label">打卡天数</span>
            </div>
            <div class="card-stat">
              <span class="card-stat-num">{{ s.quizCorrect }}/{{ s.quizTotal }}</span>
              <span class="card-stat-label">答题正确</span>
            </div>
            <div class="card-stat">
              <span class="card-stat-num" v-if="s.lastActive">{{ s.daysSinceActive === 0 ? '今天' : s.daysSinceActive + '天前' }}</span>
              <span class="card-stat-num never" v-else>未开始</span>
              <span class="card-stat-label">最后学习</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="detail-link">查看详情 →</span>
          </div>
        </div>
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
  max-width: 1000px;
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
.student-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}
.student-card {
  padding: 1.2rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.student-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.student-card.stale {
  border-color: rgba(255, 153, 0, 0.4);
  background: rgba(255, 153, 0, 0.04);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}
.card-name strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 1.05rem;
}
.card-name small {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
}
.card-progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.card-bar {
  flex: 1;
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
}
.card-bar-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  border-radius: 4px;
  transition: width 0.3s;
}
.card-pct {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  min-width: 2.5rem;
}
.card-count {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.card-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.card-stat-num {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.card-stat-label {
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}
.card-footer {
  margin-top: 0.8rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--vp-c-divider);
}
.detail-link {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.never {
  color: var(--vp-c-text-2);
}
.badge-warn { color: #ff9900; font-weight: 600; font-size: 0.78rem; }
.badge-new { color: var(--vp-c-text-2); font-size: 0.78rem; }
.badge-done { color: #22c55e; font-weight: 600; font-size: 0.78rem; }
.badge-active { color: var(--vp-c-brand-1); font-size: 0.78rem; }
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
</style>
