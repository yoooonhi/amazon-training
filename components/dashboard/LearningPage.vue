<script setup>
/**
 * 学习分析页
 *
 * 全站答题正确率、错题排行、课程难度热力、完课率分布、每日完成趋势。
 * 独立加载 quiz_results + progress。
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { totalLessons, getLessonLabel } from '../../lib/curriculum'

const loading = ref(true)
const overallCorrectRate = ref(0)
const totalAnswers = ref(0)
const totalCorrect = ref(0)
const errorQuestions = ref([]) // 错题排行
const lessonDifficulty = ref([]) // 课程难度（按 lesson_id 平均正确率）
const completionDist = ref({ p0: 0, p25: 0, p50: 0, p75: 0 }) // 完课率分布
const dailyCompletions = ref([]) // 每日完成课时数

function toLocalDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadData() {
  loading.value = true

  // quiz_results
  const { data: quizzes } = await supabase
    .from('quiz_results')
    .select('lesson_id, question_index, is_correct')
  const allQuiz = quizzes || []
  totalAnswers.value = allQuiz.length
  totalCorrect.value = allQuiz.filter((q) => q.is_correct).length
  overallCorrectRate.value = totalAnswers.value
    ? Math.round((totalCorrect.value / totalAnswers.value) * 100)
    : 0

  // 错题排行：按 lesson_id + question_index 聚合错误率
  const questionStats = {} // key: `${lesson_id}-Q${q_index}`
  allQuiz.forEach((q) => {
    const key = `${q.lesson_id}|Q${q.question_index + 1}`
    if (!questionStats[key]) questionStats[key] = { lessonId: q.lesson_id, qIndex: q.question_index + 1, total: 0, wrong: 0 }
    questionStats[key].total++
    if (!q.is_correct) questionStats[key].wrong++
  })
  errorQuestions.value = Object.values(questionStats)
    .map((s) => ({ ...s, wrongRate: Math.round((s.wrong / s.total) * 100) }))
    .filter((s) => s.total >= 3) // 至少3人答过才有统计意义
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 10)

  // 课程难度（按 lesson_id 聚合）
  const lessonStats = {}
  allQuiz.forEach((q) => {
    if (!lessonStats[q.lesson_id]) lessonStats[q.lesson_id] = { lessonId: q.lesson_id, total: 0, correct: 0 }
    lessonStats[q.lesson_id].total++
    if (q.is_correct) lessonStats[q.lesson_id].correct++
  })
  lessonDifficulty.value = Object.values(lessonStats)
    .map((s) => ({ ...s, correctRate: Math.round((s.correct / s.total) * 100) }))
    .filter((s) => s.total >= 2)
    .sort((a, b) => a.correctRate - b.correctRate) // 正确率低的排前面（最难的课）

  // progress：完课率分布 + 每日完成趋势
  const { data: allProgress } = await supabase
    .from('progress')
    .select('user_id, lesson_id, completed, completed_at')
  const completed = (allProgress || []).filter((p) => p.completed)

  // 完课率分布
  const userCounts = {}
  completed.forEach((p) => {
    userCounts[p.user_id] = (userCounts[p.user_id] || 0) + 1
  })
  const dist = { p0: 0, p25: 0, p50: 0, p75: 0 }
  const halfTotal = totalLessons / 2
  Object.values(userCounts).forEach((c) => {
    const pctVal = c / totalLessons
    if (pctVal >= 0.75) dist.p75++
    else if (pctVal >= 0.5) dist.p50++
    else if (pctVal >= 0.25) dist.p25++
    else dist.p0++
  })
  completionDist.value = dist

  // 每日完成趋势（近14天）
  const dayCounts = {}
  completed.forEach((p) => {
    const k = toLocalDateStr(p.completed_at)
    dayCounts[k] = (dayCounts[k] || 0) + 1
  })
  const today = new Date()
  const trend = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const k = toLocalDateStr(d)
    trend.push({ key: `${d.getMonth() + 1}/${d.getDate()}`, count: dayCounts[k] || 0 })
  }
  dailyCompletions.value = trend

  loading.value = false
}

const maxDaily = computed(() =>
  Math.max(1, ...dailyCompletions.value.map((d) => d.count))
)

// lessonId → 可读标签（课序号 + 课名）
function lessonLabel(id) {
  return getLessonLabel(id)
}

function diffColor(rate) {
  if (rate < 40) return '#dc2626' // 红=很难
  if (rate < 60) return '#f59e0b' // 橙=偏难
  if (rate < 80) return '#fbbf24' // 黄=中等
  return '#16a34a' // 绿=容易
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载学习数据中...</div>
  <div v-else>
    <!-- 正确率大数字 -->
    <div class="data-section" style="text-align: center;">
      <span class="big-number" :style="{ color: overallCorrectRate >= 70 ? '#16a34a' : overallCorrectRate >= 50 ? '#f59e0b' : '#dc2626' }">
        {{ overallCorrectRate }}%
      </span>
      <div class="big-number-label">全站答题正确率（{{ totalCorrect }}/{{ totalAnswers }} 题）</div>
    </div>

    <!-- 完课率分布 -->
    <div class="data-section">
      <h3 class="section-title">📊 完课率分布（{{ Object.values(completionDist).reduce((a,b)=>a+b,0) }} 名学员）</h3>
      <div class="dist-bars">
        <div class="dist-item">
          <div class="dist-bar" :style="{ height: '100%' }"><span>{{ completionDist.p0 }}</span></div>
          <span class="dist-label">0-25%</span>
        </div>
        <div class="dist-item">
          <div class="dist-bar" style="background: #fbbf24;"><span>{{ completionDist.p25 }}</span></div>
          <span class="dist-label">25-50%</span>
        </div>
        <div class="dist-item">
          <div class="dist-bar" style="background: #f59e0b;"><span>{{ completionDist.p50 }}</span></div>
          <span class="dist-label">50-75%</span>
        </div>
        <div class="dist-item">
          <div class="dist-bar" style="background: #16a34a;"><span>{{ completionDist.p75 }}</span></div>
          <span class="dist-label">75-100%</span>
        </div>
      </div>
    </div>

    <!-- 每日完成趋势 -->
    <div class="data-section">
      <h3 class="section-title">📈 近 14 天每日完成课时数</h3>
      <div class="chart-bars">
        <div v-for="d in dailyCompletions" :key="d.key" class="chart-bar" :title="`${d.key}: ${d.count} 课时`">
          <div class="chart-bar-fill" :style="{ height: (d.count / maxDaily * 100) + '%' }"></div>
          <span v-if="d.count > 0" class="chart-bar-count">{{ d.count }}</span>
          <span class="chart-bar-label">{{ d.key }}</span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- 错题排行 -->
      <div class="data-section">
        <h3 class="section-title">❌ 错题排行榜 Top 10</h3>
        <div v-if="errorQuestions.length === 0" class="empty-hint">暂无足够数据</div>
        <table v-else class="rank-table">
          <thead><tr><th>课程</th><th>题号</th><th>错误率</th><th>答题数</th></tr></thead>
          <tbody>
            <tr v-for="(q, i) in errorQuestions" :key="i">
              <td>{{ lessonLabel(q.lessonId) }}</td>
              <td>Q{{ q.qIndex }}</td>
              <td><span class="wrong-rate" :style="{ color: diffColor(100 - q.wrongRate) }">{{ q.wrongRate }}%</span></td>
              <td>{{ q.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 课程难度 -->
      <div class="data-section">
        <h3 class="section-title">🔥 最难课程（正确率最低）</h3>
        <div v-if="lessonDifficulty.length === 0" class="empty-hint">暂无足够数据</div>
        <div v-else class="diff-list">
          <div v-for="(l, i) in lessonDifficulty.slice(0, 10)" :key="i" class="diff-item">
            <span class="diff-name" :title="lessonLabel(l.lessonId)">{{ lessonLabel(l.lessonId) }}</span>
            <div class="diff-bar-wrap">
              <div class="diff-bar-fill" :style="{ width: l.correctRate + '%', background: diffColor(l.correctRate) }"></div>
            </div>
            <span class="diff-rate" :style="{ color: diffColor(l.correctRate) }">{{ l.correctRate }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';

.dist-bars { display: flex; gap: 1rem; justify-content: center; align-items: flex-end; height: 120px; padding: 1rem 0; }
.dist-item { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
.dist-bar { width: 60px; background: var(--vp-c-brand-1); border-radius: 6px 6px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 0.4rem; color: #fff; font-weight: 700; font-size: 0.9rem; min-height: 20px; }
.dist-label { font-size: 0.75rem; color: var(--vp-c-text-2); }

.rank-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.rank-table th { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2); font-size: 0.75rem; }
.rank-table td { padding: 0.5rem; border-bottom: 1px solid var(--vp-c-divider); }
.wrong-rate { font-weight: 700; }

.diff-list { display: flex; flex-direction: column; gap: 0.5rem; }
.diff-item { display: flex; align-items: center; gap: 0.5rem; }
.diff-name { font-size: 0.78rem; color: var(--vp-c-text-1); width: 100px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diff-bar-wrap { flex: 1; height: 18px; background: var(--vp-c-divider); border-radius: 4px; overflow: hidden; }
.diff-bar-fill { height: 100%; border-radius: 4px; }
.diff-rate { font-size: 0.78rem; font-weight: 700; width: 40px; text-align: right; }
</style>
