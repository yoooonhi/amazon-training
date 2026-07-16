---
layout: doc
title: 导师后台
---

<style>
/* 导师后台页面占满宽度，突破 VitePress 默认内容区限制。
   关键：所有规则必须限定在 .vp-doc._dashboard 下，否则会全局生效、
   把所有课程页的右侧栏和内容宽度也改掉（曾因此导致课程页右侧栏消失）。
   VitePress 给每个页面加路径名 class（dashboard 页 → _dashboard）。 */

/* dashboard 正文区撑满 */
.vp-doc._dashboard {
  max-width: 100% !important;
}
/* dashboard 的 content-container 也撑满 */
.vPDoc._dashboard .content-container,
.vp-doc._dashboard .content-container {
  max-width: 100% !important;
}
/* dashboard 页面隐藏右侧大纲栏：用 JS 在下方处理更可靠，
   这里用限定 class 的方式避免影响其他页面 */
</style>

<script setup>
import MentorDashboard from './components/MentorDashboard.vue'
import { onMounted } from 'vue'
// dashboard 页面：隐藏右侧 aside，让自定义组件全宽显示
onMounted(() => {
  const aside = document.querySelector('.VPDoc > .container > .aside')
  if (aside) aside.style.display = 'none'
})
</script>

<MentorDashboard />
