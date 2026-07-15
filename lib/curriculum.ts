// 课程结构（lessonId 与内容文件实际使用的一致）
// level 字段标记所属等级：入门（全体可见）/ 初级等（导师内测中）
export const curriculum = [
  {
    level: '入门' as const,
    week: 1,
    title: '平台认知与账号安全',
    lessons: [
      'm1-00', 'm1-01-what-is-ops', 'm1-02-account-health',
      'm1-03-violation-notice', 'm1-04-listing-compliance',
      'm1-05-review-compliance', 'm1-06-buyer-messages', 'm1-07-eu-compliance',
    ],
  },
  {
    level: '入门' as const,
    week: 2,
    title: '选品与采购',
    lessons: [
      'm7-01-why-selection-matters', 'm7-02-demand-analysis', 'm7-03-competition-analysis',
      'm7-04-profit-screening', 'm7-05-sourcing', 'm7-06-selection-practice',
    ],
  },
  {
    level: '入门' as const,
    week: 3,
    title: 'Listing搭建基本功',
    lessons: [
      'm2-00', 'm2-01', 'm2-02', 'm2-03', 'm2-03b', 'm2-04',
      'm2-05', 'm2-06', 'm2-07', 'm2-08', 'm2-09', 'm2-10',
    ],
  },
  {
    level: '入门' as const,
    week: 4,
    title: '库存与FBA物流',
    lessons: [
      'm3-01', 'm3-02', 'm3-03', 'm3-04', 'm3-05', 'm3-06', 'm3-07',
    ],
  },
  {
    level: '入门' as const,
    week: 5,
    title: '广告体系',
    lessons: [
      'm4-01', 'm4-02', 'm4-03', 'm4-04', 'm4-05', 'm4-06',
      'm4-07', 'm4-08', 'm4-09', 'm4-10', 'm4-11',
    ],
  },
  {
    level: '入门' as const,
    week: 6,
    title: '定价与利润',
    lessons: [
      'm5-01-profit-chain', 'm5-02-vat-commission', 'm5-03-atomic-pricing',
      'm5-04-coupon-deal', 'm5-05-profit-practice',
    ],
  },
  {
    level: '入门' as const,
    week: 7,
    title: '日常运营与判断力',
    lessons: [
      'm6-01-daily-routine', 'm6-02-priority', 'm6-03-data-trust',
      'm6-04-decision-review', 'm6-05-common-mistakes', 'm6-06-hijack-buybox',
      'm6-07-returns-exceptions',
    ],
  },
  // ===== 初级（导师内测中）=====
  {
    level: '初级' as const,
    week: 1,
    title: '广告优化实战',
    lessons: [
      'b1-01', 'b1-02', 'b1-03', 'b1-04', 'b1-05',
    ],
  },
  {
    level: '初级' as const,
    week: 2,
    title: 'Listing持续优化',
    lessons: [
      'b2-01', 'b2-02', 'b2-03', 'b2-04', 'b2-05',
    ],
  },
  {
    level: '初级' as const,
    week: 3,
    title: '库存精细化运营',
    lessons: [
      'b3-01', 'b3-02', 'b3-03', 'b3-04',
    ],
  },
  {
    level: '初级' as const,
    week: 4,
    title: '定价与促销策略',
    lessons: [
      'b4-01', 'b4-02', 'b4-03', 'b4-04',
    ],
  },
  // ===== 中级（导师内测中）=====
  {
    level: '中级' as const,
    week: 1,
    title: '新品冷启动全流程',
    lessons: [
      'i1-01', 'i1-02', 'i1-03', 'i1-04', 'i1-05', 'i1-06', 'i1-07',
    ],
  },
  {
    level: '中级' as const,
    week: 2,
    title: '多SKU与产品线管理',
    lessons: [
      'i2-01', 'i2-02', 'i2-03', 'i2-04', 'i2-05',
    ],
  },
  {
    level: '中级' as const,
    week: 3,
    title: '品牌化基础',
    lessons: [
      'i3-01', 'i3-02', 'i3-03', 'i3-04', 'i3-05',
    ],
  },
  {
    level: '中级' as const,
    week: 4,
    title: '数据分析与运营看板',
    lessons: [
      'i4-01', 'i4-02', 'i4-03', 'i4-04',
    ],
  },
  // ===== 高级（导师内测中）=====
  {
    level: '高级' as const,
    week: 1,
    title: '品牌保护与长期主义',
    lessons: [
      'a1-01', 'a1-02', 'a1-03', 'a1-04', 'a1-05',
    ],
  },
  {
    level: '高级' as const,
    week: 2,
    title: '多站点全球扩张',
    lessons: [
      'a2-01', 'a2-02', 'a2-03', 'a2-04', 'a2-05', 'a2-06',
    ],
  },
  {
    level: '高级' as const,
    week: 3,
    title: '合规深水区与申诉',
    lessons: [
      'a3-01', 'a3-02', 'a3-03', 'a3-04', 'a3-05',
    ],
  },
  {
    level: '高级' as const,
    week: 4,
    title: '高阶广告与流量组合',
    lessons: [
      'a4-01', 'a4-02', 'a4-03', 'a4-04',
    ],
  },
  // ===== 进阶（导师内测中）=====
  {
    level: '进阶' as const,
    week: 1,
    title: '团队运营与SOP',
    lessons: [
      'e1-01', 'e1-02', 'e1-03', 'e1-04', 'e1-05',
    ],
  },
  {
    level: '进阶' as const,
    week: 2,
    title: '财务与现金流管理',
    lessons: [
      'e2-01', 'e2-02', 'e2-03', 'e2-04', 'e2-05',
    ],
  },
  {
    level: '进阶' as const,
    week: 3,
    title: '战略选品与品类布局',
    lessons: [
      'e3-01', 'e3-02', 'e3-03', 'e3-04', 'e3-05',
    ],
  },
  {
    level: '进阶' as const,
    week: 4,
    title: '风险管理与危机应对',
    lessons: [
      'e4-01', 'e4-02', 'e4-03', 'e4-04', 'e4-05',
    ],
  },
]

