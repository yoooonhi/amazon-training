<script setup>
/**
 * 补货量计算器（交互式工具）
 *
 * 用户选择场景（稳定期/旺季/新品），填入数据，
 * 组件按补货公式自动算出"该补多少件"，并展示每步计算过程。
 *
 * 公式：补货量 = 预估日均 × 补货周期 + 安全库存 − 现有可售 − 在途
 */
import { ref, computed, reactive } from 'vue'

// 场景切换
const scenario = ref('normal') // normal | peak | newproduct

// 补货周期6环节（可调，有默认值）
const cycle = reactive({
  production: 20,    // 生产+质检
  ordering: 7,       // 下单到排产
  customs: 4,        // 报关+拖车
  shipping: 32,      // 海运
  clearance: 7,      // 到港清关
  receiving: 6,      // FBA接收上架
})

// 补货周期合计
const totalCycle = computed(() =>
  Number(cycle.production) + Number(cycle.ordering) + Number(cycle.customs) +
  Number(cycle.shipping) + Number(cycle.clearance) + Number(cycle.receiving)
)

// 稳定期：近30天日均
const normalDaily = ref(null)

// 旺季：去年旺季日均 + 今年增长% + 旺季加成
const peakLastYear = ref(null)
const peakGrowth = ref(null)       // 今年增长 %
const peakBoost = ref(null)        // 旺季加成倍数（1.15-1.3）

// 新品：同类老品日均
const newRefDaily = ref(null)

// 预估日均（根据场景不同算法）
const estimatedDaily = computed(() => {
  if (scenario.value === 'normal') {
    const d = Number(normalDaily.value)
    return d > 0 ? d : null
  }
  if (scenario.value === 'peak') {
    const last = Number(peakLastYear.value)
    const growth = Number(peakGrowth.value)
    const boost = Number(peakBoost.value)
    if (last > 0 && growth >= 0 && boost > 0) {
      return Math.round(last * (1 + growth / 100) * boost)
    }
    return null
  }
  if (scenario.value === 'newproduct') {
    const ref = Number(newRefDaily.value)
    // 新品按老品40%估
    return ref > 0 ? Math.round(ref * 0.4) : null
  }
  return null
})

// 安全库存天数（用户选风险等级）
const riskLevel = ref('medium')
const riskOptions = [
  { value: 'low', label: '低（空运/快递，老品）', days: 7 },
  { value: 'medium', label: '中（海运常规品）', days: 15 },
  { value: 'high', label: '高（海运波动大/旺季前）', days: 20 },
  { value: 'extreme', label: '极高（旺季核心爆款）', days: 30 },
]
const safetyDays = computed(() => riskOptions.find(r => r.value === riskLevel.value)?.days || 15)
const safetyStock = computed(() => {
  if (estimatedDaily.value === null) return null
  return estimatedDaily.value * safetyDays.value
})

// 现有 + 在途
const currentStock = ref(null)
const inTransit = ref(null)

// 补货周期需求
const cycleDemand = computed(() => {
  if (estimatedDaily.value === null) return null
  return estimatedDaily.value * totalCycle.value
})

// 最终补货量
const replenishQty = computed(() => {
  if (estimatedDaily.value === null) return null
  const demand = cycleDemand.value
  const safety = safetyStock.value
  const current = Number(currentStock.value) || 0
  const transit = Number(inTransit.value) || 0
  const result = demand + safety - current - transit
  return result
})

// 新品首单七折
const isNewProduct = computed(() => scenario.value === 'newproduct')
const finalQty = computed(() => {
  if (replenishQty.value === null) return null
  return isNewProduct.value ? Math.round(replenishQty.value * 0.7) : Math.round(replenishQty.value)
})

// 补货建议
const advice = computed(() => {
  if (finalQty.value === null) return ''
  if (finalQty.value <= 0) return '现有库存 + 在途已足够覆盖，暂不需要补货（可关注销量变化）'
  if (finalQty.value < 50) return '补货量较小，建议凑整到整箱或考虑空运（快但贵）'
  if (finalQty.value > 5000) return '补货量大，建议分批下单降低风险，确认工厂产能能否支撑'
  return '补货量合理，按完整周期下单即可'
})
</script>

