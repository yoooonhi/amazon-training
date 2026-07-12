import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import ProgressTracker from '../../components/ProgressTracker.vue'
import DailyGate from '../../components/DailyGate.vue'
import LessonCheck from '../../components/LessonCheck.vue'
import SelfTest from '../../components/SelfTest.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // Could inject global slots here if needed
    })
  },
  enhanceApp({ app }) {
    // Register components globally so they can be used in any .md file
    app.component('ProgressTracker', ProgressTracker)
    app.component('DailyGate', DailyGate)
    app.component('LessonCheck', LessonCheck)
    app.component('SelfTest', SelfTest)
  },
} satisfies Theme
