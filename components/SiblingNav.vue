<script setup>
/**
 * 右侧「本模块课程」导航
 *
 * 在课程页右侧大纲上方，显示当前课所属模块的兄弟课列表。
 * 点击可直接跳转到同模块的其他课，不用切回左侧栏。
 *
 * 数据来源：VitePress 运行时的 theme.sidebar 配置（与左侧栏同源，零冗余）。
 * 原理：sidebar 是三级嵌套（大分组 → 模块 → 课程项），
 *   遍历找到「包含当前路径的模块」，渲染该模块下所有课程项。
 */
import { computed } from 'vue'
import { useData } from 'vitepress'

const { theme, page } = useData()

// 当前页面路径（标准化：去尾部斜杠，确保和 sidebar link 格式一致）
const currentPath = computed(() => {
  let p = page.value.relativePath || ''
  // relativePath 形如 content/beginner/b1-ads-optimization/04-acos-reduction-loop.md
  // sidebar link 形如 /content/beginner/b1-ads-optimization/04-acos-reduction-loop
  return '/' + p.replace(/\.md$/, '').replace(/\/index$/, '/')
})

// 递归找：包含当前路径的那个「模块」节点（有 items 且子项含 link 的）
function findCurrentModule(items) {
  for (const item of items) {
    if (item.items) {
      // 检查这个节点的子项里，有没有直接匹配当前路径的
      const hasMatch = item.items.some(
        (child) => child.link && pathMatches(child.link, currentPath.value)
      )
      if (hasMatch) return item
      // 否则递归往下找
      const deeper = findCurrentModule(item.items)
      if (deeper) return deeper
    }
  }
  return null
}

// 路径匹配（去尾部斜杠后比较）
function pathMatches(link, path) {
  if (!link) return false
  return link.replace(/\/+$/, '') === path.replace(/\/+$/, '')
}

// 当前模块 + 兄弟课列表
const currentModule = computed(() => {
  const sidebarConfig = theme.value.sidebar
  // sidebar 可能是数组或对象（带路径前缀的对象）
  let groups = []
  if (Array.isArray(sidebarConfig)) {
    groups = sidebarConfig
  } else if (sidebarConfig && typeof sidebarConfig === 'object') {
    // 取第一个路径前缀下的数组（本项目是 { '/content/': [...] }）
    const keys = Object.keys(sidebarConfig)
    for (const k of keys) {
      if (Array.isArray(sidebarConfig[k])) {
        groups = sidebarConfig[k]
        break
      }
    }
  }
  return findCurrentModule(groups)
})

// 兄弟课（过滤掉没有 link 的项，如纯分组标题）
const siblings = computed(() => {
  if (!currentModule.value?.items) return []
  return currentModule.value.items.filter((item) => item.link)
})

// 当前课的 link（高亮用）
function isActive(link) {
  return link && pathMatches(link, currentPath.value)
}
</script>

<template>
  <div v-if="siblings.length > 0" class="sibling-nav">
    <div class="sibling-title">{{ currentModule.text }}</div>
    <ul class="sibling-list">
      <li v-for="lesson in siblings" :key="lesson.link">
        <a
          :href="lesson.link"
          class="sibling-link"
          :class="{ active: isActive(lesson.link) }"
        >{{ lesson.text }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sibling-nav {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.sibling-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.6rem;
  line-height: 1.4;
}
.sibling-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.sibling-link {
  display: block;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  text-decoration: none;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border-left: 2px solid transparent;
  transition: all 0.15s;
}
.sibling-link:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}
.sibling-link.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  border-left-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.06));
}
</style>
