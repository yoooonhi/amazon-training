import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '亚马逊运营入门',
  description: '从零开始学亚马逊运营 · 能力进阶制 · 边学边实战',
  lang: 'zh-CN',
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],

  themeConfig: {
    siteTitle: '亚马逊运营入门',
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '总览', link: '/content/00-overview/overview' },
    ],

    sidebar: {
      '/content/': [
        {
          text: '📌 总览',
          items: [
            { text: '能力地图', link: '/content/00-overview/overview' },
          ],
        },
        {
          text: '入门1 · 平台认知与账号安全',
          collapsed: false,
          items: [
            { text: '1.0 亚马逊基础知识和专业术语', link: '/content/modules/m1-platform/00-amazon-basics' },
            { text: '1.1 运营到底是什么工作', link: '/content/modules/m1-platform/01-what-is-ops' },
            { text: '1.2 账号健康4指标', link: '/content/modules/m1-platform/02-account-health' },
            { text: '1.3 收到违规通知怎么办', link: '/content/modules/m1-platform/03-violation-notice' },
            { text: '1.4 Listing合规红线', link: '/content/modules/m1-platform/04-listing-compliance' },
            { text: '1.5 评论合规', link: '/content/modules/m1-platform/05-review-compliance' },
            { text: '1.6 买家消息边界', link: '/content/modules/m1-platform/06-buyer-messages' },
            { text: '1.7 EU合规基础', link: '/content/modules/m1-platform/07-eu-compliance' },
          ],
        },
        {
          text: '入门2 · 选品与采购',
          collapsed: true,
          items: [
            { text: '2.1 选品决定80%的成败', link: '/content/modules/m7-product/01-why-selection-matters' },
            { text: '2.2 市场需求分析', link: '/content/modules/m7-product/02-demand-analysis' },
            { text: '2.3 竞争强度评估', link: '/content/modules/m7-product/03-competition-analysis' },
            { text: '2.4 利润预筛', link: '/content/modules/m7-product/04-profit-screening' },
            { text: '2.5 找供应商与采购', link: '/content/modules/m7-product/05-sourcing' },
            { text: '2.6 选品实操', link: '/content/modules/m7-product/06-selection-practice' },
          ],
        },
        {
          text: '入门3 · Listing搭建基本功',
          collapsed: true,
          items: [
            { text: '3.0 如何上架产品', link: '/content/modules/m2-listing/00-how-to-list' },
            { text: '3.1 A9算法与排名逻辑', link: '/content/modules/m2-listing/01-a9-algorithm' },
            { text: '3.2 标题怎么写', link: '/content/modules/m2-listing/02-title' },
            { text: '3.3 五点描述怎么写', link: '/content/modules/m2-listing/03-bullets' },
            { text: '3.4 长描述怎么写', link: '/content/modules/m2-listing/03b-description' },
            { text: '3.5 Search Terms', link: '/content/modules/m2-listing/04-search-terms' },
            { text: '3.6 主图与副图体系', link: '/content/modules/m2-listing/05-images' },
            { text: '3.7 类目与后台属性', link: '/content/modules/m2-listing/06-category-attributes' },
            { text: '3.8 关键词研究方法', link: '/content/modules/m2-listing/07-keyword-research' },
            { text: '3.9 品牌备案与A+内容', link: '/content/modules/m2-listing/09-brand-a-plus' },
            { text: '3.10 竞品研究方法', link: '/content/modules/m2-listing/10-competitor-research' },
            { text: '3.11 Listing实操', link: '/content/modules/m2-listing/08-listing-practice' },
          ],
        },
        {
          text: '入门4 · 库存与FBA物流',
          collapsed: true,
          items: [
            { text: '4.1 FBA基本逻辑', link: '/content/modules/m3-inventory/01-fba-basics' },
            { text: '4.2 FBA费用体系', link: '/content/modules/m3-inventory/02-fba-fees' },
            { text: '4.3 库存周转与可售天数', link: '/content/modules/m3-inventory/03-turnover-days' },
            { text: '4.4 补货逻辑', link: '/content/modules/m3-inventory/04-replenishment' },
            { text: '4.5 货件状态分类', link: '/content/modules/m3-inventory/05-shipment-status' },
            { text: '4.6 断货预防', link: '/content/modules/m3-inventory/06-stockout-prevention' },
            { text: '4.7 发货计划实操', link: '/content/modules/m3-inventory/07-shipping-practice' },
          ],
        },
        {
          text: '入门5 · 广告体系',
          collapsed: true,
          items: [
            { text: '5.1 广告类型与基础', link: '/content/modules/m4-ads/01-ad-types' },
            { text: '5.2 关键词匹配类型', link: '/content/modules/m4-ads/02-match-types' },
            { text: '5.3 核心指标', link: '/content/modules/m4-ads/03-metrics' },
            { text: '5.4 BE ACOS', link: '/content/modules/m4-ads/04-be-acos' },
            { text: '5.5 广告结构设计', link: '/content/modules/m4-ads/05-campaign-structure' },
            { text: '5.6 关键词毕业与否定', link: '/content/modules/m4-ads/06-graduation-negative' },
            { text: '5.7 出价调整逻辑', link: '/content/modules/m4-ads/07-bidding' },
            { text: '5.8 广告报表解读', link: '/content/modules/m4-ads/08-reports' },
            { text: '5.9 新品广告策略', link: '/content/modules/m4-ads/09-new-product-strategy' },
            { text: '5.10 评论获取与Amazon Vine', link: '/content/modules/m4-ads/11-vine-reviews' },
            { text: '5.11 广告实操', link: '/content/modules/m4-ads/10-ads-practice' },
          ],
        },
        {
          text: '入门6 · 定价与利润',
          collapsed: true,
          items: [
            { text: '6.1 利润链全貌', link: '/content/modules/m5-pricing/01-profit-chain' },
            { text: '6.2 VAT与佣金基数', link: '/content/modules/m5-pricing/02-vat-commission' },
            { text: '6.3 调价是原子操作', link: '/content/modules/m5-pricing/03-atomic-pricing' },
            { text: '6.4 Coupon与Deal', link: '/content/modules/m5-pricing/04-coupon-deal' },
            { text: '6.5 利润手算实操', link: '/content/modules/m5-pricing/05-profit-practice' },
          ],
        },
        {
          text: '入门7 · 日常运营与判断力',
          collapsed: true,
          items: [
            { text: '7.1 每日工作流程', link: '/content/modules/m6-daily/01-daily-routine' },
            { text: '7.2 优先级判断', link: '/content/modules/m6-daily/02-priority' },
            { text: '7.3 数据可信度检查', link: '/content/modules/m6-daily/03-data-trust' },
            { text: '7.4 跟卖防御与Buy Box', link: '/content/modules/m6-daily/06-hijack-buybox' },
            { text: '7.5 退货退款与异常处理', link: '/content/modules/m6-daily/07-returns-exceptions' },
            { text: '7.6 决策记录与复盘', link: '/content/modules/m6-daily/04-decision-review' },
            { text: '7.7 常见误判', link: '/content/modules/m6-daily/05-common-mistakes' },
          ],
        },
        // ===== 初级（导师内测中，普通学员侧边栏不显示）=====
        {
          text: '🔒 初级1 · 广告优化实战',
          collapsed: true,
          items: [
            { text: '1.1 搜索词报表与归因窗口', link: '/content/beginner/b1-ads-optimization/01-search-term-attribution' },
            { text: '1.2 否定词池搭建', link: '/content/beginner/b1-ads-optimization/02-negative-keyword-pool' },
            { text: '1.3 分时调价与TOS抢占', link: '/content/beginner/b1-ads-optimization/03-dayparting-tos' },
            { text: '1.4 ACOS压降闭环', link: '/content/beginner/b1-ads-optimization/04-acos-reduction-loop' },
            { text: '1.5 周度优化清单（实操）', link: '/content/beginner/b1-ads-optimization/05-weekly-checklist-practice' },
          ],
        },
        {
          text: '🔒 初级2 · Listing持续优化',
          collapsed: true,
          items: [
            { text: '2.1 文案A/B测试', link: '/content/beginner/b2-listing-optimization/01-ab-testing' },
            { text: '2.2 关键词排名监控', link: '/content/beginner/b2-listing-optimization/02-rank-monitoring' },
            { text: '2.3 Search Terms迭代', link: '/content/beginner/b2-listing-optimization/03-search-terms-iteration' },
            { text: '2.4 图片点击率优化', link: '/content/beginner/b2-listing-optimization/04-image-ctr' },
            { text: '2.5 Listing体检（实操）', link: '/content/beginner/b2-listing-optimization/05-listing-audit-practice' },
          ],
        },
        {
          text: '🔒 初级3 · 库存精细化运营',
          collapsed: true,
          items: [
            { text: '3.1 补货量计算模型', link: '/content/beginner/b3-inventory-advanced/01-replenishment-model' },
            { text: '3.2 备货资金预算', link: '/content/beginner/b3-inventory-advanced/02-stock-budget' },
            { text: '3.3 滞销预警与处理', link: '/content/beginner/b3-inventory-advanced/03-stagnant-inventory' },
            { text: '3.4 补货计划（实操）', link: '/content/beginner/b3-inventory-advanced/04-replenishment-practice' },
          ],
        },
        {
          text: '🔒 初级4 · 定价与促销策略',
          collapsed: true,
          items: [
            { text: '4.1 竞品定价跟踪', link: '/content/beginner/b4-pricing-strategy/01-competitor-pricing' },
            { text: '4.2 促销节奏设计', link: '/content/beginner/b4-pricing-strategy/02-promo-rhythm' },
            { text: '4.3 价格弹性测试', link: '/content/beginner/b4-pricing-strategy/03-price-elasticity' },
            { text: '4.4 月度促销表（实操）', link: '/content/beginner/b4-pricing-strategy/04-monthly-promo-plan' },
          ],
        },
        // ===== 中级（导师内测中）=====
        {
          text: '🔒 中级1 · 新品冷启动全流程',
          collapsed: true,
          items: [
            { text: '1.1 选款验证', link: '/content/intermediate/i1-cold-start/01-selection-validation' },
            { text: '1.2 上架节奏规划', link: '/content/intermediate/i1-cold-start/02-launch-timeline' },
            { text: '1.3 冷启动四阶段细化', link: '/content/intermediate/i1-cold-start/03-cold-start-four-phases' },
            { text: '1.4 榜单冲刺打法', link: '/content/intermediate/i1-cold-start/04-ranking-push' },
            { text: '1.5 首批评论策略', link: '/content/intermediate/i1-cold-start/05-first-reviews' },
            { text: '1.6 流量结构搭建', link: '/content/intermediate/i1-cold-start/06-traffic-structure' },
            { text: '1.7 新品0-60天作战计划（实操）', link: '/content/intermediate/i1-cold-start/07-launch-plan-practice' },
          ],
        },
        {
          text: '🔒 中级2 · 多SKU与产品线管理',
          collapsed: true,
          items: [
            { text: '2.1 产品线规划', link: '/content/intermediate/i2-multi-sku/01-product-line-planning' },
            { text: '2.2 新老品配比与资源分配', link: '/content/intermediate/i2-multi-sku/02-new-old-ratio' },
            { text: '2.3 SKU精简与聚焦', link: '/content/intermediate/i2-multi-sku/03-sku-rationalization' },
            { text: '2.4 产品生命周期管理', link: '/content/intermediate/i2-multi-sku/04-lifecycle-management' },
            { text: '2.5 产品线健康度盘点（实操）', link: '/content/intermediate/i2-multi-sku/05-portfolio-review-practice' },
          ],
        },
        {
          text: '🔒 中级3 · 品牌化基础',
          collapsed: true,
          items: [
            { text: '3.1 品牌备案深度用法', link: '/content/intermediate/i3-branding/01-brand-registry-deep' },
            { text: '3.2 A+高级版与品牌故事', link: '/content/intermediate/i3-branding/02-a-plus-premium' },
            { text: '3.3 品牌旗舰店搭建', link: '/content/intermediate/i3-branding/03-brand-store' },
            { text: '3.4 Brand Analytics实战', link: '/content/intermediate/i3-branding/04-brand-analytics' },
            { text: '3.5 品牌基础搭建清单（实操）', link: '/content/intermediate/i3-branding/05-brand-foundation-practice' },
          ],
        },
        {
          text: '🔒 中级4 · 数据分析与运营看板',
          collapsed: true,
          items: [
            { text: '4.1 Business Reports深读', link: '/content/intermediate/i4-data-analysis/01-business-reports' },
            { text: '4.2 第三方工具实战', link: '/content/intermediate/i4-data-analysis/02-third-party-tools' },
            { text: '4.3 用数据找增长点', link: '/content/intermediate/i4-data-analysis/03-growth-diagnosis' },
            { text: '4.4 自建运营看板', link: '/content/intermediate/i4-data-analysis/04-dashboard-building' },
          ],
        },
        // ===== 高级（导师内测中）=====
        {
          text: '🔒 高级1 · 品牌保护与长期主义',
          collapsed: true,
          items: [
            { text: '1.1 Transparency透明计划', link: '/content/advanced/a1-brand-protection/01-transparency-program' },
            { text: '1.2 Project Zero与自动保护', link: '/content/advanced/a1-brand-protection/02-project-zero' },
            { text: '1.3 跟卖打击SOP', link: '/content/advanced/a1-brand-protection/03-hijack-defense-sop' },
            { text: '1.4 品牌资产沉淀', link: '/content/advanced/a1-brand-protection/04-brand-assets' },
            { text: '1.5 品牌防御体系搭建（实操）', link: '/content/advanced/a1-brand-protection/05-defense-strategy-practice' },
          ],
        },
        {
          text: '🔒 高级2 · 多站点全球扩张',
          collapsed: true,
          items: [
            { text: '2.1 美欧日站点差异', link: '/content/advanced/a2-global-expansion/01-site-differences' },
            { text: '2.2 自发货vs FBA选择', link: '/content/advanced/a2-global-expansion/02-fba-vs-fbm-choice' },
            { text: '2.3 跨境物流方案', link: '/content/advanced/a2-global-expansion/03-cross-border-logistics' },
            { text: '2.4 Listing本地化', link: '/content/advanced/a2-global-expansion/04-localization' },
            { text: '2.5 各国税务合规', link: '/content/advanced/a2-global-expansion/05-tax-compliance' },
            { text: '2.6 新站点扩张可行性评估（实操）', link: '/content/advanced/a2-global-expansion/06-expansion-feasibility-practice' },
          ],
        },
        {
          text: '🔒 高级3 · 合规深水区与申诉',
          collapsed: true,
          items: [
            { text: '3.1 账号冻结申诉全流程', link: '/content/advanced/a3-compliance-appeal/01-account-suspension-appeal' },
            { text: '3.2 侵权处理', link: '/content/advanced/a3-compliance-appeal/02-infringement' },
            { text: '3.3 视频验证应对', link: '/content/advanced/a3-compliance-appeal/03-video-verification' },
            { text: '3.4 评论违规与恢复', link: '/content/advanced/a3-compliance-appeal/04-review-manipulation' },
            { text: '3.5 撰写一份POA申诉书（实操）', link: '/content/advanced/a3-compliance-appeal/05-appeal-writing-practice' },
          ],
        },
        {
          text: '🔒 高级4 · 高阶广告与流量组合',
          collapsed: true,
          items: [
            { text: '4.1 DSP广告入门', link: '/content/advanced/a4-advanced-ads/01-dsp-ads' },
            { text: '4.2 SD再营销', link: '/content/advanced/a4-advanced-ads/02-sd-retargeting' },
            { text: '4.3 品牌广告组合', link: '/content/advanced/a4-advanced-ads/03-brand-ads-combo' },
            { text: '4.4 全漏斗流量打法设计（实操）', link: '/content/advanced/a4-advanced-ads/04-full-funnel-strategy' },
          ],
        },
        // ===== 进阶（导师内测中）=====
        {
          text: '🔒 进阶1 · 团队运营与SOP',
          collapsed: true,
          items: [
            { text: '1.1 运营岗位分工', link: '/content/expert/e1-team-sop/01-role-design' },
            { text: '1.2 KPI设计', link: '/content/expert/e1-team-sop/02-kpi-design' },
            { text: '1.3 SOP化与流程沉淀', link: '/content/expert/e1-team-sop/03-sop-system' },
            { text: '1.4 新人培训体系', link: '/content/expert/e1-team-sop/04-training-system' },
            { text: '1.5 岗位分工+KPI+SOP框架（实操）', link: '/content/expert/e1-team-sop/05-team-framework-practice' },
          ],
        },
        {
          text: '🔒 进阶2 · 财务与现金流管理',
          collapsed: true,
          items: [
            { text: '2.1 资金预算与占用', link: '/content/expert/e2-finance-cashflow/01-capital-budget' },
            { text: '2.2 库存周转天数管理', link: '/content/expert/e2-finance-cashflow/02-turnover-management' },
            { text: '2.3 利润盘汇总', link: '/content/expert/e2-finance-cashflow/03-profit-aggregation' },
            { text: '2.4 现金流预警', link: '/content/expert/e2-finance-cashflow/04-cashflow-warning' },
            { text: '2.5 利润+现金流监控表（实操）', link: '/content/expert/e2-finance-cashflow/05-financial-model-practice' },
          ],
        },
        {
          text: '🔒 进阶3 · 战略选品与品类布局',
          collapsed: true,
          items: [
            { text: '3.1 品类卡位分析', link: '/content/expert/e3-category-strategy/01-category-positioning' },
            { text: '3.2 产品矩阵设计', link: '/content/expert/e3-category-strategy/02-product-matrix' },
            { text: '3.3 护城河构建', link: '/content/expert/e3-category-strategy/03-moat-building' },
            { text: '3.4 长期品类规划', link: '/content/expert/e3-category-strategy/04-long-term-planning' },
            { text: '3.5 品类战略规划（实操）', link: '/content/expert/e3-category-strategy/05-category-strategy-practice' },
          ],
        },
        {
          text: '🔒 进阶4 · 风险管理与危机应对',
          collapsed: true,
          items: [
            { text: '4.1 账号风险预警体系', link: '/content/expert/e4-risk-management/01-account-risk-system' },
            { text: '4.2 库存与资金风险', link: '/content/expert/e4-risk-management/02-inventory-capital-risk' },
            { text: '4.3 平台政策变动应对', link: '/content/expert/e4-risk-management/03-policy-change-response' },
            { text: '4.4 黑天鹅预案', link: '/content/expert/e4-risk-management/04-black-swan-playbook' },
            { text: '4.5 风险预警与应急预案（实操）', link: '/content/expert/e4-risk-management/05-risk-playbook-practice' },
          ],
        },
      ],
    },

    socialLinks: [],
    footer: {
      message: '亚马逊运营入门 · 边学边实战 · 联系站长：yoonhi_@outlook.com',
      copyright: ''
    },
    outline: { level: [2, 3], label: '本课目录' },
    docFooter: { prev: '上一课', next: '下一课' },
    lastUpdatedText: '最后更新',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索课程', buttonAriaLabel: '搜索' },
          modal: { noResultsText: '找不到结果' },
        },
      },
    },
  },

  vite: { server: { host: '127.0.0.1', port: 5173 } },
})
