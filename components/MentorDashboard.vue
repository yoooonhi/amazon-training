<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { curriculum, totalLessons } from '../lib/curriculum'
import { LEVELS } from '../lib/accessControl'
import { modalConfirm, modalAlert } from '../lib/modal'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

const isMounted = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const isMentor = ref(false)
const students = ref([])
const selectedStudent = ref(null)
const detailProgress = ref([])
const detailQuiz = ref([])

// 课程等级授权
const accessMap = ref({}) // { userId: ['初级', '高级'] }
const selectedIds = ref(new Set()) // 批量授权勾选的学员 id
const batchLevel = ref('') // 批量授权选中的等级
const accessBusy = ref(false) // 授权操作进行中
// 可授权的等级（不含入门，入门默认开放）
const GRANTABLE_LEVELS = LEVELS.filter((l) => l !== '入门')

async function checkMentor() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) {
    errorMsg.value = '请先登录导师账号'
    loading.value = false
    return
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.session.user.id).single()
  if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
    errorMsg.value = '你不是管理员账号，无法查看后台'
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
  // 拉课程等级授权（表可能还没建，容错处理）
  let allAccess = null
  try {
    const res = await supabase.from('course_access').select('user_id, level')
    if (!res.error) allAccess = res.data
  } catch {
    // course_access 表不存在时静默降级，授权功能不可用但不影响其他数据
  }
  // 构建 accessMap: { userId: ['初级', '高级'] }
  const aMap = {}
  ;(allAccess || []).forEach((r) => {
    if (!aMap[r.user_id]) aMap[r.user_id] = []
    aMap[r.user_id].push(r.level)
  })
  accessMap.value = aMap

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
      accessLevels: aMap[p.id] || [],
    }
  })
  // 拉网站访问统计（仅管理员能读，RLS 保证）
  const { data: visitData } = await supabase.from('site_visits')
    .select('path, page_type, is_logged_in, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)
  visits.value = visitData || []

  // 拉全部评论（管理员可读全部，RLS 保证）+ 组装作者信息 + 点赞数
  const { data: rawComments } = await supabase.from('comments')
    .select('id, lesson_id, user_id, parent_id, content, is_pinned, is_featured, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  const commentList = rawComments || []
  // 批量查评论作者的 profiles（可能包含非 student 的管理员评论）
  const commentUserIds = [...new Set(commentList.map(c => c.user_id))]
  const commentProfileMap = {}
  if (commentUserIds.length > 0) {
    const { data: cp } = await supabase.from('profiles')
      .select('id, nickname, role').in('id', commentUserIds)
    ;(cp || []).forEach(p => { commentProfileMap[p.id] = p })
  }
  // 聚合点赞数
  const commentIds = commentList.map(c => c.id)
  const commentLikeMap = {}
  if (commentIds.length > 0) {
    const { data: cl } = await supabase.from('comment_likes')
      .select('comment_id').in('comment_id', commentIds)
    ;(cl || []).forEach(l => { commentLikeMap[l.comment_id] = (commentLikeMap[l.comment_id] || 0) + 1 })
  }
  // 组装：加 authorName/authorRole/likeCount/lessonLabel/parentAuthor
  const commentById = {}
  commentList.forEach(c => { commentById[c.id] = c })
  allComments.value = commentList.map(c => {
    const p = commentProfileMap[c.user_id] || {}
    const parent = c.parent_id ? commentById[c.parent_id] : null
    const parentAuthor = parent ? (commentProfileMap[parent.user_id]?.nickname || '同学') : null
    return {
      ...c,
      authorName: p.nickname || '同学',
      authorRole: p.role || null,
      likeCount: commentLikeMap[c.id] || 0,
      lessonLabel: lessonTitle(c.lesson_id),
      parentAuthor,
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
      return `${w.level}${w.week} · ${lessonId}`
    }
  }
  return lessonId
}

// ===== 课程等级授权操作 =====

// 拿当前导师的 user_id（用于 granted_by 审计）
async function getMentorId() {
  const { data: session } = await supabase.auth.getSession()
  return session.session?.user?.id || null
}

// 单个学员：切换某等级授权（开→关 / 关→开）
async function toggleAccess(student, level) {
  if (accessBusy.value) return
  const has = student.accessLevels.includes(level)
  const action = has ? '取消' : '授权'
  const ok = await modalConfirm(`确定为「${student.profile.nickname || student.profile.email}」${action}「${level}」课程？`, '课程等级授权')
  if (!ok) return
  accessBusy.value = true
  try {
    const mentorId = await getMentorId()
    if (has) {
      // 取消授权
      const { error } = await supabase.from('course_access')
        .delete().eq('user_id', student.profile.id).eq('level', level)
      if (error) { await modalAlert('取消失败: ' + error.message, '出错了'); return }
      student.accessLevels = student.accessLevels.filter((l) => l !== level)
    } else {
      // 授权
      const { error } = await supabase.from('course_access').upsert({
        user_id: student.profile.id,
        level,
        granted_by: mentorId,
      }, { onConflict: 'user_id,level' })
      if (error) { await modalAlert('授权失败: ' + error.message, '出错了'); return }
      student.accessLevels = [...student.accessLevels, level]
    }
    // 同步到 accessMap
    accessMap.value[student.profile.id] = student.accessLevels
  } finally {
    accessBusy.value = false
  }
}

// 批量勾选
function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

// 批量授权
async function batchGrant() {
  if (accessBusy.value) return
  const ids = [...selectedIds.value]
  if (ids.length === 0) { await modalAlert('请先勾选学员', '提示'); return }
  if (!batchLevel.value) { await modalAlert('请选择要授权的等级', '提示'); return }
  const ok = await modalConfirm(`确定为选中的 ${ids.length} 名学员授权「${batchLevel.value}」课程？`, '批量授权')
  if (!ok) return
  accessBusy.value = true
  try {
    const mentorId = await getMentorId()
    const rows = ids.map((uid) => ({ user_id: uid, level: batchLevel.value, granted_by: mentorId }))
    const { error } = await supabase.from('course_access').upsert(rows, { onConflict: 'user_id,level' })
    if (error) { await modalAlert('批量授权失败: ' + error.message, '出错了'); return }
    // 同步本地状态
    students.value.forEach((s) => {
      if (selectedIds.value.has(s.profile.id)) {
        if (!s.accessLevels.includes(batchLevel.value)) {
          s.accessLevels = [...s.accessLevels, batchLevel.value]
        }
        accessMap.value[s.profile.id] = s.accessLevels
      }
    })
    await modalAlert(`已为 ${ids.length} 名学员授权「${batchLevel.value}」`, '完成')
    selectedIds.value = new Set()
  } finally {
    accessBusy.value = false
  }
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

// ---------------- 评论管理 ----------------
// 统计：总评论数、今日新增
const totalComments = computed(() => allComments.value.length)
const todayComments = computed(() =>
  allComments.value.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length
)

// 课程下拉选项：从评论里动态提取出现过的课程
const commentLessons = computed(() => {
  const map = {}
  allComments.value.forEach(c => { if (!map[c.lesson_id]) map[c.lesson_id] = c.lessonLabel })
  return Object.entries(map).map(([id, label]) => ({ id, label }))
})

// 筛选状态
const cmFilter = reactive({
  lesson: 'all',
  status: 'all',
  type: 'all',
  time: 'all',
})
function resetCmFilter() {
  cmFilter.lesson = 'all'; cmFilter.status = 'all'; cmFilter.type = 'all'; cmFilter.time = 'all'
}

const filteredComments = computed(() => {
  return allComments.value
    .filter(c => cmFilter.lesson === 'all' || c.lesson_id === cmFilter.lesson)
    .filter(c => {
      if (cmFilter.status === 'pinned') return c.is_pinned
      if (cmFilter.status === 'featured') return c.is_featured
      if (cmFilter.status === 'normal') return !c.is_pinned && !c.is_featured
      return true
    })
    .filter(c => {
      if (cmFilter.type === 'main') return !c.parent_id
      if (cmFilter.type === 'reply') return !!c.parent_id
      return true
    })
    .filter(c => {
      if (cmFilter.time === 'today') {
        const d = new Date(c.created_at); const now = new Date()
        return d.toDateString() === now.toDateString()
      }
      if (cmFilter.time === 'week') {
        return (Date.now() - new Date(c.created_at).getTime()) < 7 * 86400000
      }
      return true
    })
})

// 评论操作（从 Comments.vue 移植）
async function cmDelete(comment) {
  const ok = await modalConfirm('其下的回复也会一并删除，确定吗？', '删除评论')
  if (!ok) return
  const { error } = await supabase.from('comments').delete().eq('id', comment.id)
  if (error) { await modalAlert('删除失败：' + error.message, '出错了'); return }
  // 本地移除该条 + 它的回复
  allComments.value = allComments.value.filter(
    c => c.id !== comment.id && c.parent_id !== comment.id
  )
}
async function cmTogglePinned(comment) {
  const { error } = await supabase.from('comments')
    .update({ is_pinned: !comment.is_pinned }).eq('id', comment.id)
  if (error) { await modalAlert('操作失败：' + error.message, '出错了'); return }
  comment.is_pinned = !comment.is_pinned
}
async function cmToggleFeatured(comment) {
  const { error } = await supabase.from('comments')
    .update({ is_featured: !comment.is_featured }).eq('id', comment.id)
  if (error) { await modalAlert('操作失败：' + error.message, '出错了'); return }
  comment.is_featured = !comment.is_featured
}

// 渲染 Markdown（复用 Comments.vue 的净化配置）
function renderCommentMd(md) {
  if (!md) return ''
  const raw = marked.parse(md)
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'del', 'hr', 'span'],
    ALLOWED_ATTR: ['href', 'title'],
  })
}
function commentTimeAgo(iso) {
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
function isAdminAuthor(c) {
  return c.authorRole === 'mentor' || c.authorRole === 'admin'
}

onMounted(async () => {
  isMounted.value = true
  await checkMentor()
  if (isMentor.value) {
    try {
      await loadData()
    } catch (e) {
      console.error('[Dashboard] loadData 崩溃:', e)
      errorMsg.value = '数据加载出错: ' + (e?.message || e)
      loading.value = false
    }
  }
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
        <div class="stat-card">
          <span class="stat-num">💬 {{ totalComments }}</span>
          <span class="stat-label">评论 · 今日 {{ todayComments }}</span>
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

      <!-- 评论管理 -->
      <div class="comments-section">
        <div class="cm-head">
          <h3 class="section-title">💬 评论管理</h3>
          <span class="cm-count" v-if="allComments.length > 0">
            共 {{ allComments.length }} 条 · 当前显示 {{ filteredComments.length }}
          </span>
        </div>

        <!-- 筛选栏 -->
        <div class="cm-filters" v-if="allComments.length > 0">
          <select v-model="cmFilter.lesson" class="cm-select">
            <option value="all">全部课程</option>
            <option v-for="l in commentLessons" :key="l.id" :value="l.id">{{ l.label }}</option>
          </select>
          <select v-model="cmFilter.status" class="cm-select">
            <option value="all">全部状态</option>
            <option value="pinned">📌 已置顶</option>
            <option value="featured">⭐ 已加精</option>
            <option value="normal">普通</option>
          </select>
          <select v-model="cmFilter.type" class="cm-select">
            <option value="all">全部类型</option>
            <option value="main">主评论(提问)</option>
            <option value="reply">回复(回答)</option>
          </select>
          <select v-model="cmFilter.time" class="cm-select">
            <option value="all">全部时间</option>
            <option value="today">今日</option>
            <option value="week">近 7 天</option>
          </select>
          <button class="cm-reset" @click="resetCmFilter">重置</button>
        </div>

        <!-- 评论列表 -->
        <div v-if="filteredComments.length === 0" class="cm-empty">
          {{ allComments.length === 0 ? '还没有任何评论' : '没有匹配的评论' }}
        </div>
        <div v-else class="cm-list">
          <div
            v-for="c in filteredComments"
            :key="c.id"
            class="cm-item"
            :class="{ pinned: c.is_pinned, reply: c.parent_id }"
          >
            <div class="cm-meta">
              <span class="cm-lesson">{{ c.lessonLabel }}</span>
              <span v-if="c.is_pinned" class="cm-tag pin">📌 置顶</span>
              <span v-if="c.is_featured" class="cm-tag feat">⭐ 精选</span>
              <span class="cm-author" :class="{ admin: isAdminAuthor(c) }">
                {{ c.parentAuthor ? `↪ ${c.authorName} 回复 ${c.parentAuthor}` : c.authorName }}
              </span>
              <span v-if="isAdminAuthor(c)" class="cm-role">管理员</span>
              <span class="cm-time">{{ commentTimeAgo(c.created_at) }}</span>
            </div>
            <div class="cm-content" v-html="renderCommentMd(c.content)"></div>
            <div class="cm-actions">
              <span class="cm-likes">❤ {{ c.likeCount }}</span>
              <button class="cm-btn" @click="cmTogglePinned(c)">
                {{ c.is_pinned ? '取消置顶' : '置顶' }}
              </button>
              <button class="cm-btn" @click="cmToggleFeatured(c)">
                {{ c.is_featured ? '取消精选' : '精选' }}
              </button>
              <button class="cm-btn danger" @click="cmDelete(c)">删除</button>
            </div>
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

      <!-- 批量授权栏 -->
      <div v-if="students.length > 0" class="batch-bar">
        <span class="batch-info">已选 {{ selectedIds.size }} 人</span>
        <select v-model="batchLevel" class="batch-select">
          <option value="">选择等级...</option>
          <option v-for="lv in GRANTABLE_LEVELS" :key="lv" :value="lv">{{ lv }}</option>
        </select>
        <button class="batch-btn" :disabled="accessBusy" @click="batchGrant">🔑 批量授权</button>
        <button v-if="selectedIds.size > 0" class="batch-clear" @click="selectedIds = new Set()">清空选择</button>
      </div>

      <!-- 学员表格 -->
      <div v-if="students.length > 0" class="table-wrap">
        <table class="student-table">
          <thead>
            <tr>
              <th class="col-check"><input type="checkbox" :checked="filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.profile.id))" @change="filteredStudents.forEach(s => toggleSelect(s.profile.id))" /></th>
              <th>学员</th>
              <th>完成进度</th>
              <th>打卡</th>
              <th>答题</th>
              <th>课程权限</th>
              <th>最后学习</th>
              <th>状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStudents" :key="s.profile.id" :class="{ stale: s.isStale }">
              <td class="col-check" @click.stop><input type="checkbox" :checked="selectedIds.has(s.profile.id)" @change="toggleSelect(s.profile.id)" /></td>
              <td class="col-name" @click="viewDetail(s)">
                <strong>{{ s.profile.nickname || s.profile.email }}</strong>
                <small>{{ new Date(s.profile.created_at).toLocaleDateString('zh-CN') }} 注册</small>
              </td>
              <td class="col-progress" @click="viewDetail(s)">
                <div class="tbl-bar">
                  <div class="tbl-bar-fill" :style="{ width: s.percent + '%' }"></div>
                </div>
                <span class="tbl-pct">{{ s.percent }}%</span>
                <span class="tbl-count">{{ s.progressCount }}/{{ totalLessons }}</span>
              </td>
              <td class="col-streak" @click="viewDetail(s)"><span class="streak-tag">🔥 {{ s.streak }}</span> <small>{{ s.checkinDays }}天</small></td>
              <td @click="viewDetail(s)">{{ s.quizCorrect }}/{{ s.quizTotal }}</td>
              <td class="col-access" @click="viewDetail(s)">
                <span v-if="s.accessLevels.length === 0" class="access-none">仅入门</span>
                <span v-else class="access-tags">
                  <span v-for="lv in s.accessLevels" :key="lv" class="access-tag">{{ lv }}</span>
                </span>
              </td>
              <td @click="viewDetail(s)">
                <span v-if="s.lastActive">{{ s.daysSinceActive === 0 ? '今天' : s.daysSinceActive + '天前' }}</span>
                <span v-else class="never">未开始</span>
              </td>
              <td @click="viewDetail(s)">
                <span v-if="s.isStale" class="badge-warn">停滞</span>
                <span v-else-if="s.percent === 0" class="badge-new">新</span>
                <span v-else-if="s.percent === 100" class="badge-done">毕业</span>
                <span v-else class="badge-active">活跃</span>
              </td>
              <td @click="viewDetail(s)"><span class="detail-link">详情 →</span></td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="9" class="no-result">没有匹配的学员</td>
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

      <!-- 课程等级授权面板 -->
      <div class="access-panel">
        <h3>🔑 课程等级授权</h3>
        <p class="access-hint">为该学员开放对应等级的课程，保存后学员刷新即生效。入门默认开放。</p>
        <div class="access-toggles">
          <div class="access-toggle-item">
            <span class="access-level-name">入门</span>
            <span class="access-status always-on">默认开放</span>
          </div>
          <div v-for="lv in GRANTABLE_LEVELS" :key="lv" class="access-toggle-item">
            <span class="access-level-name">{{ lv }}</span>
            <button
              class="access-switch"
              :class="{ on: selectedStudent.accessLevels.includes(lv) }"
              :disabled="accessBusy"
              @click="toggleAccess(selectedStudent, lv)"
            >
              {{ selectedStudent.accessLevels.includes(lv) ? '已授权 ✓' : '未授权' }}
            </button>
          </div>
        </div>
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
  width: 100%;
}
/* 关键:覆盖 VitePress 全局 .vp-doc table{display:block} —— 它让表格按内容收缩 */
.student-table {
  display: table !important;
  width: 100% !important;
  table-layout: auto;
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

/* 评论管理区块 */
.comments-section {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.cm-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.cm-head .section-title { margin: 0; }
.cm-count {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.cm-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}
.cm-select {
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  cursor: pointer;
}
.cm-select:focus { outline: none; border-color: var(--vp-c-brand-2); }
.cm-reset {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  cursor: pointer;
}
.cm-reset:hover { color: var(--vp-c-text-1); }

.cm-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}
.cm-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.cm-item {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid transparent;
}
.cm-item.pinned {
  border-color: var(--vp-c-brand-2);
  border-left-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.04));
}
.cm-item.reply {
  border-left-color: var(--vp-c-divider);
}
.cm-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
}
.cm-lesson {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.cm-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
}
.cm-tag.pin { color: var(--vp-c-brand-1); }
.cm-tag.feat { color: #d97706; }
.cm-author {
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.cm-author.admin { color: var(--vp-c-brand-1); }
.cm-role {
  font-size: 0.68rem;
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.12));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.cm-time {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-left: auto;
}
.cm-content {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  margin-bottom: 0.4rem;
}
.cm-content :deep(p) { margin: 0.25rem 0; }
.cm-content :deep(p:first-child) { margin-top: 0; }
.cm-content :deep(p:last-child) { margin-bottom: 0; }
.cm-content :deep(pre) {
  padding: 0.5rem; margin: 0.4rem 0; border-radius: 5px;
  background: var(--vp-c-bg-soft); overflow-x: auto; font-size: 0.8rem;
}
.cm-content :deep(code) {
  padding: 0.1rem 0.3rem; border-radius: 3px;
  background: var(--vp-c-bg-soft); font-size: 0.85em;
}
.cm-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.cm-likes {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  margin-right: auto;
}
.cm-btn {
  padding: 0.25rem 0.7rem;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s;
}
.cm-btn:hover { color: var(--vp-c-text-1); border-color: var(--vp-c-brand-2); }
.cm-btn.danger:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.06); }

