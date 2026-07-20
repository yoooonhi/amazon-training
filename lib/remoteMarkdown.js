/**
 * 远程 markdown 渲染工具
 *
 * 用途：把从 Supabase Storage 拉下来的课程 markdown 解析成 HTML，
 *      并抽取其中嵌入的 Vue 组件标签（<LessonCheck>/<SelfTest>/<ZoomableImage>），
 *      让 RemoteLesson.vue 用动态组件挂载它们（保留交互）。
 *
 * 为什么不用 marked 直接渲染组件标签？
 *   marked 会把 <LessonCheck :items="..."> 当成普通 HTML 输出，:items 这种
 *   Vue 指令语法不会被浏览器执行，组件就是个空壳。所以我们要：
 *     1. marked 渲染前，先把这些标签从 markdown 里「抠出来」换成占位符
 *     2. 记下每个占位符对应的组件名 + props
 *     3. RemoteLesson.vue 渲染完 HTML 后，用 Vue 动态组件把占位符替换回来
 *
 * Props 解析：
 *   - lessonId="pb-ads-01"        → 字符串（双引号字面量）
 *   - :items="[ 'a', 'b' ]"       → JSON5 解析（支持单引号、无引号 key、尾随逗号）
 *   - max-width="1100px"          → 字符串（kebab-case 静态属性）
 */

import { marked } from 'marked'
import DOMPurify from 'dompurify'
import JSON5 from 'json5'

// 支持的组件名（须与 theme/index.ts 全局注册的一致）
const COMPONENT_NAMES = ['LessonCheck', 'SelfTest', 'ZoomableImage', 'ProfitCalculator', 'ReplenishmentCalculator', 'PortfolioHealthCheck']

/**
 * 抽取 markdown 里的 Vue 组件标签，替换为占位符 div。
 *
 * 匹配形如：
 *   <LessonCheck lessonId="x" :items="[...]" />
 *   <SelfTest lessonId="x" :questions="[
 *     { q: '...', answer: 1 }
 *   ]" />
 *
 * 注意：props 值里可能含引号、换行、}、> 等字符（尤其 questions 的多行 JSON），
 *      用正则匹配属性段时要贪婪到 "/>" 之前。
 *
 * @param {string} md 原始 markdown
 * @returns {{ md: string, components: Array<{placeholder: string, name: string, props: object}> }}
 */
function extractComponents(md) {
  const components = []
  let counter = 0

  // 构造组件名联合正则：LessonCheck|SelfTest|...
  const namePattern = COMPONENT_NAMES.join('|')
  // 匹配 <CompName ...属性... />（自闭合）
  // 属性段用 [\s\S]*? 非贪婪，直到遇到 />
  const tagRegex = new RegExp(
    `<(${namePattern})\\b([\\s\\S]*?)\\s*/>`,
    'g'
  )

  const processed = md.replace(tagRegex, (full, name, attrsRaw) => {
    const props = parseAttrs(attrsRaw)
    const placeholder = `__REMOTE_COMPONENT_${counter}__`
    components.push({ placeholder, name, props })
    counter++
    // 用一个带 data 属性的 div 作为占位符，方便后续定位
    return `<div data-remote-component="${placeholder}"></div>`
  })

  return { md: processed, components }
}

/**
 * 解析属性字符串为 props 对象。
 *
 * 形如：' lessonId="pb-ads-01" :items="[ 'a', 'b' ]" max-width="1100px"'
 * 规则：
 *   - :xxx="yyy" → 动态绑定，yyy 用 JSON5 解析
 *   - xxx="yyy"  → 静态字符串
 *   - xxx        → 布尔 true（无值，如 <Comp readonly />）
 *
 * 难点：属性值里可能含双引号（如 questions JSON 里用单引号字符串还好，
 *      但 marked/markdown 里偶尔会有转义）。我们用状态机扫描，而不是正则切分。
 */
