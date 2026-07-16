<script setup>
/**
 * 产品线健康度盘点（交互式工具）
 *
 * 用户在各输入框填写自己产品线的数据，组件实时自动算出：
 * - 三个维度（结构/资源/生命周期）各自的评分（1-5分）和健康等级
 * - 加权总分和整体健康判定
 *
 * 纯前端，不保存数据，刷新清空。适合边看课边练习。
 */
import { ref, computed, reactive } from 'vue'

// ===== 维度一：结构健康度 =====
const structure = reactive({
  totalSku: null,
  trafficCount: null,
  profitCount: null,
  brandCount: null,
  trafficSalesPct: null,   // 引流款销量贡献 %
  profitProfitPct: null,    // 利润款利润贡献 %
  unclearSku: null,         // 定位不清的 SKU 数
})

// 结构评分逻辑：根据各项是否达标，扣分制（满分5分）
const structureScore = computed(() => {
  let score = 5
  let reasons = []
  // SKU 总数
  const t = Number(structure.totalSku)
  if (t > 0) {
    if (t > 20) { score -= 2; reasons.push('SKU 过多（>20）') }
    else if (t > 15) { score -= 1; reasons.push('SKU 偏多（15-20）') }
  }
  // 利润款数量
  const p = Number(structure.profitCount)
  if (p >= 0 && structure.profitCount !== null) {
    if (p === 0) { score -= 2; reasons.push('无利润款') }
    else if (p < 2) { score -= 1; reasons.push('利润款仅1个（风险集中）') }
  }
  // 定位不清 SKU
  const u = Number(structure.unclearSku)
  if (u > 0) {
    if (u >= 5) { score -= 2; reasons.push(`定位不清 ${u} 个（过多）`) }
    else if (u >= 1) { score -= 1; reasons.push(`定位不清 ${u} 个`) }
  }
  // 引流款销量占比过高
  const ts = Number(structure.trafficSalesPct)
  if (ts > 60) { score -= 1; reasons.push('引流款销量占比>60%（跑量不赚钱）') }
  return { score: Math.max(1, score), reasons }
})

// ===== 维度二：资源健康度 =====
const resource = reactive({
  fundConcentration: null,  // 头部3产品资金占比 %
  emergencyReserve: null,    // 应急储备占比 %
  acosPassRate: null,        // ACOS达标率 %
  adWasteRate: null,         // 广告浪费率 %
})

const resourceScore = computed(() => {
  let score = 5
  let reasons = []
  const fc = Number(resource.fundConcentration)
  if (fc > 0) {
    if (fc > 80) { score -= 2; reasons.push('资金过度集中（头部3占>80%）') }
    else if (fc > 70) { score -= 1; reasons.push('资金偏集中（>70%）') }
  }
  const er = Number(resource.emergencyReserve)
  if (er >= 0 && resource.emergencyReserve !== null) {
    if (er < 5) { score -= 1; reasons.push('应急储备不足（<5%）') }
  }
  const ar = Number(resource.acosPassRate)
  if (ar >= 0 && resource.acosPassRate !== null) {
    if (ar < 50) { score -= 1; reasons.push('ACOS达标率低（<50%）') }
  }
  const aw = Number(resource.adWasteRate)
  if (aw > 0) {
    if (aw > 20) { score -= 2; reasons.push(`广告浪费严重（${aw}%）`) }
    else if (aw > 10) { score -= 1; reasons.push(`广告浪费偏高（${aw}%）`) }
  }
  return { score: Math.max(1, score), reasons }
})

// ===== 维度三：生命周期健康度 =====
const lifecycle = reactive({
  introCount: null,    // 导入期
  growthCount: null,   // 成长期
  matureCount: null,   // 成熟期
  declineCount: null,  // 衰退期
  cashCowCount: null,  // 现金牛（成熟期利润款）
})

