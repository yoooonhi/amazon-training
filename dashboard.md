---
layout: doc
title: 导师后台
---

<style>
/* 导师后台页面撑满全宽，逐层突破 VitePress 默认内容区限制 */
.VPDoc.has-aside .content-container {
  max-width: 100% !important;
}
.VPDoc .container,
.VPDoc .container .content,
.VPDoc.has-aside .content-container,
.VPDoc .doc-content-container {
  max-width: 100% !important;
  width: 100% !important;
}
/* 去掉左右aside的留白，内容贴满 */
.VPDoc.has-aside > .container > .aside {
  display: none !important;
}
.VPDoc.has-aside > .container > .content {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>

<script setup>
import MentorDashboard from './components/MentorDashboard.vue'
</script>

<MentorDashboard />