export function parseAttrs(attrsRaw) {
  const props = {}
  const s = attrsRaw.trim()
  if (!s) return props

  let i = 0
  while (i < s.length) {
    // 跳过空白
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break

    // 读属性名（支持 : 前缀、kebab-case）
    let dynamic = false
    if (s[i] === ':') {
      dynamic = true
      i++
    }
    let name = ''
    while (i < s.length && /[a-zA-Z0-9-_]/.test(s[i])) {
      name += s[i]
      i++
    }
    if (!name) {
      i++ // 跳过无法识别的字符，避免死循环
      continue
    }

    // 跳过空白
    while (i < s.length && /\s/.test(s[i])) i++

    // 无值 → 布尔 true
    if (i >= s.length || s[i] !== '=') {
      props[camelCase(name)] = true
      continue
    }

    // 有值，跳过 '='
    i++
    while (i < s.length && /\s/.test(s[i])) i++

    // 取引号内的值（支持 " 和 '）
    const quote = s[i]
    if (quote !== '"' && quote !== "'") {
      // 没引号，读到下一个空白
      let val = ''
      while (i < s.length && !/\s/.test(s[i])) {
        val += s[i]
        i++
      }
      props[camelCase(name)] = dynamic ? safeJSON5(val) : val
      continue
    }
    i++ // 跳过开头引号

    // 读值，支持嵌套引号（用括号/方括号深度判断）
    // 简单方案：因为动态值都是 [ ... ] 或 { ... } 开头，且用引号包裹整段，
    //           我们用括号配平找到真正的结束引号
    let val = ''
    if (dynamic && (s[i] === '[' || s[i] === '{')) {
      // 括号配平
      const open = s[i]
      const close = open === '[' ? ']' : '}'
      let depth = 0
      while (i < s.length) {
        const ch = s[i]
        if (ch === open) depth++
        else if (ch === close) depth--
        val += ch
        i++
        if (depth === 0) break
      }
      // 跳过可能的空白和结束引号
      while (i < s.length && /\s/.test(s[i])) i++
      if (s[i] === quote) i++
      props[camelCase(name)] = safeJSON5(val)
    } else {
      // 普通字符串值，读到对应引号
      while (i < s.length && s[i] !== quote) {
        val += s[i]
        i++
      }
      if (s[i] === quote) i++
      props[camelCase(name)] = dynamic ? safeJSON5(val) : val
    }
  }
  return props
}

/** kebab-case → camelCase（max-width → maxWidth）。非 kebab 的原样返回。 */
function camelCase(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/** 安全解析 JSON5，失败时返回原始字符串（降级，避免整个渲染崩） */
function safeJSON5(expr) {
  try {
    return JSON5.parse(expr)
  } catch {
    return expr
  }
}

/**
 * 主入口：把课程 markdown 渲染成 HTML（含占位符），并返回组件清单。
 *
 * @param {string} mdText 原始 markdown（含 frontmatter 会被去掉）
 * @returns {{ html: string, components: Array<{placeholder: string, name: string, props: object}> }}
 */
export function renderMarkdownWithComponents(mdText) {
  // 1. 去掉 frontmatter（Storage 里的 md 是完整版，含 frontmatter）
  let body = mdText
  if (body.startsWith('---')) {
    const end = body.indexOf('\n---', 3)
    if (end !== -1) {
      body = body.slice(end + 4)
    }
  }

  // 2. 抽取 Vue 组件标签 → 占位符
  const { md: mdWithoutComponents, components } = extractComponents(body)

  // 3. marked 渲染（GFM 表格、代码块等）
  marked.setOptions({ gfm: true, breaks: false })
  let html = marked.parse(mdWithoutComponents)

  // 4. DOMPurify 清洗（防 XSS；允许普通 HTML 标签）
  //    注意：占位符 div 带 data-remote-component 属性，要加到 ALLOWED_ATTR
  if (typeof window !== 'undefined') {
    html = DOMPurify.sanitize(html, {
      ADD_ATTR: ['data-remote-component', 'target'],
    })
  }

  return { html, components }
}

/**
 * 列出 HTML 中所有占位符的位置（供 RemoteLesson.vue 定位挂载点）。
 * 返回 NodeList（在浏览器环境）。
 */
export function findComponentPlaceholders(rootEl) {
  if (!rootEl) return []
  return Array.from(rootEl.querySelectorAll('[data-remote-component]'))
}
