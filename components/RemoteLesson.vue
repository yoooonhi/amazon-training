<script setup>
/**
 * RemoteLesson —— 远程课程内容渲染组件（方案 2 核心）
 *
 * 职责：
 *   1. 从 Supabase Storage 拉取课程 markdown（受 RLS 保护，无权直接 403）
 *   2. 用 marked + 组件抽取，渲染成 HTML 片段
 *   3. 把抽取出的 Vue 组件（LessonCheck/SelfTest/...）按原位置穿插渲染
 *
 * 用法（在壳 .md 里）：
 *   <ClientOnly><RemoteLesson storage_path="playbooks/ads-16-tactics/01-xxx.md" /></ClientOnly>
 *
 * 渲染策略：
 *   renderMarkdownWithComponents 把 markdown 切成有序片段序列 ——
 *   markdown 文本片段（marked 渲染成 HTML）和组件节点（保留 name+props）。
 *   模板按顺序 v-for 渲染：markdown 片段用 v-html，组件用 <component :is>。
 *   这样组件作为当前 Vue 树的一部分，内部的 supabase/authState/插槽都正常工作。
 *
 * 状态机：loading → { error | rendered }
 *   注意：本组件只在客户端运行（壳用 <ClientOnly> 包裹），SSR 阶段不输出任何内容，
 *        因此正文永远不会进 SSR HTML —— 这是方案 2 防泄漏的关键。
 */
import { ref, onMounted, computed } from 'vue'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import LessonCheck from './LessonCheck.vue'
import SelfTest from './SelfTest.vue'
import ZoomableImage from './ZoomableImage.vue'
import ProfitCalculator from './ProfitCalculator.vue'
import ReplenishmentCalculator from './ReplenishmentCalculator.vue'
import PortfolioHealthCheck from './PortfolioHealthCheck.vue'
import { parseAttrs } from '../lib/remoteMarkdown'

const props = defineProps({
  storagePath: { type: String, required: true },
})

const loading = ref(true)
const errorMsg = ref('')
// 有序片段序列：{ type: 'html', html } | { type: 'component', name, props }
const segments = ref([])

const componentMap = {
  LessonCheck,
  SelfTest,
  ZoomableImage,
  ProfitCalculator,
  ReplenishmentCalculator,
  PortfolioHealthCheck,
}

/**
 * 把 markdown 切成有序片段：在 Vue 组件标签处断开。
 * 与 remoteMarkdown.js 的 extractComponents 不同 —— 那版是替换成占位符，
 * 这版保留片段顺序，让模板能 v-for 交错渲染 markdown 和组件。
 *
 * 实现思路：正则匹配组件标签，记录每个匹配的起止位置，
 *           按位置把 markdown 切成 [文本段, 组件, 文本段, 组件, ...]。
 */
function splitMarkdownSegments(mdText, namePattern) {
  const tagRegex = new RegExp(
    `(${namePattern})\\b([\\s\\S]*?)\\s*/>`,
    'g'
  )
  const segs = []
  let lastEnd = 0
  let m
  while ((m = tagRegex.exec(mdText)) !== null) {
    // 前面的文本段（含 '<' 开头的那一半标签 —— 因为正则没消费它）
    const fullMatch = m[0]
    const matchStart = m.index
    // 从 lastEnd 到 matchStart 之间是纯 markdown 文本
    const before = mdText.slice(lastEnd, matchStart)
    if (before.trim()) {
      segs.push({ type: 'html', md: before })
    }
    // 组件段
    segs.push({
      type: 'component',
      name: m[1],
      props: parseAttrs(m[2]),
    })
    lastEnd = matchStart + fullMatch.length
  }
  // 尾部文本
  const tail = mdText.slice(lastEnd)
  if (tail.trim()) {
    segs.push({ type: 'html', md: tail })
  }
  return segs
}

/** 渲染纯 markdown 文本片段为清洗后的 HTML */
function renderMd(mdText) {
  marked.setOptions({ gfm: true, breaks: false })
  let html = marked.parse(mdText)
  if (typeof window !== 'undefined') {
    html = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
  }
  return html
}

/** 去 frontmatter（Storage 里的 md 是完整版，含 frontmatter） */
function stripFrontmatter(mdText) {
  if (mdText.startsWith('---')) {
    const end = mdText.indexOf('\n---', 3)
    if (end !== -1) return mdText.slice(end + 4)
  }
  return mdText
}

async function loadAndRender() {
  loading.value = true
  errorMsg.value = ''

  // 确保登录态恢复（页面刷新后 supabase-js 异步从 localStorage 读 token）
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token || null

  // 直接 fetch Storage REST API，绕开 supabase-js 的 Storage 客户端
  // （某些 supabase-js 版本在浏览器 + VitePress 打包下，download() 的
  //   _getFinalPath 会抛 undefined.replace。直接 fetch 更可靠。）
  const url = `${supabaseUrl}/storage/v1/object/course-content/${props.storagePath}`

  let resp
  try {
    const headers = { apikey: supabaseAnonKey }
    if (accessToken) headers.authorization = `Bearer ${accessToken}`
    resp = await fetch(url, { headers })
  } catch (e) {
    errorMsg.value = '网络请求失败：' + e.message
    console.error('[RemoteLesson] fetch 失败:', e)
    loading.value = false
    return
  }

  if (!resp.ok) {
    // 403/404 都归为「无法加载」（RLS 拒绝时不区分文件是否存在）
    const status = resp.status
    console.error('[RemoteLesson] HTTP 失败:', { status, path: props.storagePath })
    if (status === 401 || status === 403) {
      errorMsg.value = '无访问权限'
    } else if (status === 404) {
      errorMsg.value = '无法加载课程内容（可能无权限或内容未上传）'
    } else {
      errorMsg.value = `加载失败（HTTP ${status}）`
    }
    loading.value = false
    return
  }

  let mdText
  try {
    mdText = stripFrontmatter(await resp.text())
  } catch (e) {
    errorMsg.value = '内容解析失败：' + e.message
    console.error('[RemoteLesson] text() 失败:', e)
    loading.value = false
    return
  }

  const namePattern = Object.keys(componentMap).join('|')
  const rawSegs = splitMarkdownSegments(mdText, namePattern)

  segments.value = rawSegs.map((s) =>
    s.type === 'html' ? { type: 'html', html: renderMd(s.md) } : s
  )
  loading.value = false
}

onMounted(loadAndRender)
</script>

<template>
  <div class="remote-lesson">
    <div v-if="loading" class="remote-loading">
      <div class="remote-loading-dot"></div>
      <p>正在加载课程内容…</p>
    </div>
    <div v-else-if="errorMsg" class="remote-error">
      <p>{{ errorMsg }}</p>
    </div>
    <div v-else class="remote-lesson-content vp-doc">
      <template v-for="(seg, i) in segments" :key="i">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="seg.type === 'html'" v-html="seg.html"></div>
        <component
          v-else
          :is="componentMap[seg.name]"
          v-bind="seg.props"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.remote-loading,
.remote-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
  color: var(--vp-c-text-2);
  gap: 0.75rem;
}
.remote-loading p,
.remote-error p {
  margin: 0;
  font-size: 0.9rem;
}
.remote-loading-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  animation: remote-pulse 1s ease-in-out infinite;
}
@keyframes remote-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.15); }
}

/* 正文容器复用 VitePress 的 .vp-doc 样式（标题/表格/代码块等）
   class="vp-doc" 已在 template 加，让子元素继承 VitePress 的正文样式 */
.remote-lesson-content {
  color: var(--vp-c-text-1);
}
</style>