// 所有课程（含受保护等级）
export const allLessons = curriculum.flatMap(w => w.lessons)

// 仅对公众开放的课程（普通学员可见的进度分母，不含受保护等级）
export const publicLessons = curriculum
  .filter(w => w.level === '入门')
  .flatMap(w => w.lessons)

// totalLessons 用于进度分母：保持为入门课数量，避免普通学员看到分母变大
export const totalLessons = publicLessons.length

// URL 路径 → lessonId 的权威映射表
// lessonId 命名规则在模块间不统一（m1-m4 用纯课号 m4-04，m5-m7 带完整文件名），
// 无法靠字符串推导，只能用显式映射。由构建脚本扫描各 .md 的 lessonId 生成。
// 键格式："模块目录/文件名"  如 "m4-ads/04-be-acos"
export const pathToLessonId: Record<string, string> = {
  'm1-platform/00-amazon-basics': 'm1-00',
  'm1-platform/01-what-is-ops': 'm1-01-what-is-ops',
  'm1-platform/02-account-health': 'm1-02-account-health',
  'm1-platform/03-violation-notice': 'm1-03-violation-notice',
  'm1-platform/04-listing-compliance': 'm1-04-listing-compliance',
  'm1-platform/05-review-compliance': 'm1-05-review-compliance',
  'm1-platform/06-buyer-messages': 'm1-06-buyer-messages',
  'm1-platform/07-eu-compliance': 'm1-07-eu-compliance',
  'm7-product/01-why-selection-matters': 'm7-01-why-selection-matters',
  'm7-product/02-demand-analysis': 'm7-02-demand-analysis',
  'm7-product/03-competition-analysis': 'm7-03-competition-analysis',
  'm7-product/04-profit-screening': 'm7-04-profit-screening',
  'm7-product/05-sourcing': 'm7-05-sourcing',
  'm7-product/06-selection-practice': 'm7-06-selection-practice',
  'm2-listing/00-how-to-list': 'm2-00',
  'm2-listing/01-a9-algorithm': 'm2-01',
  'm2-listing/02-title': 'm2-02',
  'm2-listing/03-bullets': 'm2-03',
  'm2-listing/03b-description': 'm2-03b',
  'm2-listing/04-search-terms': 'm2-04',
  'm2-listing/05-images': 'm2-05',
  'm2-listing/06-category-attributes': 'm2-06',
  'm2-listing/07-keyword-research': 'm2-07',
  'm2-listing/08-listing-practice': 'm2-08',
  'm2-listing/09-brand-a-plus': 'm2-09',
  'm2-listing/10-competitor-research': 'm2-10',
  'm3-inventory/01-fba-basics': 'm3-01',
  'm3-inventory/02-fba-fees': 'm3-02',
  'm3-inventory/03-turnover-days': 'm3-03',
  'm3-inventory/04-replenishment': 'm3-04',
  'm3-inventory/05-shipment-status': 'm3-05',
  'm3-inventory/06-stockout-prevention': 'm3-06',
  'm3-inventory/07-shipping-practice': 'm3-07',
  'm4-ads/01-ad-types': 'm4-01',
  'm4-ads/02-match-types': 'm4-02',
  'm4-ads/03-metrics': 'm4-03',
  'm4-ads/04-be-acos': 'm4-04',
  'm4-ads/05-campaign-structure': 'm4-05',
  'm4-ads/06-graduation-negative': 'm4-06',
  'm4-ads/07-bidding': 'm4-07',
  'm4-ads/08-reports': 'm4-08',
  'm4-ads/09-new-product-strategy': 'm4-09',
  'm4-ads/10-ads-practice': 'm4-10',
  'm4-ads/11-vine-reviews': 'm4-11',
  'm5-pricing/01-profit-chain': 'm5-01-profit-chain',
  'm5-pricing/02-vat-commission': 'm5-02-vat-commission',
  'm5-pricing/03-atomic-pricing': 'm5-03-atomic-pricing',
  'm5-pricing/04-coupon-deal': 'm5-04-coupon-deal',
  'm5-pricing/05-profit-practice': 'm5-05-profit-practice',
  'm6-daily/01-daily-routine': 'm6-01-daily-routine',
  'm6-daily/02-priority': 'm6-02-priority',
  'm6-daily/03-data-trust': 'm6-03-data-trust',
  'm6-daily/04-decision-review': 'm6-04-decision-review',
  'm6-daily/05-common-mistakes': 'm6-05-common-mistakes',
  'm6-daily/06-hijack-buybox': 'm6-06-hijack-buybox',
  'm6-daily/07-returns-exceptions': 'm6-07-returns-exceptions',
  // ===== 初级课程（导师内测中）=====
  'b1-ads-optimization/01-search-term-attribution': 'b1-01',
  'b1-ads-optimization/02-negative-keyword-pool': 'b1-02',
  'b1-ads-optimization/03-dayparting-tos': 'b1-03',
  'b1-ads-optimization/04-acos-reduction-loop': 'b1-04',
  'b1-ads-optimization/05-weekly-checklist-practice': 'b1-05',
  'b2-listing-optimization/01-ab-testing': 'b2-01',
  'b2-listing-optimization/02-rank-monitoring': 'b2-02',
  'b2-listing-optimization/03-search-terms-iteration': 'b2-03',
  'b2-listing-optimization/04-image-ctr': 'b2-04',
  'b2-listing-optimization/05-listing-audit-practice': 'b2-05',
  'b3-inventory-advanced/01-replenishment-model': 'b3-01',
  'b3-inventory-advanced/02-stock-budget': 'b3-02',
  'b3-inventory-advanced/03-stagnant-inventory': 'b3-03',
  'b3-inventory-advanced/04-replenishment-practice': 'b3-04',
  'b4-pricing-strategy/01-competitor-pricing': 'b4-01',
  'b4-pricing-strategy/02-promo-rhythm': 'b4-02',
  'b4-pricing-strategy/03-price-elasticity': 'b4-03',
  'b4-pricing-strategy/04-monthly-promo-plan': 'b4-04',
  // ===== 中级课程 =====
  'i1-cold-start/01-selection-validation': 'i1-01',
  'i1-cold-start/02-launch-timeline': 'i1-02',
  'i1-cold-start/03-cold-start-four-phases': 'i1-03',
  'i1-cold-start/04-ranking-push': 'i1-04',
  'i1-cold-start/05-first-reviews': 'i1-05',
  'i1-cold-start/06-traffic-structure': 'i1-06',
  'i1-cold-start/07-launch-plan-practice': 'i1-07',
  'i2-multi-sku/01-product-line-planning': 'i2-01',
  'i2-multi-sku/02-new-old-ratio': 'i2-02',
  'i2-multi-sku/03-sku-rationalization': 'i2-03',
  'i2-multi-sku/04-lifecycle-management': 'i2-04',
  'i2-multi-sku/05-portfolio-review-practice': 'i2-05',
  'i3-branding/01-brand-registry-deep': 'i3-01',
  'i3-branding/02-a-plus-premium': 'i3-02',
  'i3-branding/03-brand-store': 'i3-03',
  'i3-branding/04-brand-analytics': 'i3-04',
  'i3-branding/05-brand-foundation-practice': 'i3-05',
  'i4-data-analysis/01-business-reports': 'i4-01',
  'i4-data-analysis/02-third-party-tools': 'i4-02',
  'i4-data-analysis/03-growth-diagnosis': 'i4-03',
  'i4-data-analysis/04-dashboard-building': 'i4-04',
  // ===== 高级课程 =====
  'a1-brand-protection/01-transparency-program': 'a1-01',
  'a1-brand-protection/02-project-zero': 'a1-02',
  'a1-brand-protection/03-hijack-defense-sop': 'a1-03',
  'a1-brand-protection/04-brand-assets': 'a1-04',
  'a1-brand-protection/05-defense-strategy-practice': 'a1-05',
  'a2-global-expansion/01-site-differences': 'a2-01',
  'a2-global-expansion/02-fba-vs-fbm-choice': 'a2-02',
  'a2-global-expansion/03-cross-border-logistics': 'a2-03',
  'a2-global-expansion/04-localization': 'a2-04',
  'a2-global-expansion/05-tax-compliance': 'a2-05',
  'a2-global-expansion/06-expansion-feasibility-practice': 'a2-06',
  'a3-compliance-appeal/01-account-suspension-appeal': 'a3-01',
  'a3-compliance-appeal/02-infringement': 'a3-02',
  'a3-compliance-appeal/03-video-verification': 'a3-03',
  'a3-compliance-appeal/04-review-manipulation': 'a3-04',
  'a3-compliance-appeal/05-appeal-writing-practice': 'a3-05',
  'a4-advanced-ads/01-dsp-ads': 'a4-01',
  'a4-advanced-ads/02-sd-retargeting': 'a4-02',
  'a4-advanced-ads/03-brand-ads-combo': 'a4-03',
  'a4-advanced-ads/04-full-funnel-strategy': 'a4-04',
  // ===== 进阶课程 =====
  'e1-team-sop/01-role-design': 'e1-01',
  'e1-team-sop/02-kpi-design': 'e1-02',
  'e1-team-sop/03-sop-system': 'e1-03',
  'e1-team-sop/04-training-system': 'e1-04',
  'e1-team-sop/05-team-framework-practice': 'e1-05',
  'e2-finance-cashflow/01-capital-budget': 'e2-01',
  'e2-finance-cashflow/02-turnover-management': 'e2-02',
  'e2-finance-cashflow/03-profit-aggregation': 'e2-03',
  'e2-finance-cashflow/04-cashflow-warning': 'e2-04',
  'e2-finance-cashflow/05-financial-model-practice': 'e2-05',
  'e3-category-strategy/01-category-positioning': 'e3-01',
  'e3-category-strategy/02-product-matrix': 'e3-02',
  'e3-category-strategy/03-moat-building': 'e3-03',
  'e3-category-strategy/04-long-term-planning': 'e3-04',
  'e3-category-strategy/05-category-strategy-practice': 'e3-05',
  'e4-risk-management/01-account-risk-system': 'e4-01',
  'e4-risk-management/02-inventory-capital-risk': 'e4-02',
  'e4-risk-management/03-policy-change-response': 'e4-03',
  'e4-risk-management/04-black-swan-playbook': 'e4-04',
  'e4-risk-management/05-risk-playbook-practice': 'e4-05',
  // ===== 技能补给站 =====
  'domain-basics': 'skill-domain',
  'phishing-detection': 'skill-phishing',
  'system-shortcuts': 'skill-shortcuts',
  'browser-shortcuts': 'skill-browser',
}

