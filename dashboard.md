---
layout: doc
title: 管理员后台
---

<style>
/* 管理员后台页面占 80% 宽度并居中，突破 VitePress 默认内容区限制。
   关键：所有规则必须限定在 .vp-doc._dashboard 下（VitePress 给每个页面
   加路径名 class，dashboard 页 → _dashboard），否则会全局生效、
   把所有课程页的右侧栏和内容宽度也改掉。
   用 .VPDoc 前缀提权，覆盖 VitePress 的 scoped max-width:688px。 */

/* 撑开外层，让正文有足够空间 */
.VPDoc:has(.vp-doc._dashboard) .container,
.VPDoc:has(.vp-doc._dashboard) .container .content {
  max-width: 100% !important;
}
/* dashboard 正文区 80% 居中 */
.VPDoc:has(.vp-doc._dashboard) .content-container {
  max-width: 80% !important;
  margin: 0 auto !important;
}
</style>

<script setup>
import MentorDashboard from './components/MentorDashboard.vue'
import { onMounted } from 'vue'
// dashboard 页面：隐藏右侧大纲栏，让内容居中显示（用 JS 限定在本页执行，不泄漏到全局）
onMounted(() => {
  const aside = document.querySelector('.VPDoc > .container > .aside')
  if (aside) aside.style.display = 'none'
})
</script>

<MentorDashboard />
