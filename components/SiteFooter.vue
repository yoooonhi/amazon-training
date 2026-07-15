<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

// 全站课程页底部联系信息（自动注入，无需手动添加到每节课）
const { page } = useData()
// dashboard 页面有自己的 footer，不重复显示
const show = computed(() => !(page.value?.relativePath || '').startsWith('dashboard'))
</script>

<template>
  <div v-if="show" class="site-footer">
    <span>亚马逊运营训练营 · 边学边实战 · 联系站长：<a href="mailto:yoonhi_@outlook.com">yoonhi_@outlook.com</a></span>
  </div>
</template>

<style scoped>
.site-footer {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
.site-footer a {
  color: var(--vp-c-text-2);
  text-decoration: none;
}
.site-footer a:hover {
  color: var(--vp-c-brand-1);
}
</style>