// ===== 技能补给站：独立栏目（登录可见，不参与五级体系）=====
// 仅用于 ContinueCard 等按 lessonId 反查标题的场景。
// 刻意不进入 curriculum 主数组，以免污染进度统计（publicLessons/totalLessons）
// 与导师看板；其访问门控走 accessControl 里的 isSkillPath 那一套，与等级无关。
export const skillLessons: { lessonId: string; title: string }[] = [
  { lessonId: 'skill-domain', title: '域名结构与网址识别' },
  { lessonId: 'skill-phishing', title: '钓鱼网站识别' },
  { lessonId: 'skill-shortcuts', title: '电脑快捷键基础（Windows + Mac）' },
  { lessonId: 'skill-browser', title: '浏览器快捷键实战' },
]

// 课程内容的目录前缀（getLessonIdByPath 用）
const CONTENT_PREFIXES = [
  'content/modules/',
  'content/beginner/',
  'content/intermediate/',
  'content/advanced/',
  'content/expert/',
  'content/skills/',
]

// 根据页面相对路径推导 lessonId（Comments 组件零侵入注入用）
export function getLessonIdByPath(relativePath: string): string | null {
  if (!relativePath) return null
  // 尝试匹配已知的内容目录前缀
  for (const prefix of CONTENT_PREFIXES) {
    if (relativePath.startsWith(prefix)) {
      const key = relativePath
        .replace(prefix, '')
        .replace(/\.md$/, '')
      const id = pathToLessonId[key]
      if (id) return id
    }
  }
  return null
}
