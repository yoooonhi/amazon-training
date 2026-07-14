<script setup>
import { ref, computed } from 'vue'

// 用户录入项（5 个）
const price = ref(null)     // 1. 市场参考售价
const cost = ref(null)      // 2. 进货成本（美元）
const fbaFee = ref(null)    // 4. FBA 配送费
const shipping = ref(null)  // 5. 头程运费
const returnRate = ref(5)   // 退货率（%，默认 5）
const adRate = ref(15)      // 广告 ACOS（%，默认 15）
const commissionRate = ref(15) // 佣金率（%，默认 15）

// 工具：转数字，空值当 0
const n = (v) => {
  const num = parseFloat(v)
  return isNaN(num) ? 0 : num
}

// 自动计算项
// 3. 售价 ÷ 成本 倍数
const ratio = computed(() => {
  if (!n(cost.value)) return 0
  return n(price.value) / n(cost.value)
})
// 6. 佣金
const commission = computed(() => n(price.value) * n(commissionRate.value) / 100)
// 7. 退货分摊（成本 × 退货率）
const returns = computed(() => n(cost.value) * n(returnRate.value) / 100)
// 8. 广告分摊（售价 × ACOS）
const ads = computed(() => n(price.value) * n(adRate.value) / 100)
// 9. 净利润 = 售价 − 成本 − FBA − 头程 − 佣金 − 退货 − 广告
const profit = computed(() =>
  n(price.value) - n(cost.value) - n(fbaFee.value) - n(shipping.value)
  - commission.value - returns.value - ads.value
)
// 10. 净利率
const margin = computed(() => {
  if (!n(price.value)) return 0
  return (profit.value / n(price.value)) * 100
})

// 是否已填够计算
const hasInput = computed(() => n(price.value) > 0 && n(cost.value) > 0)

// 判断结论
const verdict = computed(() => {
  if (!hasInput.value) return { type: 'wait', text: '填入售价和成本后自动计算' }
  const checks = []
  // 3 倍规则
  if (ratio.value < 3) {
    checks.push({ ok: false, text: `售价仅为成本的 ${ratio.value.toFixed(1)} 倍，未达 3 倍下限` })
  } else {
    checks.push({ ok: true, text: `售价是成本的 ${ratio.value.toFixed(1)} 倍，过 3 倍线` })
  }
  // 最低售价
  if (n(price.value) < 15) {
    checks.push({ ok: false, text: `售价 $${n(price.value).toFixed(2)} 低于 $15，FBA + 佣金会吃光利润` })
  } else {
    checks.push({ ok: true, text: `售价 $${n(price.value).toFixed(2)} ≥ $15，过最低售价线` })
  }
  // 净利率
  if (margin.value >= 25) {
    checks.push({ ok: true, text: `净利率 ${margin.value.toFixed(1)}% ≥ 25%，利润健康` })
  } else if (margin.value >= 0) {
    checks.push({ ok: false, text: `净利率仅 ${margin.value.toFixed(1)}%，低于 25% 安全线，波动即亏` })
  } else {
    checks.push({ ok: false, text: `净利率 ${margin.value.toFixed(1)}%，每卖一单亏 $${Math.abs(profit.value).toFixed(2)}` })
  }
  const allOk = checks.every(c => c.ok)
  return {
    type: allOk ? 'pass' : 'fail',
    checks,
    text: allOk ? '✅ 通过！可进入采购环节' : '❌ 不过，建议淘汰换产品',
  }
})

// 货币格式
const fmt = (v) => '$' + (isNaN(v) ? '0.00' : Number(v).toFixed(2))

// 重置
function reset() {
  price.value = null
  cost.value = null
  fbaFee.value = null
  shipping.value = null
  returnRate.value = 5
  adRate.value = 15
  commissionRate.value = 15
}
</script>

