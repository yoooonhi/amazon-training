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
