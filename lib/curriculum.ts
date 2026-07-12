// 7 个模块的课程结构（lessonId 与内容文件实际使用的一致）
export const curriculum = [
  {
    week: 1,
    title: '平台认知与账号安全',
    lessons: [
      'm1-00', 'm1-01-what-is-ops', 'm1-02-account-health',
      'm1-03-violation-notice', 'm1-04-listing-compliance',
      'm1-05-review-compliance', 'm1-06-buyer-messages', 'm1-07-eu-compliance',
    ],
  },
  {
    week: 2,
    title: '选品与采购',
    lessons: [
      'm7-01-why-selection-matters', 'm7-02-demand-analysis', 'm7-03-competition-analysis',
      'm7-04-profit-screening', 'm7-05-sourcing', 'm7-06-selection-practice',
    ],
  },
  {
    week: 3,
    title: 'Listing搭建基本功',
    lessons: [
      'm2-00', 'm2-01', 'm2-02', 'm2-03', 'm2-03b', 'm2-04',
      'm2-05', 'm2-06', 'm2-07', 'm2-08', 'm2-09', 'm2-10',
    ],
  },
  {
    week: 4,
    title: '库存与FBA物流',
    lessons: [
      'm3-01', 'm3-02', 'm3-03', 'm3-04', 'm3-05', 'm3-06', 'm3-07',
    ],
  },
  {
    week: 5,
    title: '广告体系',
    lessons: [
      'm4-01', 'm4-02', 'm4-03', 'm4-04', 'm4-05', 'm4-06',
      'm4-07', 'm4-08', 'm4-09', 'm4-10', 'm4-11',
    ],
  },
  {
    week: 6,
    title: '定价与利润',
    lessons: [
      'm5-01-profit-chain', 'm5-02-vat-commission', 'm5-03-atomic-pricing',
      'm5-04-coupon-deal', 'm5-05-profit-practice',
    ],
  },
  {
    week: 7,
    title: '日常运营与判断力',
    lessons: [
      'm6-01-daily-routine', 'm6-02-priority', 'm6-03-data-trust',
      'm6-04-decision-review', 'm6-05-common-mistakes', 'm6-06-hijack-buybox',
      'm6-07-returns-exceptions',
    ],
  },
]

export const allLessons = curriculum.flatMap(w => w.lessons)
export const totalLessons = allLessons.length