/* ===== 课程等级授权 ===== */
.col-check { width: 36px; text-align: center; }
.col-check input { cursor: pointer; }
.col-access { max-width: 140px; }
.access-none { font-size: 0.78rem; color: var(--vp-c-text-3); }
.access-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.access-tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-soft, rgba(59,130,246,0.12));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}
.batch-info { font-size: 0.85rem; color: var(--vp-c-text-2); font-weight: 600; min-width: 5rem; }
.batch-select {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.85rem;
  cursor: pointer;
}
.batch-btn {
  padding: 0.4rem 1rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.batch-btn:hover:not(:disabled) { opacity: 0.9; }
.batch-btn:disabled { opacity: 0.5; cursor: default; }
.batch-clear {
  padding: 0.4rem 0.6rem;
  border: none;
  background: none;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
  cursor: pointer;
}
.batch-clear:hover { color: var(--vp-c-text-1); }

/* 授权面板（详情页） */
.access-panel {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.access-panel h3 { margin: 0 0 0.5rem; font-size: 1.05rem; }
.access-hint { font-size: 0.82rem; color: var(--vp-c-text-3); margin: 0 0 1rem; }
.access-toggles { display: flex; flex-direction: column; gap: 0.6rem; }
.access-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}
.access-level-name { font-weight: 600; font-size: 0.9rem; color: var(--vp-c-text-1); }
.access-status.always-on { font-size: 0.82rem; color: var(--vp-c-text-3); }
.access-switch {
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.access-switch.on {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}
.access-switch:hover:not(:disabled) { border-color: var(--vp-c-brand-2); }
.access-switch.on:hover:not(:disabled) { opacity: 0.9; }
.access-switch:disabled { opacity: 0.6; cursor: default; }
</style>
