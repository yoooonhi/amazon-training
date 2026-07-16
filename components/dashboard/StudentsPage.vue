<script setup>
/**
 * 学员管理页
 *
 * 迁移自 MentorDashboard.vue 的学员列表 + 学员详情 + 批量授权。
 * 独立加载 profiles + progress + quiz + checkins + course_access。
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { LEVELS, isMentorRole } from '../../lib/accessControl'
import { curriculum, totalLessons } from '../../lib/curriculum'
import { modalConfirm, modalAlert } from '../../lib/modal'

const GRANTABLE_LEVELS = LEVELS.filter((l) => l !== '入门')

const loading = ref(true)
const errorMsg = ref('')
const students = ref([])
const selectedStudent = ref(null)
const detailProgress = ref([])
const detailQuiz = ref([])

// 搜索和筛选
const searchQuery = ref('')
const filterStatus = ref('all')

// 课程等级授权
const accessMap = ref({})
const selectedIds = ref(new Set())
const batchLevels = ref(new Set())
const batchDropdownOpen = ref(false)
const accessBusy = ref(false)

// 会员管理
const memberBusy = ref(false)

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
  if (pErr) {
    errorMsg.value = '读取学员失败: ' + pErr.message
    loading.value = false
    return
  }
  const { data: allProgress } = await supabase
    .from('progress')
    .select('user_id, lesson_id, completed, completed_at')
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('user_id, checkin_date')
  const { data: allQuiz } = await supabase
    .from('quiz_results')
    .select('user_id, is_correct, lesson_id, question_index')
  let allAccess = null
  try {
    const res = await supabase.from('course_access').select('user_id, level')
    if (!res.error) allAccess = res.data
  } catch {}

  const aMap = {}
  ;(allAccess || []).forEach((r) => {
    if (!aMap[r.user_id]) aMap[r.user_id] = []
    aMap[r.user_id].push(r.level)
  })
  accessMap.value = aMap

  students.value = profiles.map((p) => {
    const prog =
      allProgress?.filter((x) => x.user_id === p.id && x.completed) || []
    const checkins = allCheckins?.filter((x) => x.user_id === p.id) || []
    const quizzes = allQuiz?.filter((x) => x.user_id === p.id) || []
    const quizCorrect = quizzes.filter((x) => x.is_correct).length
    const lastActive =
      prog.length > 0 ? prog.map((x) => x.completed_at).sort().pop() : null
    let streak = 0
    const dates = checkins.map((c) => c.checkin_date).sort().reverse()
    if (dates.length > 0) {
      let d = new Date()
      for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(dates[i])
        const expected = new Date(d)
        expected.setDate(expected.getDate() - i)
        if (checkDate.toDateString() === expected.toDateString()) streak++
        else break
      }
    }
    const daysSinceActive = lastActive
      ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
      : null
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
      accessLevels: sortLevels(aMap[p.id] || []),
    }
  })
  loading.value = false
}

function sortLevels(levels) {
  return GRANTABLE_LEVELS.filter((lv) => levels.includes(lv))
}

async function viewDetail(student) {
  selectedStudent.value = student
  detailProgress.value = []
  detailQuiz.value = []
  window.scrollTo({ top: 0, behavior: 'smooth' })
  const { data: prog } = await supabase
    .from('progress')
    .select('lesson_id, completed, completed_at')
    .eq('user_id', student.profile.id)
    .eq('completed', true)
  detailProgress.value = prog || []
  const { data: quiz } = await supabase
    .from('quiz_results')
    .select('lesson_id, question_index, is_correct, answered_at')
    .eq('user_id', student.profile.id)
    .order('answered_at', { ascending: false })
  detailQuiz.value = quiz || []
}

function lessonTitle(lessonId) {
  for (const w of curriculum) {
    if (w.lessons.includes(lessonId)) return `${w.level}${w.week} · ${lessonId}`
  }
  return lessonId
}

async function getMentorId() {
  const { data: session } = await supabase.auth.getSession()
  return session.session?.user?.id || null
}

async function toggleAccess(student, level) {
  if (accessBusy.value) return
  const has = student.accessLevels.includes(level)
  const action = has ? '取消' : '授权'
  const ok = await modalConfirm(
    `确定为「${student.profile.nickname || student.profile.email}」${action}「${level}」课程？`,
    '课程等级授权'
  )
  if (!ok) return
  accessBusy.value = true
  try {
    const mentorId = await getMentorId()
    if (has) {
      const { error } = await supabase
        .from('course_access')
        .delete()
        .eq('user_id', student.profile.id)
        .eq('level', level)
      if (error) {
        await modalAlert('取消失败: ' + error.message, '出错了')
        return
      }
      student.accessLevels = student.accessLevels.filter((l) => l !== level)
    } else {
      const { error } = await supabase
        .from('course_access')
        .upsert(
          { user_id: student.profile.id, level, granted_by: mentorId },
          { onConflict: 'user_id,level' }
        )
      if (error) {
        await modalAlert('授权失败: ' + error.message, '出错了')
        return
      }
      student.accessLevels = sortLevels([...student.accessLevels, level])
    }
    accessMap.value[student.profile.id] = student.accessLevels
  } finally {
    accessBusy.value = false
  }
}

function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

function toggleBatchLevel(lv) {
  const s = new Set(batchLevels.value)
  if (s.has(lv)) s.delete(lv)
  else s.add(lv)
  batchLevels.value = s
}

async function batchGrant() {
  if (accessBusy.value) return
  const ids = [...selectedIds.value]
  const levels = GRANTABLE_LEVELS.filter((lv) => batchLevels.value.has(lv))
  if (ids.length === 0) {
    await modalAlert('请先勾选学员', '提示')
    return
  }
  if (levels.length === 0) {
    await modalAlert('请选择要授权的等级', '提示')
    return
  }
  const ok = await modalConfirm(
    `确定为选中的 ${ids.length} 名学员授权「${levels.join('、')}」课程？`,
    '批量授权'
  )
  if (!ok) return
  accessBusy.value = true
  try {
    const mentorId = await getMentorId()
    const rows = []
    ids.forEach((uid) => {
      levels.forEach((lv) =>
        rows.push({ user_id: uid, level: lv, granted_by: mentorId })
      )
    })
    const { error } = await supabase
      .from('course_access')
      .upsert(rows, { onConflict: 'user_id,level' })
    if (error) {
      await modalAlert('批量授权失败: ' + error.message, '出错了')
      return
    }
    students.value.forEach((s) => {
      if (selectedIds.value.has(s.profile.id)) {
        levels.forEach((lv) => {
          if (!s.accessLevels.includes(lv)) s.accessLevels.push(lv)
        })
        s.accessLevels = sortLevels(s.accessLevels)
        accessMap.value[s.profile.id] = s.accessLevels
      }
    })
    await modalAlert(`已为 ${ids.length} 名学员授权「${levels.join('、')}」`, '完成')
    selectedIds.value = new Set()
    batchLevels.value = new Set()
  } finally {
    accessBusy.value = false
  }
}

async function toggleMember(student) {
  if (memberBusy.value) return
  const next = !student.profile.is_member
  const action = next ? '开通' : '取消'
  const name = student.profile.nickname || student.profile.email
  const ok = await modalConfirm(
    `确定为「${name}」${action}付费会员？\n${next ? '开通后该学员可访问会员专享内容。' : '取消后该会员将失去专享权限。'}`,
    '会员管理'
  )
  if (!ok) return
  memberBusy.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_member: next })
      .eq('id', student.profile.id)
    if (error) {
      await modalAlert('操作失败: ' + error.message, '出错了')
      return
    }
    student.profile.is_member = next
  } finally {
    memberBusy.value = false
  }
}

const filteredStudents = computed(() => {
  let result = [...students.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter((s) => {
      const name = (s.profile.nickname || '').toLowerCase()
      const email = (s.profile.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }
  if (filterStatus.value !== 'all') {
    result = result.filter((s) => {
      if (filterStatus.value === 'stale') return s.isStale
      if (filterStatus.value === 'done') return s.percent === 100
      if (filterStatus.value === 'new') return s.percent === 0
      if (filterStatus.value === 'active')
        return s.percent > 0 && s.percent < 100 && !s.isStale
      return true
    })
  }
  return result.sort((a, b) => b.percent - a.percent)
})

onMounted(async () => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select')) batchDropdownOpen.value = false
  })
  await loadData().catch((e) => {
    console.error('[StudentsPage] loadData 崩溃:', e)
    errorMsg.value = '数据加载出错: ' + (e?.message || e)
    loading.value = false
  })
})
</script>

<template>
  <!-- 错误 -->
  <div v-if="errorMsg" class="error-box">⚠ {{ errorMsg }}</div>
  <!-- 加载 -->
  <div v-else-if="loading" class="loading-box">加载学员数据中...</div>

  <!-- 学员列表 -->
  <div v-else-if="!selectedStudent">
    <!-- 统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ students.length }}</span>
        <span class="stat-label">总学员</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ students.filter((s) => s.percent > 0).length }}</span>
        <span class="stat-label">已开始学习</span>
      </div>
      <div class="stat-card warn">
        <span class="stat-num">{{ students.filter((s) => s.isStale).length }}</span>
        <span class="stat-label">停滞预警(3天+)</span>
      </div>
      <div class="stat-card accent">
        <span class="stat-num">{{ students.filter((s) => s.profile.is_member).length }}</span>
        <span class="stat-label">会员</span>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-bar">
      <input v-model="searchQuery" class="search-input" placeholder="🔍 搜索学员昵称或邮箱..." />
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
      <div class="multi-select" @click.stop>
        <button class="multi-select-trigger" @click="batchDropdownOpen = !batchDropdownOpen">
          <span v-if="batchLevels.size === 0" class="placeholder">选择等级...</span>
          <span v-else class="selected-text">{{ GRANTABLE_LEVELS.filter((l) => batchLevels.has(l)).join('、') }}</span>
          <span class="caret" :class="{ open: batchDropdownOpen }">▾</span>
        </button>
        <div v-if="batchDropdownOpen" class="multi-select-dropdown">
          <label v-for="lv in GRANTABLE_LEVELS" :key="lv" class="multi-option" :class="{ checked: batchLevels.has(lv) }">
            <input type="checkbox" :checked="batchLevels.has(lv)" @change="toggleBatchLevel(lv)" />
            <span>{{ lv }}</span>
          </label>
        </div>
      </div>
      <button class="batch-btn" :disabled="accessBusy" @click="batchGrant">🔑 批量授权</button>
      <button v-if="selectedIds.size > 0" class="batch-clear" @click="selectedIds = new Set()">清空选择</button>
    </div>

    <!-- 学员表格 -->
    <div v-if="students.length > 0" class="table-wrap">
      <table class="student-table">
        <thead>
          <tr>
            <th class="col-check"><input type="checkbox" :checked="filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.profile.id))" @change="filteredStudents.forEach((s) => toggleSelect(s.profile.id))" /></th>
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
              <strong>
                <span v-if="s.profile.is_member" class="member-crown">👑</span>
                {{ s.profile.nickname || s.profile.email }}
              </strong>
              <small>{{ new Date(s.profile.created_at).toLocaleDateString('zh-CN') }} 注册</small>
            </td>
            <td class="col-progress" @click="viewDetail(s)">
              <div class="tbl-bar"><div class="tbl-bar-fill" :style="{ width: s.percent + '%' }"></div></div>
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
    </div>
  </div>

  <!-- 学员详情 -->
  <div v-else class="student-detail">
    <button class="back-btn" @click="selectedStudent = null">← 返回列表</button>
    <h2>
      <span v-if="selectedStudent.profile.is_member" class="detail-member-badge">👑 会员</span>
      {{ selectedStudent.profile.nickname || selectedStudent.profile.email }}
    </h2>
    <p class="detail-email">{{ selectedStudent.profile.email }} · {{ new Date(selectedStudent.profile.created_at).toLocaleDateString('zh-CN') }} 注册</p>

    <!-- 会员开关 -->
    <div class="member-panel">
      <div class="member-panel-info">
        <span class="member-panel-title">👑 付费会员</span>
        <span class="member-panel-status" :class="{ on: selectedStudent.profile.is_member }">
          {{ selectedStudent.profile.is_member ? '已开通会员' : '非会员（仅免费内容）' }}
        </span>
      </div>
      <button class="member-switch" :class="{ on: selectedStudent.profile.is_member }" :disabled="memberBusy" @click="toggleMember(selectedStudent)">
        {{ selectedStudent.profile.is_member ? '取消会员' : '设为会员' }}
      </button>
    </div>

    <div class="detail-stats">
      <div class="ds-item"><span class="ds-num">{{ selectedStudent.percent }}%</span><span class="ds-label">总完成率</span></div>
      <div class="ds-item"><span class="ds-num">{{ selectedStudent.progressCount }}/{{ totalLessons }}</span><span class="ds-label">完成课时</span></div>
      <div class="ds-item"><span class="ds-num">{{ selectedStudent.quizCorrect }}/{{ selectedStudent.quizTotal }}</span><span class="ds-label">答题正确率</span></div>
    </div>

    <!-- 课程等级授权 -->
    <div class="access-panel">
      <h3>🔑 课程等级授权</h3>
      <div class="access-toggles">
        <div class="access-toggle-item"><span class="access-level-name">入门</span><span class="access-status always-on">默认开放</span></div>
        <div v-for="lv in GRANTABLE_LEVELS" :key="lv" class="access-toggle-item">
          <span class="access-level-name">{{ lv }}</span>
          <button class="access-switch" :class="{ on: selectedStudent.accessLevels.includes(lv) }" :disabled="accessBusy" @click="toggleAccess(selectedStudent, lv)">
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
</template>

<style scoped>
@import './dashboard-shared.css';
</style>