const lifecycleScore = computed(() => {
  let score = 5
  let reasons = []
  const it = Number(lifecycle.introCount)
  const gr = Number(lifecycle.growthCount)
  const ma = Number(lifecycle.matureCount)
  const de = Number(lifecycle.declineCount)
  const cc = Number(lifecycle.cashCowCount)

  // 没有新品（导入期+成长期都为0）→ 断档风险
  if (it === 0 && gr === 0 && (lifecycle.introCount !== null || lifecycle.growthCount !== null)) {
    score -= 2; reasons.push('无新品在打（导入+成长=0），6-12个月后将断档')
  } else if (it === 0 && lifecycle.introCount !== null) {
    score -= 1; reasons.push('无导入期新品，需启动新品开发')
  }
  // 衰退期过多
  if (de > 3) { score -= 2; reasons.push(`衰退期 ${de} 个（>3，需批量清退）`) }
  else if (de > 2) { score -= 1; reasons.push(`衰退期 ${de} 个（偏多）`) }
  // 现金牛太少
  if (cc >= 0 && lifecycle.cashCowCount !== null) {
    if (cc === 0) { score -= 2; reasons.push('无现金牛（利润来源危险）') }
    else if (cc < 2) { score -= 1; reasons.push('现金牛仅1个（风险集中）') }
  }
  return { score: Math.max(1, score), reasons }
})

// ===== 总分 =====
const totalScore = computed(() => {
  const s = structureScore.value.score
  const r = resourceScore.value.score
  const l = lifecycleScore.value.score
  // 权重：结构35% + 资源35% + 生命周期30%
  return +(s * 0.35 + r * 0.35 + l * 0.30).toFixed(1)
})

// 是否已填写任何数据（控制总分区域显示——没填时不显示分数）
const hasAnyInput = computed(() => {
  return [...Object.values(structure), ...Object.values(resource), ...Object.values(lifecycle)]
    .some(v => v !== null && v !== '')
})

const healthLevel = computed(() => {
  const t = totalScore.value
  if (t >= 4.0) return { label: '健康', icon: '✅', color: '#16a34a', advice: '保持现状，小幅优化' }
  if (t >= 3.0) return { label: '亚健康', icon: '⚠️', color: '#d97706', advice: '有1-2个维度需要改进' }
  if (t >= 2.0) return { label: '不健康', icon: '❌', color: '#dc2626', advice: '需要重大调整' }
  return { label: '危险', icon: '🚨', color: '#b91c1c', advice: '立即停止扩品，先修复现有产品线' }
})

// 模块评分显示
function levelOf(score) {
  if (score >= 4) return { icon: '✅', color: '#16a34a', text: '健康' }
  if (score >= 3) return { icon: '⚠️', color: '#d97706', text: '亚健康' }
  return { icon: '❌', color: '#dc2626', text: '不健康' }
}

// 重置
function reset() {
  Object.keys(structure).forEach(k => structure[k] = null)
  Object.keys(resource).forEach(k => resource[k] = null)
  Object.keys(lifecycle).forEach(k => lifecycle[k] = null)
}
</script>

