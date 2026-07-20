import { defineConfig } from 'vitepress'
import { isPathAccessible } from '../lib/accessControl'

/**
 * 把 VitePress 的 relativePath（如 'content/beginner/foo.md'）
 * 转成运行时 URL 路径（如 '/content/beginner/foo'）。
 * accessControl 的判定都基于路径前缀，无需精确到文件名。
 */
function toUrlPath(relativePath: string): string {
  let p = '/' + relativePath.replace(/\.md$/, '')
  p = p.replace(/\/index$/, '/')
  return p
}

export default defineConfig({
  title: '亚马逊运营训练营',
  description: '亚马逊运营系统课程：从零开始到独立操盘。5大等级140+节课，覆盖选品、Listing、FBA库存、广告优化、定价利润全链路，边学边实战。',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  // 默认夜间模式：首次访问强制深色；用户手动切日间后记到 localStorage，
  // 后续按用户选择。优于跟随系统（原默认 auto 会因系统浅色而进入日间）。
  appearance: 'dark',

  sitemap: {
    hostname: 'https://www.pipishou.top',
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    // Open Graph：分享到微信/微博/Twitter 的卡片
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '亚马逊运营训练营' }],
    ['meta', { property: 'og:title', content: '亚马逊运营训练营' }],
    ['meta', { property: 'og:description', content: '亚马逊运营系统课程：从零开始到独立操盘。5大等级140+节课，覆盖选品、Listing、FBA库存、广告优化、定价利润全链路。' }],
    ['meta', { property: 'og:url', content: 'https://www.pipishou.top' }],
    ['meta', { property: 'og:image', content: 'https://www.pipishou.top/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://www.pipishou.top/og-image.png' }],
    ['meta', { name: 'twitter:title', content: '亚马逊运营训练营' }],
    ['meta', { name: 'twitter:description', content: '亚马逊运营系统课程：从零开始到独立操盘。5大等级140+节课。' }],
    // theme-color（移动端浏览器地址栏配色）
    ['meta', { name: 'theme-color', content: '#3451b2' }],
  ],

  themeConfig: {
    siteTitle: '亚马逊运营训练营',
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
        // ===== 技能补给站（通用数字技能）=====
        // 规则：第一课 domain-basics 全员可见，其余技能课需登录后访问（见 lib/accessControl.ts）。
        {
          text: '🧰 技能补给站',
          collapsed: true,
          items: [
            { text: '域名结构与网址识别', link: '/content/skills/domain-basics' },
            { text: '钓鱼网站识别', link: '/content/skills/phishing-detection' },
            { text: '电脑快捷键基础（Windows + Mac）', link: '/content/skills/system-shortcuts' },
                { text: '浏览器快捷键实战', link: '/content/skills/browser-shortcuts' },
                { text: 'Excel 三大神器（运营向）', link: '/content/skills/excel-for-ops' },
          ],
        },
        // ===== 入门课（7个模块）=====
        {
          text: '入门课',
          collapsed: true,
          items: [
            {
              text: '入门1 · 平台认知与账号安全',
              collapsed: true,
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
          ],
        },
        // ===== 初级（管理员内测中，大分组标题含等级关键字，sidebarGuard 自动隐藏）=====
        {
          text: '🔒 初级',
          collapsed: true,
          items: [
            {
              text: '初级1 · 广告优化实战',
              collapsed: true,
              items: [
                { text: '1.1 搜索词报表与归因窗口', link: '/content/beginner/b1-ads-optimization/01-search-term-attribution' },
                { text: '1.2 否定词池搭建', link: '/content/beginner/b1-ads-optimization/02-negative-keyword-pool' },
                { text: '1.3 分时调价与TOS抢占', link: '/content/beginner/b1-ads-optimization/03-dayparting-tos' },
                { text: '1.4 ACOS压降闭环', link: '/content/beginner/b1-ads-optimization/04-acos-reduction-loop' },
                { text: '1.5 周度优化清单（实操）', link: '/content/beginner/b1-ads-optimization/05-weekly-checklist-practice' },
                { text: '1.6 品牌广告与展示广告（SB/SD）', link: '/content/beginner/b1-ads-optimization/06-sb-sd-ads' },
              ],
            },
            {
              text: '初级2 · Listing持续优化',
              collapsed: true,
              items: [
                { text: '2.1 文案A/B测试', link: '/content/beginner/b2-listing-optimization/01-ab-testing' },
                { text: '2.2 关键词排名监控', link: '/content/beginner/b2-listing-optimization/02-rank-monitoring' },
                { text: '2.3 Search Terms迭代', link: '/content/beginner/b2-listing-optimization/03-search-terms-iteration' },
                { text: '2.4 图片点击率优化', link: '/content/beginner/b2-listing-optimization/04-image-ctr' },
                { text: '2.5 Listing体检（实操）', link: '/content/beginner/b2-listing-optimization/05-listing-audit-practice' },
                { text: '2.6 评论获取与差评管理', link: '/content/beginner/b2-listing-optimization/06-review-management' },
              ],
            },
            {
              text: '初级3 · 库存精细化运营',
              collapsed: true,
              items: [
                { text: '3.1 补货量计算模型', link: '/content/beginner/b3-inventory-advanced/01-replenishment-model' },
                { text: '3.2 备货资金预算', link: '/content/beginner/b3-inventory-advanced/02-stock-budget' },
                { text: '3.3 滞销预警与处理', link: '/content/beginner/b3-inventory-advanced/03-stagnant-inventory' },
                { text: '3.4 补货计划（实操）', link: '/content/beginner/b3-inventory-advanced/04-replenishment-practice' },
              ],
            },
            {
              text: '初级4 · 定价与促销策略',
              collapsed: true,
              items: [
                { text: '4.1 竞品定价跟踪', link: '/content/beginner/b4-pricing-strategy/01-competitor-pricing' },
                { text: '4.2 促销节奏设计', link: '/content/beginner/b4-pricing-strategy/02-promo-rhythm' },
                { text: '4.3 价格弹性测试', link: '/content/beginner/b4-pricing-strategy/03-price-elasticity' },
                { text: '4.4 月度促销表（实操）', link: '/content/beginner/b4-pricing-strategy/04-monthly-promo-plan' },
                { text: '4.5 Buy Box防御与跟卖应对', link: '/content/beginner/b4-pricing-strategy/05-buybox-hijack-defense' },
              ],
            },
          ],
        },
        // ===== 中级（管理员内测中）=====
        {
          text: '🔒 中级',
          collapsed: true,
          items: [
            {
              text: '中级1 · 新品冷启动全流程',
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
              text: '中级2 · 多SKU与产品线管理',
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
              text: '中级3 · 品牌化基础',
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
              text: '中级4 · 数据分析与运营看板',
              collapsed: true,
              items: [
                { text: '4.1 Business Reports深读', link: '/content/intermediate/i4-data-analysis/01-business-reports' },
                { text: '4.2 第三方工具实战', link: '/content/intermediate/i4-data-analysis/02-third-party-tools' },
                { text: '4.3 用数据找增长点', link: '/content/intermediate/i4-data-analysis/03-growth-diagnosis' },
                { text: '4.4 自建运营看板', link: '/content/intermediate/i4-data-analysis/04-dashboard-building' },
              ],
            },
          ],
        },
        // ===== 高级（管理员内测中）=====
        {
          text: '🔒 高级',
          collapsed: true,
          items: [
            {
              text: '高级1 · 品牌保护与长期主义',
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
              text: '高级2 · 多站点全球扩张',
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
              text: '高级3 · 合规深水区与申诉',
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
              text: '高级4 · 高阶广告与流量组合',
              collapsed: true,
              items: [
                { text: '4.1 DSP广告入门', link: '/content/advanced/a4-advanced-ads/01-dsp-ads' },
                { text: '4.2 SD再营销', link: '/content/advanced/a4-advanced-ads/02-sd-retargeting' },
                { text: '4.3 品牌广告组合', link: '/content/advanced/a4-advanced-ads/03-brand-ads-combo' },
                { text: '4.4 全漏斗流量打法设计（实操）', link: '/content/advanced/a4-advanced-ads/04-full-funnel-strategy' },
              ],
            },
          ],
        },
        // ===== 进阶（管理员内测中）=====
        {
          text: '🔒 进阶',
          collapsed: true,
          items: [
            {
              text: '进阶1 · 团队运营与SOP',
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
              text: '进阶2 · 财务与现金流管理',
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
              text: '进阶3 · 战略选品与品类布局',
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
              text: '进阶4 · 风险管理与危机应对',
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
        // ===== 实战手册（独立参考栏目，仅管理员可见，内测中）=====
        // 规则：当前内测阶段，只有 mentor / admin 可访问（见 lib/accessControl.ts 的 isPlaybookPath）。
        // 标题不带 emoji 锁标——锁标由 sidebarGuard.ts 按角色动态加（管理员去锁，其他人加 🔒）。
        // 未来要开放时，改 isPlaybookAccessible 加条件即可。
        {
          text: '广告打法手册',
          collapsed: true,
          items: [
            { text: '手册首页 · 16 种打法总览', link: '/content/playbooks/ads-16-tactics/' },
            { text: '第1节 · 小预算捡漏组合', link: '/content/playbooks/ads-16-tactics/01-low-budget-bargain' },
            { text: '第2节 · ASIN 定位与流量卡位', link: '/content/playbooks/ads-16-tactics/02-asin-targeting' },
            { text: '第3节 · 自动广告精细化', link: '/content/playbooks/ads-16-tactics/03-auto-ads-refinement' },
            { text: '第4节 · 关键词排名冲刺与风险教育 ⚠️', link: '/content/playbooks/ads-16-tactics/04-ranking-push-and-risk' },
            { text: '第5节 · 旺季与综合打法', link: '/content/playbooks/ads-16-tactics/05-peak-season-combo' },
          ],
        },
      ],
    },

    socialLinks: [],
    footer: {
      message: '亚马逊运营训练营 · 边学边实战 · 联系站长：<a href="mailto:yoonhi_@outlook.com" style="color:var(--vp-c-text-2);text-decoration:none">yoonhi_@outlook.com</a>',
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

  /**
   * 防内容闪现（FOUC）：构建时为「游客视角下不可访问」的页面注入一段同步脚本，
   * 在浏览器解析 <body> 之前就给 <html> 加上 .doc-gated，让 CSS 第一帧就把
   * .vp-doc 藏掉。等 CourseGate.vue 完成权限校验后，再决定去 class（放行）
   * 还是保留（拦截卡）。
   *
   * 判定口径与 accessControl.ts 完全一致：用「游客视角」（profile=undefined）
   * 跑一次 isPathAccessible，能放行的页（如首页、入门课、domain-basics）
   * 不注入脚本，避免误伤。
   *
   * 注意：这只能消除「刷新闪现」，不能防住「看源码/curl/禁 CSS」——
   * 内容仍在 SSR HTML 里。要彻底防泄漏需把受保护内容移到后端 API。
   */
  async transformHead(context) {
    // VitePress 1.6 的 TransformContext.page 是 relativePath 字符串（如 'content/beginner/foo.md'）
    const relativePath = typeof context.page === 'string' ? context.page : context.page?.relativePath
    // 非 content 页（首页、dashboard、404 等）一律不处理
    if (!relativePath || !relativePath.startsWith('content/')) return
    const urlPath = toUrlPath(relativePath)
    // 游客视角下能访问的页，无需预隐藏
    if (isPathAccessible(urlPath, undefined, undefined)) return

    // 受保护页：注入同步 inline 脚本，浏览器解析 <head> 时同步执行，
    // 在渲染 <body> 前就给 <html> 加上 doc-gated，CSS 第一帧即隐藏正文。
    // HeadConfig 元组：[tag, attrs, children?]
    return [
      ['script', {}, `document.documentElement.classList.add('doc-gated')`],
    ]
  },

  vite: { server: { host: '127.0.0.1', port: 5173 } },
})
