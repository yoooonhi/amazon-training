<script setup>
/**
 * 课程授权页
 * 各等级授权人数 + 授权覆盖率 + 批量授权 + 最近授权记录
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { LEVELS } from '../../lib/accessControl'
import { modalConfirm, modalAlert } from '../../lib/modal'

const GRANTABLE_LEVELS = LEVELS.filter((l) => l !== '入门')
const loading = ref(true)
const totalStudents = ref(0)
const levelCounts = ref({}) // {初级: 5, 中级: 3...}
const recentGrants = ref([]) // 最近授权记录

// 批量授权
const allStudents = ref([])
const selectedIds = ref(new Set())
const batchLevels = ref(new Set())
const batchDropdownOpen = ref(false)
const busy = ref(false)

async function loadData() {
  loading.value = true
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
  allStudents.value = profiles || []
  totalStudents.value = profiles?.length || 0

  const { data: access } = await supabase
    .from('course_access')
    .select('user_id, level, created_at')
    .order('created_at', { ascending: false })
  const all = access || []

  // 各等级授权人数
  const counts = {}
  GRANTABLE_LEVELS.forEach((l) => (counts[l] = 0))
  all.forEach((r) => { if (counts[r.level] !== undefined) counts[r.level]++ })
  levelCounts.value = counts

  // 最近授权记录（含学员名）
  const nameMap = {}
  ;(profiles || []).forEach((p) => (nameMap[p.id] = p.nickname || p.email))
  recentGrants.value = all.slice(0, 15).map((r) => ({
    ...r,
    name: nameMap[r.user_id] || '未知',
    date: new Date(r.created_at).toLocaleDateString('zh-CN'),
  }))

  loading.value = false
}

const maxLevelCount = computed(() =>
  Math.max(1, ...Object.values(levelCounts.value))
)

function coverage(level) {
  return totalStudents.value
    ? Math.round((levelCounts.value[level] / totalStudents.value) * 100)
    : 0
}

function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}
function toggleBatchLevel(lv) {
  const s = new Set(batchLevels.value)
  if (s.has(lv)) s.delete(lv); else s.add(lv)
  batchLevels.value = s
}

async function getMentorId() {
  const { data: session } = await supabase.auth.getSession()
  return session.session?.user?.id || null
}

async function batchGrant() {
  if (busy.value) return
  const ids = [...selectedIds.value]
  const levels = GRANTABLE_LEVELS.filter((lv) => batchLevels.value.has(lv))
  if (!ids.length) { await modalAlert('请先勾选学员', '提示'); return }
  if (!levels.length) { await modalAlert('请选择等级', '提示'); return }
  const ok = await modalConfirm(`确定为 ${ids.length} 名学员授权「${levels.join('、')}」？`, '批量授权')
  if (!ok) return
  busy.value = true
  try {
    const mentorId = await getMentorId()
    const rows = []
    ids.forEach((uid) => levels.forEach((lv) => rows.push({ user_id: uid, level: lv, granted_by: mentorId })))
    const { error } = await supabase.from('course_access').upsert(rows, { onConflict: 'user_id,level' })
    if (error) { await modalAlert('授权失败: ' + error.message, '出错了'); return }
    await modalAlert(`已为 ${ids.length} 名学员授权`, '完成')
    selectedIds.value = new Set()
    batchLevels.value = new Set()
    await loadData()
  } finally { busy.value = false }
}

onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select')) batchDropdownOpen.value = false
  })
  loadData()
})
</script>

<template>
  <div v-if="loading" class="loading-box">加载授权数据中...</div>
  <div v-else>
    <!-- 各等级授权人数 -->
    <div class="data-section">
      <h3 class="section-title">🔑 各等级授权人数（共 {{ totalStudents }} 名学员）</h3>
      <div class="level-grid">
        <div v-for="lv in GRANTABLE_LEVELS" :key="lv" class="level-card">
          <div class="level-name">{{ lv }}</div>
          <div class="level-num">{{ levelCounts[lv] || 0 }}</div>
          <div class="level-bar-wrap"><div class="level-bar-fill" :style="{ width: ((levelCounts[lv] || 0) / maxLevelCount * 100) + '%' }"></div></div>
          <div class="level-coverage">覆盖率 {{ coverage(lv) }}%</div>
        </div>
      </div>
    </div>

    <!-- 批量授权 -->
    <div class="data-section">
      <h3 class="section-title">⚡ 批量授权</h3>
      <div class="batch-bar">
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
        <button class="batch-btn" :disabled="busy" @click="batchGrant">🔑 授权</button>
      </div>
      <!-- 学员勾选列表 -->
      <div class="student-check-grid">
        <label v-for="s in allStudents" :key="s.id" class="check-item" :class="{ checked: selectedIds.has(s.id) }">
          <input type="checkbox" :checked="selectedIds.has(s.id)" @change="toggleSelect(s.id)" />
          <span>{{ s.nickname || s.email.split('@')[0] }}</span>
        </label>
      </div>
    </div>

    <!-- 最近授权记录 -->
    <div class="data-section">
      <h3 class="section-title">📜 最近授权记录</h3>
      <div v-if="recentGrants.length === 0" class="empty-hint">暂无授权记录</div>
      <table v-else class="rank-table">
        <thead><tr><th>学员</th><th>等级</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in recentGrants" :key="i">
            <td>{{ r.name }}</td>
            <td><span class="access-tag">{{ r.level }}</span></td>
            <td class="muted">{{ r.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';
.level-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
.level-card { padding: 1rem; border-radius: 10px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); text-align: center; }
.level-name { font-weight: 700; font-size: 0.9rem; color: var(--vp-c-text-1); margin-bottom: 0.3rem; }
.level-num { font-size: 2rem; font-weight: 800; color: var(--vp-c-brand-1); }
.level-bar-wrap { height: 6px; background: var(--vp-c-divider); border-radius: 3px; overflow: hidden; margin: 0.5rem 0; }
.level-bar-fill { height: 100%; background: var(--vp-c-brand-1); border-radius: 3px; }
.level-coverage { font-size: 0.75rem; color: var(--vp-c-text-2); }

.student-check-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; max-height: 200px; overflow-y: auto; }
.check-item { display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid var(--vp-c-divider); font-size: 0.8rem; cursor: pointer; }
.check-item.checked { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft, rgba(52,81,178,0.08)); color: var(--vp-c-brand-1); }
.check-item input { accent-color: var(--vp-c-brand-1); }

.rank-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.rank-table th { text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2); font-size: 0.78rem; }
.rank-table td { padding: 0.6rem; border-bottom: 1px solid var(--vp-c-divider); }
.access-tag { font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: var(--vp-c-brand-soft, rgba(59,130,246,0.12)); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { color: var(--vp-c-text-2); font-size: 0.8rem; }
</style>