<template>
  <div class="phc-tool">
    <div class="phc-header">
      <span class="phc-icon">📋</span>
      <span class="phc-title">产品线健康度盘点工具</span>
      <span class="phc-hint">填写你的数据，自动算分和健康等级</span>
      <button class="phc-reset" @click="reset">重置</button>
    </div>

    <!-- 维度一：结构 -->
    <div class="phc-section">
      <div class="phc-section-head">
        <span class="phc-dim-icon">①</span>
        <span class="phc-dim-name">结构健康度</span>
        <span
          v-if="structure.totalSku !== null || structure.profitCount !== null"
          class="phc-score"
          :style="{ color: levelOf(structureScore.score).color }"
        >
          {{ levelOf(structureScore.score).icon }} {{ structureScore.score }}/5 · {{ levelOf(structureScore.score).text }}
        </span>
      </div>
      <div class="phc-grid">
        <label class="phc-field">
          <span class="phc-label">总 SKU 数 <em>标准 8-15</em></span>
          <input v-model="structure.totalSku" type="number" min="0" placeholder="如 12" />
        </label>
        <label class="phc-field">
          <span class="phc-label">引流款数量 <em>1-3</em></span>
          <input v-model="structure.trafficCount" type="number" min="0" placeholder="如 2" />
        </label>
        <label class="phc-field">
          <span class="phc-label">利润款数量 <em>≥2</em></span>
          <input v-model="structure.profitCount" type="number" min="0" placeholder="如 4" />
        </label>
        <label class="phc-field">
          <span class="phc-label">形象款数量 <em>1-3</em></span>
          <input v-model="structure.brandCount" type="number" min="0" placeholder="如 1" />
        </label>
        <label class="phc-field">
          <span class="phc-label">引流款销量贡献 <em>~40%</em></span>
          <input v-model="structure.trafficSalesPct" type="number" min="0" placeholder="如 38" />
          <span class="phc-unit">%</span>
        </label>
        <label class="phc-field">
          <span class="phc-label">利润款利润贡献 <em>~70%</em></span>
          <input v-model="structure.profitProfitPct" type="number" min="0" placeholder="如 75" />
          <span class="phc-unit">%</span>
        </label>
        <label class="phc-field">
          <span class="phc-label">定位不清的 SKU <em>0</em></span>
          <input v-model="structure.unclearSku" type="number" min="0" placeholder="如 0" />
        </label>
      </div>
      <div v-if="structureScore.reasons.length" class="phc-reasons">
        <span class="phc-reasons-label">扣分项：</span>
        <span v-for="r in structureScore.reasons" :key="r" class="phc-reason">{{ r }}</span>
      </div>
    </div>

    <!-- 维度二：资源 -->
    <div class="phc-section">
      <div class="phc-section-head">
        <span class="phc-dim-icon">②</span>
        <span class="phc-dim-name">资源健康度</span>
        <span
          v-if="resource.fundConcentration !== null || resource.adWasteRate !== null"
          class="phc-score"
          :style="{ color: levelOf(resourceScore.score).color }"
        >
          {{ levelOf(resourceScore.score).icon }} {{ resourceScore.score }}/5 · {{ levelOf(resourceScore.score).text }}
        </span>
      </div>
      <div class="phc-grid">
        <label class="phc-field">
          <span class="phc-label">资金集中度（头部3占比）<em>&lt;70%</em></span>
          <input v-model="resource.fundConcentration" type="number" min="0" placeholder="如 60" />
          <span class="phc-unit">%</span>
        </label>
        <label class="phc-field">
          <span class="phc-label">应急储备占比 <em>≥10%</em></span>
          <input v-model="resource.emergencyReserve" type="number" min="0" placeholder="如 12" />
          <span class="phc-unit">%</span>
        </label>
        <label class="phc-field">
          <span class="phc-label">ACOS 达标率 <em>&gt;70%</em></span>
          <input v-model="resource.acosPassRate" type="number" min="0" placeholder="如 80" />
          <span class="phc-unit">%</span>
        </label>
        <label class="phc-field">
          <span class="phc-label">广告浪费率 <em>&lt;10%</em></span>
          <input v-model="resource.adWasteRate" type="number" min="0" placeholder="如 8" />
          <span class="phc-unit">%</span>
        </label>
      </div>
      <div v-if="resourceScore.reasons.length" class="phc-reasons">
        <span class="phc-reasons-label">扣分项：</span>
        <span v-for="r in resourceScore.reasons" :key="r" class="phc-reason">{{ r }}</span>
      </div>
    </div>

    <!-- 维度三：生命周期 -->
    <div class="phc-section">
      <div class="phc-section-head">
        <span class="phc-dim-icon">③</span>
        <span class="phc-dim-name">生命周期健康度</span>
        <span
          v-if="lifecycle.matureCount !== null || lifecycle.introCount !== null"
          class="phc-score"
          :style="{ color: levelOf(lifecycleScore.score).color }"
        >
          {{ levelOf(lifecycleScore.score).icon }} {{ lifecycleScore.score }}/5 · {{ levelOf(lifecycleScore.score).text }}
        </span>
      </div>
      <div class="phc-grid">
        <label class="phc-field">
          <span class="phc-label">导入期产品 <em>1-2</em></span>
          <input v-model="lifecycle.introCount" type="number" min="0" placeholder="如 1" />
        </label>
        <label class="phc-field">
          <span class="phc-label">成长期产品 <em>2-3</em></span>
          <input v-model="lifecycle.growthCount" type="number" min="0" placeholder="如 2" />
        </label>
        <label class="phc-field">
          <span class="phc-label">成熟期产品 <em>3-5</em></span>
          <input v-model="lifecycle.matureCount" type="number" min="0" placeholder="如 4" />
        </label>
        <label class="phc-field">
          <span class="phc-label">衰退期产品 <em>≤2</em></span>
          <input v-model="lifecycle.declineCount" type="number" min="0" placeholder="如 1" />
        </label>
        <label class="phc-field">
          <span class="phc-label">现金牛（成熟期利润款）<em>≥2</em></span>
          <input v-model="lifecycle.cashCowCount" type="number" min="0" placeholder="如 3" />
        </label>
      </div>
      <div v-if="lifecycleScore.reasons.length" class="phc-reasons">
        <span class="phc-reasons-label">扣分项：</span>
        <span v-for="r in lifecycleScore.reasons" :key="r" class="phc-reason">{{ r }}</span>
      </div>
    </div>

    <!-- 总分 -->
    <div v-if="hasAnyInput" class="phc-total" :style="{ borderColor: healthLevel.color }">
      <div class="phc-total-left">
        <span class="phc-total-label">产品线健康度总分</span>
        <span class="phc-total-num" :style="{ color: healthLevel.color }">{{ totalScore }}</span>
        <span class="phc-total-max">/ 5.0</span>
      </div>
      <div class="phc-total-right">
        <span class="phc-total-level" :style="{ background: healthLevel.color }">
          {{ healthLevel.icon }} {{ healthLevel.label }}
        </span>
        <span class="phc-total-advice">{{ healthLevel.advice }}</span>
      </div>
    </div>
    <div v-else class="phc-total phc-total-empty">
      <span class="phc-total-placeholder">📊 在上方填写数据后，这里会自动显示健康度总分和评级</span>
    </div>

    <!-- 权重明细 -->
    <div v-if="hasAnyInput" class="phc-breakdown">
      <span>结构 35% × {{ structureScore.score }} = {{ +(structureScore.score * 0.35).toFixed(1) }}</span>
      <span>资源 35% × {{ resourceScore.score }} = {{ +(resourceScore.score * 0.35).toFixed(1) }}</span>
      <span>生命周期 30% × {{ lifecycleScore.score }} = {{ +(lifecycleScore.score * 0.30).toFixed(1) }}</span>
    </div>
  </div>