<template>
  <div class="rc-tool">
    <div class="rc-header">
      <span class="rc-icon">📦</span>
      <span class="rc-title">补货量计算器</span>
      <span class="rc-hint">填入数据，自动算出该补多少件</span>
    </div>

    <!-- 场景切换 -->
    <div class="rc-scenario">
      <button
        v-for="s in [
          { v: 'normal', label: '稳定期' },
          { v: 'peak', label: '旺季备货' },
          { v: 'newproduct', label: '新品首单' }
        ]"
        :key="s.v"
        :class="['rc-scenario-btn', { active: scenario === s.v }]"
        @click="scenario = s.v"
      >{{ s.label }}</button>
    </div>

    <!-- Step 1: 补货周期 -->
    <div class="rc-section">
      <div class="rc-step-head">
        <span class="rc-step-num">1</span>
        <span class="rc-step-name">补货周期（完整链条）</span>
        <span class="rc-step-result">合计 <strong>{{ totalCycle }}</strong> 天</span>
      </div>
      <div class="rc-grid">
        <label class="rc-field">
          <span class="rc-label">下单到排产</span>
          <input v-model="cycle.ordering" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">生产+质检</span>
          <input v-model="cycle.production" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">报关+拖车</span>
          <input v-model="cycle.customs" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">海运</span>
          <input v-model="cycle.shipping" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">到港清关</span>
          <input v-model="cycle.clearance" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">FBA接收上架</span>
          <input v-model="cycle.receiving" type="number" min="0" />
          <span class="rc-unit">天</span>
        </label>
      </div>
      <p class="rc-tip">⚠ 只算海运会少算 30-40 天，按完整链条估才准。</p>
    </div>

    <!-- Step 2: 预估日均 -->
    <div class="rc-section">
      <div class="rc-step-head">
        <span class="rc-step-num">2</span>
        <span class="rc-step-name">预估日均销量</span>
        <span v-if="estimatedDaily !== null" class="rc-step-result">
          <strong>{{ estimatedDaily }}</strong> 件/天
        </span>
      </div>

      <!-- 稳定期 -->
      <div v-if="scenario === 'normal'" class="rc-grid">
        <label class="rc-field">
          <span class="rc-label">近 30 天日均销量</span>
          <input v-model="normalDaily" type="number" min="0" placeholder="如 18" />
          <span class="rc-unit">件/天</span>
        </label>
      </div>

      <!-- 旺季 -->
      <div v-else-if="scenario === 'peak'" class="rc-grid">
        <label class="rc-field">
          <span class="rc-label">去年旺季日均</span>
          <input v-model="peakLastYear" type="number" min="0" placeholder="如 55" />
          <span class="rc-unit">件/天</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">今年同比增长</span>
          <input v-model="peakGrowth" type="number" placeholder="如 20" />
          <span class="rc-unit">%</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">旺季加成倍数</span>
          <input v-model="peakBoost" type="number" step="0.05" placeholder="如 1.2" />
          <span class="rc-unit">×</span>
        </label>
      </div>
      <p v-if="scenario === 'peak'" class="rc-calc-detail">
        旺季日均 = 去年 {{ peakLastYear || '?' }} × (1 + {{ peakGrowth || '?' }}%) × {{ peakBoost || '?' }}
        <span v-if="estimatedDaily !== null"> = <strong>{{ estimatedDaily }}</strong></span>
      </p>

      <!-- 新品 -->
      <div v-else-if="scenario === 'newproduct'" class="rc-grid">
        <label class="rc-field">
          <span class="rc-label">同类老品日均</span>
          <input v-model="newRefDaily" type="number" min="0" placeholder="如 20" />
          <span class="rc-unit">件/天</span>
        </label>
      </div>
      <p v-if="scenario === 'newproduct'" class="rc-calc-detail">
        新品预估 = 老品 {{ newRefDaily || '?' }} × 0.4（新品初期约为老品40%）
        <span v-if="estimatedDaily !== null"> = <strong>{{ estimatedDaily }}</strong></span>
      </p>
    </div>

    <!-- Step 3: 安全库存 -->
    <div class="rc-section">
      <div class="rc-step-head">
        <span class="rc-step-num">3</span>
        <span class="rc-step-name">安全库存</span>
        <span v-if="estimatedDaily !== null" class="rc-step-result">
          <strong>{{ safetyStock }}</strong> 件（{{ safetyDays }} 天）
        </span>
      </div>
      <div class="rc-risk-options">
        <button
          v-for="r in riskOptions"
          :key="r.value"
          :class="['rc-risk-btn', { active: riskLevel === r.value }]"
          @click="riskLevel = r.value"
        >
          {{ r.label }}
          <span class="rc-risk-days">{{ r.days }}天</span>
        </button>
      </div>
    </div>

    <!-- Step 4: 现有 + 在途 -->
    <div class="rc-section">
      <div class="rc-step-head">
        <span class="rc-step-num">4</span>
        <span class="rc-step-name">现有库存 & 在途</span>
      </div>
      <div class="rc-grid">
        <label class="rc-field">
          <span class="rc-label">现有可售库存（只算 sellable）</span>
          <input v-model="currentStock" type="number" min="0" placeholder="如 400" />
          <span class="rc-unit">件</span>
        </label>
        <label class="rc-field">
          <span class="rc-label">在途库存（已逐批核对状态）</span>
          <input v-model="inTransit" type="number" min="0" placeholder="如 1200" />
          <span class="rc-unit">件</span>
        </label>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="estimatedDaily !== null" class="rc-result">
      <div class="rc-calc-steps">
        <div class="rc-calc-line">
          <span>补货周期需求</span>
          <span>{{ estimatedDaily }} × {{ totalCycle }} = <strong>{{ cycleDemand }}</strong> 件</span>
        </div>
        <div class="rc-calc-line">
          <span>安全库存</span>
          <span>{{ estimatedDaily }} × {{ safetyDays }} = <strong>{{ safetyStock }}</strong> 件</span>
        </div>
        <div class="rc-calc-line">
          <span>减：现有 + 在途</span>
          <span>− {{ Number(currentStock) || 0 }} − {{ Number(inTransit) || 0 }}</span>
        </div>
        <div v-if="isNewProduct" class="rc-calc-line rc-calc-line-new">
          <span>新品首单七折</span>
          <span>{{ replenishQty }} × 0.7</span>
        </div>
      </div>
      <div class="rc-final">
        <div class="rc-final-left">
          <span class="rc-final-label">该补货量</span>
          <span class="rc-final-num" :class="{ negative: finalQty < 0 }">{{ finalQty }}</span>
          <span class="rc-final-unit">件</span>
        </div>
        <div class="rc-final-advice">{{ advice }}</div>
      </div>
    </div>
    <div v-else class="rc-result-empty">
      📦 填入上方数据（至少补货周期和日均销量），这里会自动算出补货量
    </div>
  </div>
