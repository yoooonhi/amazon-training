<script setup>
/**
 * 会员管理页
 * 会员转化率 + 会员列表 + 会员vs非会员对比 + 一键开通/取消
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { totalLessons } from '../../lib/curriculum'
import { modalConfirm, modalAlert } from '../../lib/modal'

const loading = ref(true)
const members = ref([])
const nonMembers = ref(0)
const memberAvgCompletion = ref(0)
const nonMemberAvgCompletion = ref(0)
const busy = ref(false)

async function loadData() {
  loading.value = true
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, created_at, is_member')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
  const all = profiles || []
  members.value = all.filter((p) => p.is_member)
  nonMembers.value = all.filter((p) => !p.is_member).length

  // 完课率对比
  const { data: allProgress } = await supabase
    .from('progress')
    .select('user_id, completed')
  const userCounts = {}
  ;(allProgress || []).filter((p) => p.completed).forEach((p) => {
    userCounts[p.user_id] = (userCounts[p.user_id] || 0) + 1
  })
  const memberIds = new Set(members.value.map((m) => m.id))
  let mSum = 0, mCount = 0, nmSum = 0, nmCount = 0
  all.forEach((p) => {
    const c = userCounts[p.id] || 0
    const pctVal = (c / totalLessons) * 100
    if (memberIds.has(p.id)) { mSum += pctVal; mCount++ }
    else { nmSum += pctVal; nmCount++ }
  })
  memberAvgCompletion.value = mCount ? Math.round(mSum / mCount) : 0
  nonMemberAvgCompletion.value = nmCount ? Math.round(nmSum / nmCount) : 0

  loading.value = false
}

const conversionRate = computed(() => {
  const total = members.value.length + nonMembers.value
  return total ? Math.round((members.value.length / total) * 100) : 0
})

async function toggleMember(member) {
  if (busy.value) return
  const ok = await modalConfirm(`确定为「${member.nickname || member.email}」取消会员？`, '会员管理')
  if (!ok) return
  busy.value = true
  try {
    const { error } = await supabase.from('profiles').update({ is_member: false }).eq('id', member.id)
    if (error) { await modalAlert('操作失败: ' + error.message, '出错了'); return }
    await loadData()
  } finally { busy.value = false }
}

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载会员数据中...</div>
  <div v-else>
    <div class="stats-row">
      <div class="stat-card accent"><span class="stat-num">{{ members.length }}</span><span class="stat-label">会员数</span></div>
      <div class="stat-card"><span class="stat-num">{{ conversionRate }}%</span><span class="stat-label">会员转化率</span></div>
      <div class="stat-card"><span class="stat-num">{{ nonMembers }}</span><span class="stat-label">非会员</span></div>
    </div>

    <!-- 会员 vs 非会员对比 -->
    <div class="data-section">
      <h3 class="section-title">📊 会员 vs 非会员：完课率对比</h3>
      <div class="compare-bars">
        <div class="compare-item">
          <span class="compare-label">👑 会员</span>
          <div class="compare-bar-wrap"><div class="compare-bar-fill" style="background: linear-gradient(90deg, #fbbf24, #f59e0b);" :style="{ width: memberAvgCompletion + '%' }"></div></div>
          <span class="compare-val">{{ memberAvgCompletion }}%</span>
        </div>
        <div class="compare-item">
          <span class="compare-label">免费用户</span>
          <div class="compare-bar-wrap"><div class="compare-bar-fill" style="background: var(--vp-c-brand-1);" :style="{ width: nonMemberAvgCompletion + '%' }"></div></div>
          <span class="compare-val">{{ nonMemberAvgCompletion }}%</span>
        </div>
      </div>
      <p class="compare-hint" v-if="memberAvgCompletion > nonMemberAvgCompletion">
        ✅ 会员完课率比免费用户高 {{ memberAvgCompletion - nonMemberAvgCompletion }} 个百分点，付费有效。
      </p>
      <p class="compare-hint" v-else-if="memberAvgCompletion < nonMemberAvgCompletion">
        ⚠️ 会员完课率反而低于免费用户，需关注会员内容质量或运营。
      </p>
    </div>

    <!-- 会员列表 -->
    <div class="data-section">
      <h3 class="section-title">👑 会员列表（{{ members.length }}）</h3>
      <div v-if="members.length === 0" class="empty-hint">还没有会员</div>
      <table v-else class="rank-table">
        <thead><tr><th>学员</th><th>邮箱</th><th>注册时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td><strong>👑 {{ m.nickname || m.email.split('@')[0] }}</strong></td>
            <td class="muted">{{ m.email }}</td>
            <td class="muted">{{ new Date(m.created_at).toLocaleDateString('zh-CN') }}</td>
            <td><button class="cancel-btn" :disabled="busy" @click="toggleMember(m)">取消会员</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';
.compare-bars { display: flex; flex-direction: column; gap: 0.75rem; }
.compare-item { display: flex; align-items: center; gap: 0.75rem; }
.compare-label { width: 80px; font-size: 0.85rem; font-weight: 600; color: var(--vp-c-text-2); }
.compare-bar-wrap { flex: 1; height: 24px; background: var(--vp-c-divider); border-radius: 6px; overflow: hidden; }
.compare-bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s; }
.compare-val { width: 50px; text-align: right; font-weight: 700; color: var(--vp-c-text-1); }
.compare-hint { margin-top: 1rem; font-size: 0.85rem; color: var(--vp-c-text-2); }
.rank-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.rank-table th { text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2); font-size: 0.78rem; }
.rank-table td { padding: 0.6rem; border-bottom: 1px solid var(--vp-c-divider); }
.muted { color: var(--vp-c-text-2); font-size: 0.8rem; }
.cancel-btn { padding: 0.25rem 0.7rem; border-radius: 5px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: #ef4444; font-size: 0.76rem; cursor: pointer; }
.cancel-btn:hover { background: rgba(239,68,68,0.06); }
</style>