<template>
  <div class="profit-calc">
    <div class="pc-header">
      <span class="pc-icon">🧮</span>
      <span class="pc-title">利润预筛计算器</span>
      <span class="pc-hint">填入你查到的数据，其余自动算</span>
    </div>

    <div class="pc-grid">
      <!-- 左栏：录入项 -->
      <div class="pc-col">
        <div class="pc-col-title">✏️ 手动录入</div>

        <div class="pc-field">
          <label>1. 市场参考售价</label>
          <div class="pc-input-wrap">
            <span class="pc-prefix">$</span>
            <input v-model="price" type="number" step="0.01" placeholder="如 24.99" />
          </div>
        </div>

        <div class="pc-field">
          <label>2. 进货成本（美元）</label>
          <div class="pc-input-wrap">
            <span class="pc-prefix">$</span>
            <input v-model="cost" type="number" step="0.01" placeholder="如 8" />
          </div>
          <small class="pc-help">1688 进货价 × 汇率</small>
        </div>

        <div class="pc-field">
          <label>4. FBA 配送费</label>
          <div class="pc-input-wrap">
            <span class="pc-prefix">$</span>
            <input v-model="fbaFee" type="number" step="0.01" placeholder="如 4.2" />
          </div>
          <small class="pc-help">用官方 Revenue Calculator 查（包装后尺寸）</small>
        </div>

        <div class="pc-field">
          <label>5. 头程运费 / 件</label>
          <div class="pc-input-wrap">
            <span class="pc-prefix">$</span>
            <input v-model="shipping" type="number" step="0.01" placeholder="如 1.4" />
          </div>
          <small class="pc-help">重量 × ¥20/公斤 ÷ 汇率</small>
        </div>

        <div class="pc-advanced">
          <div class="pc-field inline">
            <label>佣金率</label>
            <div class="pc-input-wrap small">
              <input v-model="commissionRate" type="number" step="1" />
              <span class="pc-suffix">%</span>
            </div>
          </div>
          <div class="pc-field inline">
            <label>退货率</label>
            <div class="pc-input-wrap small">
              <input v-model="returnRate" type="number" step="1" />
              <span class="pc-suffix">%</span>
            </div>
          </div>
          <div class="pc-field inline">
            <label>广告 ACOS</label>
            <div class="pc-input-wrap small">
              <input v-model="adRate" type="number" step="1" />
              <span class="pc-suffix">%</span>
            </div>
          </div>
        </div>

        <button class="pc-reset" @click="reset">重置</button>
      </div>

      <!-- 右栏：自动计算结果 -->
      <div class="pc-col result">
        <div class="pc-col-title">⚡ 自动计算</div>

        <div class="pc-row" :class="{ placeholder: !hasInput }">
          <span class="pc-label">3. 售价 ÷ 成本</span>
          <span class="pc-value">{{ hasInput ? ratio.toFixed(1) + ' 倍' : '—' }}</span>
          <span class="pc-tag" :class="hasInput && ratio >= 3 ? 'ok' : (hasInput ? 'bad' : '')">
            {{ hasInput ? (ratio >= 3 ? '≥3' : '<3') : '' }}
          </span>
        </div>

        <div class="pc-row" :class="{ placeholder: !hasInput }">
          <span class="pc-label">6. 佣金（{{ commissionRate }}%）</span>
          <span class="pc-value">{{ hasInput ? fmt(commission) : '—' }}</span>
        </div>

        <div class="pc-row" :class="{ placeholder: !hasInput }">
          <span class="pc-label">7. 退货分摊（成本 × {{ returnRate }}%）</span>
          <span class="pc-value">{{ hasInput ? fmt(returns) : '—' }}</span>
        </div>

        <div class="pc-row" :class="{ placeholder: !hasInput }">
          <span class="pc-label">8. 广告分摊（售价 × {{ adRate }}%）</span>
          <span class="pc-value">{{ hasInput ? fmt(ads) : '—' }}</span>
        </div>

        <div class="pc-divider"></div>

        <!-- 净利润 -->
        <div class="pc-row highlight" :class="{ placeholder: !hasInput }">
          <span class="pc-label">9. 净利润 / 单</span>
          <span class="pc-value big" :class="hasInput && profit < 0 ? 'neg' : 'pos'">
            {{ hasInput ? fmt(profit) : '—' }}
          </span>
        </div>

        <!-- 净利率 -->
        <div class="pc-row highlight" :class="{ placeholder: !hasInput }">
          <span class="pc-label">10. 净利率</span>
          <span class="pc-value big" :class="hasInput && margin >= 25 ? 'pos' : (hasInput ? 'neg' : '')">
            {{ hasInput ? margin.toFixed(1) + '%' : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 判断结论 -->
    <div v-if="hasInput" class="pc-verdict" :class="verdict.type">
      <div class="pc-verdict-title">{{ verdict.text }}</div>
      <ul class="pc-checks">
        <li v-for="(c, i) in verdict.checks" :key="i" :class="c.ok ? 'pass' : 'fail'">
          <span class="pc-check-icon">{{ c.ok ? '✅' : '⚠️' }}</span>
          {{ c.text }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.profit-calc {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.pc-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.pc-icon { font-size: 1.2rem; }
.pc-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}
.pc-hint {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-left: auto;
}

.pc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
@media (max-width: 720px) {
  .pc-grid { grid-template-columns: 1fr; }
}

.pc-col-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

/* 录入字段 */
.pc-field {
  margin-bottom: 0.85rem;
}
.pc-field.inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.pc-field.inline label {
  width: 4.5rem;
  flex-shrink: 0;
}
.pc-field > label {
  display: block;
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
  margin-bottom: 0.3rem;
  font-weight: 600;
}
.pc-help {
  display: block;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  margin-top: 0.2rem;
}
.pc-input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
}
.pc-input-wrap:focus-within {
  border-color: var(--vp-c-brand-2);
}
.pc-input-wrap.small {
  width: 5rem;
}
.pc-prefix {
  padding: 0 0.5rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}
.pc-suffix {
  padding: 0 0.4rem;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}
.pc-input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.45rem 0.5rem;
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.pc-input-wrap input:focus { outline: none; }
/* 隐藏 number 旋钮 */
.pc-input-wrap input[type=number]::-webkit-inner-spin-button,
.pc-input-wrap input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.pc-input-wrap input[type=number] { -moz-appearance: textfield; }

.pc-advanced {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--vp-c-divider);
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pc-reset {
  margin-top: 0.5rem;
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  cursor: pointer;
}
.pc-reset:hover { color: var(--vp-c-text-1); }

/* 结果行 */
.pc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0;
  font-size: 0.85rem;
}
.pc-row.placeholder .pc-label,
.pc-row.placeholder .pc-value {
  color: var(--vp-c-text-3);
}
.pc-label {
  color: var(--vp-c-text-2);
  flex: 1;
}
.pc-value {
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-align: right;
}
.pc-value.big {
  font-size: 1.15rem;
  font-weight: 800;
}
.pc-value.pos { color: #22c55e; }
.pc-value.neg { color: #ef4444; }
.pc-tag {
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
}
.pc-tag.ok {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}
.pc-tag.bad {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.pc-divider {
  height: 1px;
  background: var(--vp-c-divider);
  margin: 0.5rem 0;
}

.pc-row.highlight {
  padding: 0.3rem 0;
}

/* 结论区 */
.pc-verdict {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid;
}
.pc-verdict.pass {
  background: rgba(34, 197, 94, 0.06);
  border-color: rgba(34, 197, 94, 0.3);
}
.pc-verdict.fail {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.3);
}
.pc-verdict-title {
  font-weight: 800;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}
.pc-verdict.pass .pc-verdict-title { color: #16a34a; }
.pc-verdict.fail .pc-verdict-title { color: #ef4444; }

.pc-checks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.pc-checks li {
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.pc-check-icon {
  flex-shrink: 0;
}
</style>
