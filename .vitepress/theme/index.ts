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
import CourseGate from '../../components/CourseGate.vue'
import PortfolioHealthCheck from '../../components/PortfolioHealthCheck.vue'
import ReplenishmentCalculator from '../../components/ReplenishmentCalculator.vue'
import { recordVisit, recordLastLesson } from '../../lib/visitTracker'
import { setupSidebarGuard } from '../../lib/sidebarGuard'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(AuthPanel),
      'doc-before': () => h(CourseGate),
      'doc-after': () => [h(Comments)],
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
    app.component('PortfolioHealthCheck', PortfolioHealthCheck)
    app.component('ReplenishmentCalculator', ReplenishmentCalculator)

    // 网站访问埋点：首次加载记一次 + SPA 路由切换时按 24h 合并规则记录
    // onAfterRouteChanged 在每次页面切换时触发，但 recordVisit 内部会判断
    // 距上次记录是否满 24h，不满则跳过，实现"刷新/跳转不算新访问"
    if (router) {
      router.onAfterRouteChanged = () => {
        recordVisit()
        // 记录用户最后学习的课程位置（仅课程页才记）
        recordLastLesson()
        // 路由切换后重新检查侧边栏可见性（角色可能已变）
        setupSidebarGuard()
      }
    }
    // 首次进入记一次（onAfterRouteChanged 不会在首次加载时触发）
    recordVisit()
    recordLastLesson()
    // 侧边栏权限守卫：非管理员隐藏受保护等级的侧边栏分组
    setupSidebarGuard()

    // 底部栏交互：滚到接近底部时，侧边栏淡出、footer 横跨全宽滑入（如飞书效果）
    if (typeof window !== 'undefined') {
      let scrollTimer: number | undefined
      const checkBottom = () => {
        const scrollY = window.scrollY + window.innerHeight
        const docHeight = document.documentElement.scrollHeight
        // 距底部小于 120px 时触发（footer 约 89px + 一点提前量）
        const atBottom = scrollY >= docHeight - 120
        document.documentElement.classList.toggle('at-bottom', atBottom)
      }
      window.addEventListener('scroll', () => {
        if (scrollTimer) cancelAnimationFrame(scrollTimer)
        scrollTimer = requestAnimationFrame(checkBottom)
      }, { passive: true })
      // 页面加载和路由切换后也要检查（短页面可能一开始就在底部）
      setTimeout(checkBottom, 500)
      if (router) {
        router.onAfterRouteChanged = () => {
          // 路由切换后重置并重新检查
          document.documentElement.classList.remove('at-bottom')
          setTimeout(checkBottom, 300)
        }
      }
    }
  },
} satisfies Theme
