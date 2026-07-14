---
layout: doc
title: 导师后台
---

<style>
/* 导师后台页面占 80% 宽度并居中，突破 VitePress 默认内容区限制 */
.VPDoc.has-aside .content-container {
  max-width: 80% !important;
  margin: 0 auto !important;
}
.VPDoc .container,
.VPDoc .container .content {
  max-width: 100% !important;
}
/* 隐藏右侧大纲栏，避免压缩主内容区 */
.VPDoc.has-aside > .container > .aside {
  display: none !important;
}
</style>

<script setup>
import MentorDashboard from './components/MentorDashboard.vue'
</script>

<MentorDashboard />