</template>

<style scoped>
.rc-tool {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.rc-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.rc-icon { font-size: 1.3rem; }
.rc-title { font-weight: 700; font-size: 1.1rem; color: var(--vp-c-text-1); }
.rc-hint { font-size: 0.8rem; color: var(--vp-c-text-2); }

.rc-scenario {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.rc-scenario-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.rc-scenario-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
}

.rc-section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.rc-section:last-of-type { border-bottom: none; }
.rc-step-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.rc-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}
.rc-step-name { font-weight: 700; font-size: 0.92rem; color: var(--vp-c-text-1); }
.rc-step-result {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.rc-step-result strong { color: var(--vp-c-brand-1); font-size: 1rem; }

.rc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
}
.rc-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
}
.rc-label {
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
}
.rc-field input {
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
  width: 100%;
  box-sizing: border-box;
  padding-right: 1.8rem;
}
.rc-field input:focus { outline: none; border-color: var(--vp-c-brand-1); }
.rc-unit {
  position: absolute;
  right: 0.55rem;
  bottom: 0.42rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.rc-tip {
  margin: 0.5rem 0 0;
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
}
.rc-calc-detail {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.rc-calc-detail strong { color: var(--vp-c-brand-1); }

.rc-risk-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.rc-risk-btn {
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s;
}
.rc-risk-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.rc-risk-days { font-size: 0.72rem; opacity: 0.7; }

.rc-result {
  margin-top: 0.5rem;
  padding: 1.25rem;
  background: var(--vp-c-bg);
  border-radius: 10px;
  border: 2px solid var(--vp-c-brand-1);
}
.rc-calc-steps {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--vp-c-divider);
}
.rc-calc-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.3rem;
}
.rc-calc-line strong { color: var(--vp-c-text-1); }
.rc-calc-line-new { color: #d97706; }

.rc-final {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.rc-final-left {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.rc-final-label { font-size: 0.9rem; font-weight: 600; color: var(--vp-c-text-2); }
.rc-final-num {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}
.rc-final-num.negative { color: #16a34a; }
.rc-final-unit { font-size: 1rem; color: var(--vp-c-text-3); }
.rc-final-advice {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  max-width: 280px;
}

.rc-result-empty {
  margin-top: 0.5rem;
  padding: 1.25rem;
  text-align: center;
  background: var(--vp-c-bg);
  border-radius: 10px;
  border: 2px dashed var(--vp-c-divider);
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .rc-grid { grid-template-columns: 1fr; }
  .rc-final { flex-direction: column; align-items: flex-start; }
}
</style>