</template>

<style scoped>
.phc-tool {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.phc-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.phc-icon { font-size: 1.3rem; }
.phc-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}
.phc-hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.phc-reset {
  margin-left: auto;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  cursor: pointer;
}
.phc-reset:hover { color: var(--vp-c-text-1); border-color: var(--vp-c-brand-2); }

.phc-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.phc-section:last-of-type { border-bottom: none; }
.phc-section-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.phc-dim-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}
.phc-dim-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}
.phc-score {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 700;
}

.phc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.phc-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  position: relative;
}
.phc-label {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.3;
}
.phc-label em {
  font-style: normal;
  color: var(--vp-c-text-3);
  margin-left: 0.3rem;
}
.phc-field input {
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  width: 100%;
  box-sizing: border-box;
  padding-right: 1.8rem;
}
.phc-field input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.phc-unit {
  position: absolute;
  right: 0.6rem;
  bottom: 0.45rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.phc-reasons {
  margin-top: 0.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.phc-reasons-label {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
.phc-reason {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

.phc-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 2px solid;
  background: var(--vp-c-bg);
  margin-top: 0.5rem;
  flex-wrap: wrap;
}
.phc-total-left {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.phc-total-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.phc-total-num {
  font-size: 2rem;
  font-weight: 800;
}
.phc-total-max {
  font-size: 1rem;
  color: var(--vp-c-text-3);
}
.phc-total-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}
.phc-total-level {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  padding: 0.25rem 0.8rem;
  border-radius: 6px;
}
.phc-total-advice {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.phc-breakdown {
  display: flex;
  gap: 1.25rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
.phc-breakdown span {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.phc-total-empty {
  border-color: var(--vp-c-divider) !important;
  justify-content: center;
}
.phc-total-placeholder {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .phc-grid { grid-template-columns: 1fr; }
  .phc-total { flex-direction: column; align-items: flex-start; }
  .phc-total-right { align-items: flex-start; }
}
</style>
