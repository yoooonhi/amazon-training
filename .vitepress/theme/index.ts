import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import ProgressTracker from '../../components/ProgressTracker.vue'
import DailyGate from '../../components/DailyGate.vue'
import LessonCheck from '../../components/LessonCheck.vue'
import SelfTest from '../../components/SelfTest.vue'
import AuthPanel from '../../components/AuthPanel.vue'
import Comments from '../../components/Comments.vue'
import ProfitCalculator from '../../components/ProfitCalculator.vue'
import ModalDialog from '../../components/ModalDialog.vue'
import { recordVisit } from '../../lib/visitTracker'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(AuthPanel),
      'doc-after': () => h(Comments),
      'layout-bottom': () => h(ModalDialog),
    })
  },
  enhanceApp({ app, router }) {
    app.component('ProgressTracker', ProgressTracker)
    app.component('DailyGate', DailyGate)
    app.component('LessonCheck', LessonCheck)
    app.component('SelfTest', SelfTest)
    app.component('AuthPanel', AuthPanel)
    app.component('ProfitCalculator', ProfitCalculator)

    // 网站访问埋点：首次加载记一次 + SPA 路由切换时按 24h 合并规则记录
    // onAfterRouteChanged 在每次页面切换时触发，但 recordVisit 内部会判断
    // 距上次记录是否满 24h，不满则跳过，实现"刷新/跳转不算新访问"
    if (router) {
      router.onAfterRouteChanged = () => {
        recordVisit()
      }
    }
    // 首次进入记一次（onAfterRouteChanged 不会在首次加载时触发）
    recordVisit()
  },
} satisfies Theme
