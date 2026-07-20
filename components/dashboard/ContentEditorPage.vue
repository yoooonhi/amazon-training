<script setup>
/**
 * 内容编辑页（方案 2 配套）
 *
 * 功能：
 *   - 左侧列出 course-content bucket 里的 markdown 文件（按目录分组）
 *   - 右侧 textarea 编辑选中文件 + marked 实时预览（分栏）
 *   - 保存：supabase.storage.upload(upsert)，保存前 modalConfirm 二次确认
 *   - 草稿自动存 localStorage（dashboard 不走 URL history，刷新会丢未保存内容）
 *
 * 权限：AdminShell 已校验过管理员身份；Storage RLS 是真正的安全边界。
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useData } from 'vitepress'
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase'
import { modalConfirm, modalAlert } from '../../lib/modal'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { buildSidebarTitleMap } from '../../lib/sidebarTitles'

marked.setOptions({ gfm: true, breaks: false })

// 从 VitePress themeConfig 拿 sidebar，构建 storagePath → 带序号标题 的映射
const { theme } = useData()
const sidebarTitleMap = computed(() => buildSidebarTitleMap(theme.value.sidebar))
function getSidebarTitle(storagePath) {
  return sidebarTitleMap.value.get(storagePath) || null
}

// DOM refs（用于切换文件时右侧滚动复位）
const textareaRef = ref(null)
const previewRef = ref(null)

const BUCKET = 'course-content'

const loading = ref(true)
const busy = ref(false) // 保存中防重复
const files = ref([]) // [{ name, path, prefix, size, title }]
const selectedPath = ref('')
const editContent = ref('')
const originalContent = ref('') // 保存时的原始内容，用于判断是否有改动
const showPreview = ref(true)
const errorMsg = ref('')

// ===== 优化：搜索 + 分组折叠 =====
const searchQuery = ref('')
const collapsedGroups = ref(new Set()) // 折叠的分组 key

// 当前编辑模式：'split' | 'edit' | 'preview'
const editMode = ref('split')

// 草稿状态：哪些文件有未保存的本地草稿（用于左侧列表标识）
const draftPaths = ref(new Set())

// 扫描 localStorage，找出所有有草稿的文件
function refreshDraftPaths() {
  const paths = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('content-draft::')) {
      paths.add(key.slice('content-draft::'.length))
    }
  }
  draftPaths.value = paths
}

// 目录路径 → 中文名称映射（左侧分组标题用）
// 支持嵌套路径：先精确匹配，再按顶层目录匹配
const GROUP_LABELS = {
  // 实战手册（当前只有广告打法手册一套）
  'playbooks': '广告打法手册',
  // 主课程五级（扁平结构：beginner/xxx.md）
  'beginner': '初级课程',
  'intermediate': '中级课程',
  'advanced': '高级课程',
  'expert': '进阶课程',
  // 技能补给站（扁平结构：skills/xxx.md）
  'skills': '技能补给站',
}

/** 从 markdown 文本里提取 frontmatter 的 title 字段 */
function extractTitle(mdText) {
  if (!mdText || !mdText.startsWith('---')) return null
  const end = mdText.indexOf('\n---', 3)
  if (end === -1) return null
  const fm = mdText.slice(3, end)
  const m = fm.match(/^title:\s*(.+)$/m)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}

/** 用 fetch 直接下载（绕开 supabase-js 的 Storage 客户端 bug） */
async function fetchRaw(path) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const headers = { apikey: supabaseAnonKey }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, { headers })
  if (!r.ok) {
    errorMsg.value = `读取失败（HTTP ${r.status}）`
    return ''
  }
  return await r.text()
}

// 列出所有文件（递归扫一层目录），并拉取每个文件的 title
async function loadFileList() {
  loading.value = true
  errorMsg.value = ''
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
  if (error) {
    errorMsg.value = '读取文件列表失败：' + error.message
    loading.value = false
    return
  }
  // 递归展开目录
  const allFiles = []
  async function walk(prefix) {
    const { data: items, error: err } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
    if (err || !items) return
    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.metadata) {
        allFiles.push({
          name: item.name,
          path: fullPath,
          prefix,
          size: item.metadata.size || 0,
          title: '', // 稍后异步填充
        })
      } else {
        await walk(fullPath)
      }
    }
  }
  await walk('')
  allFiles.sort((a, b) => a.path.localeCompare(b.path))
  files.value = allFiles

  // 异步拉每个文件的 title（并行，不阻塞列表显示）
  // 同时：校验已有草稿是否真的有改动（修复之前 bug 写入的"假草稿"）
  // 标题优先级：sidebar 带序号标题 > frontmatter title > 文件名
  await Promise.all(allFiles.map(async (f) => {
    try {
      const md = await fetchRaw(f.path)
      f.title = getSidebarTitle(f.path) || extractTitle(md) || f.name
      // 如果这个文件有草稿，但草稿内容 == 远端内容，说明是假草稿，删掉
      const draft = localStorage.getItem(draftKey(f.path))
      if (draft !== null && draft === md) {
        localStorage.removeItem(draftKey(f.path))
      }
    } catch {
      f.title = getSidebarTitle(f.path) || f.name
    }
  }))
  // 触发响应式更新
  files.value = [...allFiles]
  refreshDraftPaths()
  loading.value = false
}

// 按顶层目录分组（左侧导航用），分组标题用中文
// 顶层目录：beginner / intermediate / advanced / expert / skills / playbooks
// 每组内按 path 排序（子模块会自然聚集）
const GROUP_ORDER = ['beginner', 'intermediate', 'advanced', 'expert', 'skills', 'playbooks']

const groupedFiles = computed(() => {
  const groups = {}
  files.value.forEach((f) => {
    const top = f.path.split('/')[0]
    if (!groups[top]) groups[top] = []
    groups[top].push(f)
  })
  // 按预定顺序排列，未知目录排最后
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a)
    const ib = GROUP_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return keys.map((key) => ({
    key,
    label: GROUP_LABELS[key] || key,
    items: groups[key].sort((a, b) => a.path.localeCompare(b.path)),
  }))
})

// 当前选中文件的中文标题
const selectedTitle = computed(() => {
  const f = files.value.find((x) => x.path === selectedPath.value)
  return f?.title || selectedPath.value
})

// 搜索过滤后的分组（左侧列表显示用）
const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return groupedFiles.value
  return groupedFiles.value
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (f) =>
          (f.title || '').toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q)
      ),
    }))
    .filter((g) => g.items.length > 0)
})

// 分组折叠切换
function toggleGroup(key) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedGroups.value = next
}

function isGroupCollapsed(key) {
  return collapsedGroups.value.has(key)
}

// 判断某文件是否有未保存草稿
function hasDraft(path) {
  return draftPaths.value.has(path)
}

// 当前文件在扁平列表中的位置（用于上一篇/下一篇导航）
const flatFileList = computed(() => groupedFiles.value.flatMap((g) => g.items))
const currentIndex = computed(() =>
  flatFileList.value.findIndex((f) => f.path === selectedPath.value)
)
const prevFile = computed(() =>
  currentIndex.value > 0 ? flatFileList.value[currentIndex.value - 1] : null
)
const nextFile = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < flatFileList.value.length - 1
    ? flatFileList.value[currentIndex.value + 1]
    : null
)

async function goPrev() {
  if (prevFile.value) await selectFile(prevFile.value.path)
}
async function goNext() {
  if (nextFile.value) await selectFile(nextFile.value.path)
}

// 切换编辑模式
function setMode(mode) {
  editMode.value = mode
}

// 监听模式变化，联动 showPreview（兼容旧逻辑）
watch(editMode, (mode) => {
  showPreview.value = mode !== 'edit'
})

// 选中某个文件：拉取内容
async function selectFile(path) {
  if (busy.value) return
  // 若当前有未保存改动，提示
  if (editContent.value !== originalContent.value && originalContent.value !== '') {
    const ok = await modalConfirm(`「${selectedTitle.value}」有未保存的改动，切换会丢失。确定切换吗？`, '切换文件')
    if (!ok) return
  }
  selectedPath.value = path
  errorMsg.value = ''
  // 先尝试从草稿恢复
  const draft = localStorage.getItem(draftKey(path))
  if (draft !== null) {
    editContent.value = draft
    const remote = await fetchRaw(path)
    originalContent.value = remote
    resetRightScroll()
    return
  }
  const remote = await fetchRaw(path)
  editContent.value = remote
  originalContent.value = remote
  resetRightScroll()
}

// 切换文件后：右侧编辑/预览区回顶部（左栏独立滚动，不干预）
async function resetRightScroll() {
  await nextTick()
  if (textareaRef.value) textareaRef.value.scrollTop = 0
  if (previewRef.value) previewRef.value.scrollTop = 0
}

// 草稿 key
function draftKey(path) {
  return `content-draft::${path}`
}

// 内容变化时存草稿（仅当有真实改动时才存，避免把"刚拉取的远端内容"误判为草稿）
watch([editContent, originalContent, selectedPath], () => {
  if (!selectedPath.value) return
  // dirty = editContent 与 originalContent 不一致
  if (editContent.value !== originalContent.value) {
    localStorage.setItem(draftKey(selectedPath.value), editContent.value)
    if (!draftPaths.value.has(selectedPath.value)) {
      draftPaths.value = new Set([...draftPaths.value, selectedPath.value])
    }
  } else {
    // 内容与远端一致（没改动），清除草稿
    localStorage.removeItem(draftKey(selectedPath.value))
    if (draftPaths.value.has(selectedPath.value)) {
      const next = new Set(draftPaths.value)
      next.delete(selectedPath.value)
      draftPaths.value = next
    }
  }
}, { flush: 'post' })

// 是否有未保存改动
const dirty = computed(() => editContent.value !== originalContent.value)

// 差异统计：对比 originalContent 和 editContent 的行级变化
// 返回 { added, removed, addedChars, removedChars }
// - added/removed: 新增/删除的行数（按 LCS 行对比）
// - addedChars/removedChars: 字符级增减（用于 hover 详情）
const diffStats = computed(() => {
  if (!dirty.value) return { added: 0, removed: 0, addedChars: 0, removedChars: 0 }
  const oldLines = originalContent.value.split('\n')
  const newLines = editContent.value.split('\n')
  // 简单 LCS 行级 diff（O(n*m)，课程文档行数不多，性能足够）
  const n = oldLines.length
  const m = newLines.length
  // dp[i][j] = oldLines[0..i) 和 newLines[0..j) 的最长公共子序列长度
  // 为控制内存，行数过多时退化到简单统计
  if (n * m > 2000000) {
    // 行数太多，用集合差近似
    const oldSet = new Map()
    oldLines.forEach((l) => oldSet.set(l, (oldSet.get(l) || 0) + 1))
    let added = 0
    let removed = 0
    const newCount = new Map()
    newLines.forEach((l) => newCount.set(l, (newCount.get(l) || 0) + 1))
    oldLines.forEach((l) => {
      const c = newCount.get(l) || 0
      if (c === 0) removed++
      else newCount.set(l, c - 1)
    })
    added = newLines.length - (n - removed)
    return {
      added: Math.max(0, added),
      removed: Math.max(0, removed),
      addedChars: editContent.value.length - originalContent.value.length,
      removedChars: 0,
    }
  }
  // 正常 LCS
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const common = dp[n][m]
  const removed = n - common
  const added = m - common
  return {
    added,
    removed,
    addedChars: editContent.value.length - originalContent.value.length,
    removedChars: 0,
  }
})

// 徽章文案：+12 -3 这种
const diffBadgeText = computed(() => {
  const s = diffStats.value
  const parts = []
  if (s.added > 0) parts.push(`+${s.added}`)
  if (s.removed > 0) parts.push(`-${s.removed}`)
  return parts.join(' ') || '已改'
})

// hover 详情
const diffBadgeTitle = computed(() => {
  const s = diffStats.value
  const lines = []
  if (s.added > 0) lines.push(`新增 ${s.added} 行`)
  if (s.removed > 0) lines.push(`删除 ${s.removed} 行`)
  const charDelta = editContent.value.length - originalContent.value.length
  if (charDelta !== 0) {
    lines.push(`字符 ${charDelta > 0 ? '+' : ''}${charDelta}`)
  }
  return lines.join(' · ') || '有改动'
})

// 实时预览 HTML
const previewHtml = computed(() => {
  if (!editContent.value) return ''
  // 去 frontmatter 后渲染
  let body = editContent.value
  if (body.startsWith('---')) {
    const end = body.indexOf('\n---', 3)
    if (end !== -1) body = body.slice(end + 4)
  }
  const html = marked.parse(body)
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
})

// 保存（用 fetch PUT 直传 Storage REST API，绕开 supabase-js 客户端 bug）
async function save() {
  if (busy.value) return
  if (!selectedPath.value) return
  if (!dirty.value) {
    await modalAlert('内容没有改动', '保存')
    return
  }
  const ok = await modalConfirm(`确认保存「${selectedTitle.value}」？\n保存后即时生效，学员侧会立即看到新内容。`, '保存内容')
  if (!ok) return
  busy.value = true
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    // PUT 到 /storage/v1/object/{bucket}/{path}，用 upsert=true 覆盖
    const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${selectedPath.value}`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-upsert': 'true',
      },
      body: editContent.value,
    })
    if (!r.ok) {
      const body = await r.text()
      await modalAlert(`保存失败（HTTP ${r.status}）：${body.slice(0, 200)}`, '出错了')
      return
    }
    originalContent.value = editContent.value
    // 更新列表里的 title（以防用户改了 frontmatter 的 title）
    const f = files.value.find((x) => x.path === selectedPath.value)
    if (f) f.title = extractTitle(editContent.value) || f.name
    // 清草稿
    localStorage.removeItem(draftKey(selectedPath.value))
    refreshDraftPaths()
    await modalAlert('已保存，学员侧即时生效', '完成')
  } finally {
    busy.value = false
  }
}

// 放弃改动（恢复到远端版本）
async function discard() {
  if (busy.value) return
  if (!dirty.value) return
  const ok = await modalConfirm(`放弃当前改动，恢复到远端版本？`, '放弃改动')
  if (!ok) return
  const remote = await fetchRaw(selectedPath.value)
  editContent.value = remote
  originalContent.value = remote
  localStorage.removeItem(draftKey(selectedPath.value))
  refreshDraftPaths()
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

function fileName(path) {
  return path.split('/').pop()
}

// 在新标签打开当前课的预览（看学员视角的效果）
function openInNewTab() {
  if (!selectedPath.value) return
  // storagePath → 课程 URL：beginner/b1-.../01-xxx.md → /content/beginner/b1-.../01-xxx
  const urlPath = '/content/' + selectedPath.value.replace(/\.md$/, '').replace(/\/index$/, '/')
  window.open(urlPath, '_blank')
}

// Cmd+S / Ctrl+S 保存快捷键
function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    if (dirty.value && !busy.value) save()
  }
}

onMounted(() => {
  loadFileList()
  refreshDraftPaths()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="content-editor">
    <!-- ===== 左侧：文件列表 ===== -->
    <aside class="ce-sidebar">
      <div class="ce-sidebar-head">
        <h3>课程内容</h3>
        <button class="ce-refresh-btn" @click="loadFileList" :disabled="loading" title="刷新文件列表">↻</button>
      </div>

      <!-- 搜索框 -->
      <div class="ce-search-wrap">
        <input
          v-model="searchQuery"
          class="ce-search"
          placeholder="🔍 搜索课程标题或路径..."
          spellcheck="false"
        />
        <span v-if="searchQuery" class="ce-search-count">{{ filteredGroups.reduce((n, g) => n + g.items.length, 0) }} 篇</span>
      </div>

      <div v-if="loading" class="ce-empty">加载中…</div>
      <div v-else-if="files.length === 0" class="ce-empty">
        暂无文件<br />
        <small>请先执行迁移脚本上传内容</small>
      </div>
      <div v-else-if="filteredGroups.length === 0" class="ce-empty">
        没有匹配的课程<br />
        <small>试试别的关键词</small>
      </div>

      <!-- 分组列表（可折叠） -->
      <div v-else class="ce-file-tree">
        <div v-for="group in filteredGroups" :key="group.key" class="ce-group">
          <button class="ce-group-header" @click="toggleGroup(group.key)">
            <span class="ce-group-arrow" :class="{ collapsed: isGroupCollapsed(group.key) }">▼</span>
            <span class="ce-group-title">{{ group.label }}</span>
            <span class="ce-group-count">{{ group.items.length }}</span>
          </button>
          <div v-show="!isGroupCollapsed(group.key)" class="ce-group-items">
            <button
              v-for="f in group.items"
              :key="f.path"
              class="ce-file-item"
              :class="{ active: f.path === selectedPath, draft: hasDraft(f.path) }"
              @click="selectFile(f.path)"
            >
              <span v-if="hasDraft(f.path)" class="ce-draft-dot" title="有未保存草稿">●</span>
              <span class="ce-file-name">{{ f.title || fileName(f.path) }}</span>
              <span class="ce-file-size">{{ formatSize(f.size) }}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- ===== 右侧：编辑区 ===== -->
    <main class="ce-main">
      <div v-if="errorMsg && !selectedPath" class="ce-error-banner">{{ errorMsg }}</div>
      <div v-else-if="!selectedPath" class="ce-empty-main">
        <div class="ce-empty-icon">📝</div>
        <p>从左侧选择一个文件开始编辑</p>
        <p class="ce-empty-hint">编辑后点「保存」或按 <kbd>⌘S</kbd>，内容即时生效，学员侧无需重新部署</p>
      </div>
      <template v-else>
        <!-- 顶栏：标题 + 路径 + 状态 + 操作 -->
        <div class="ce-toolbar">
          <div class="ce-toolbar-left">
            <button v-if="prevFile" class="ce-nav-btn" @click="goPrev" title="上一篇">‹</button>
            <div class="ce-title-wrap">
              <span class="ce-current-title">{{ selectedTitle }}</span>
              <span class="ce-current-path">{{ selectedPath }}</span>
            </div>
            <button v-if="nextFile" class="ce-nav-btn" @click="goNext" title="下一篇">›</button>
            <span v-if="dirty" class="ce-dirty-badge" :title="diffBadgeTitle">
              未保存 <span class="ce-diff-stats"><span v-if="diffStats.added" class="ce-diff-add">+{{ diffStats.added }}</span><span v-if="diffStats.removed" class="ce-diff-del">-{{ diffStats.removed }}</span></span>
            </span>
            <span v-else-if="originalContent" class="ce-saved-badge">已保存</span>
          </div>
          <div class="ce-toolbar-right">
            <!-- 编辑模式切换 -->
            <div class="ce-mode-switch">
              <button :class="{ active: editMode === 'edit' }" @click="setMode('edit')" title="仅编辑">✏️</button>
              <button :class="{ active: editMode === 'split' }" @click="setMode('split')" title="分屏">⊡</button>
              <button :class="{ active: editMode === 'preview' }" @click="setMode('preview')" title="仅预览">👁</button>
            </div>
            <button class="ce-icon-btn" @click="openInNewTab" title="在新标签预览（学员视角）">↗</button>
            <button class="ce-btn ce-btn-discard" @click="discard" :disabled="!dirty || busy">放弃</button>
            <button class="ce-btn ce-btn-save" @click="save" :disabled="!dirty || busy">
              {{ busy ? '保存中…' : '💾 保存' }}
            </button>
          </div>
        </div>

        <!-- 编辑 + 预览分栏（根据模式切换） -->
        <div class="ce-edit-area" :class="'mode-' + editMode">
          <textarea
            v-show="editMode !== 'preview'"
            ref="textareaRef"
            v-model="editContent"
            class="ce-textarea"
            spellcheck="false"
            placeholder="在此编辑 markdown 内容…"
          ></textarea>
          <div v-show="editMode !== 'edit'" ref="previewRef" class="ce-preview vp-doc">
            <div v-html="previewHtml"></div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';

.content-editor {
  display: flex;
  /* 占满 dashboard 内容区的可用高度（减去 content-scroll 的 padding）
     顶部栏 72px + content-scroll 上下 padding 1.5rem*2 + 底部留白 3rem
     用 vh 兜底，确保两栏各自滚动而不是撑开外层 */
  height: calc(100vh - 72px - 5rem);
  min-height: 480px;
  gap: 1rem;
}

/* 左侧文件列表 */
.ce-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}
.ce-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.ce-sidebar-head h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.ce-refresh-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  line-height: 1;
}
.ce-refresh-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.ce-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ce-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  line-height: 1.8;
}
.ce-file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.5rem 1rem;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
/* WebKit（Chrome/Safari）：隐藏滚动条 */
.ce-file-tree::-webkit-scrollbar {
  display: none;
}
.ce-group {
  margin-bottom: 0.3rem;
}
/* 分组头：可点击折叠 */
.ce-group-header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.4rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-3);
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: 6px;
  gap: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ce-group-header:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}
.ce-group-arrow {
  display: inline-block;
  transition: transform 0.15s;
  font-size: 0.6rem;
  color: var(--vp-c-text-3);
}
/* 展开时 ▼ 朝下（默认）；折叠时旋转 -90° 变成 ▶ 朝右 */
.ce-group-arrow.collapsed {
  transform: rotate(-90deg);
}
.ce-group-title {
  flex: 1;
  text-align: left;
}
.ce-group-count {
  font-size: 0.66rem;
  background: var(--vp-c-bg-alt);
  padding: 0.05rem 0.4rem;
  border-radius: 8px;
  color: var(--vp-c-text-3);
  font-weight: 500;
}
.ce-group-items {
  padding-left: 0.2rem;
}
.ce-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.4rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  text-align: left;
  transition: background 0.12s;
  gap: 0.4rem;
}
.ce-file-item:hover {
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.08));
}
.ce-file-item.active {
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.14));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.ce-file-item.draft .ce-file-name::before {
  /* 草稿文件名左侧不重复加圆点（圆点单独显示） */
}
.ce-draft-dot {
  color: #f59e0b;
  font-size: 0.5rem;
  flex-shrink: 0;
  line-height: 1;
}
.ce-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.ce-file-size {
  font-size: 0.66rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  opacity: 0.7;
}

/* 搜索框 */
.ce-search-wrap {
  position: relative;
  padding: 0.5rem 0.75rem 0.6rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.ce-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}
.ce-search:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft, rgba(99, 102, 241, 0.12));
}
.ce-search-count {
  position: absolute;
  right: 1.1rem;
  top: 50%;
  transform: translateY(-15%);
  font-size: 0.66rem;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

/* 右侧主区 */
.ce-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}
.ce-empty-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  gap: 0.5rem;
}
.ce-empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}
.ce-empty-main p {
  margin: 0;
  font-size: 0.9rem;
}
.ce-empty-hint {
  font-size: 0.78rem !important;
  opacity: 0.7;
}
.ce-error-banner {
  padding: 1rem;
  margin: 1rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
}

/* 顶栏 */
.ce-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 0.75rem;
  flex-shrink: 0;
}
.ce-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}
.ce-title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.ce-current-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.ce-current-path {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.ce-nav-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ce-nav-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.08));
}
.ce-dirty-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  font-weight: 600;
  cursor: help;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
/* 差异统计：绿/红数字 */
.ce-diff-stats {
  display: inline-flex;
  gap: 0.25rem;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-weight: 700;
}
.ce-diff-add {
  color: #16a34a;
}
.ce-diff-del {
  color: #ef4444;
}
.ce-saved-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
  font-weight: 600;
}
.ce-toolbar-right {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  align-items: center;
}
/* 编辑模式切换 */
.ce-mode-switch {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}
.ce-mode-switch button {
  background: transparent;
  border: none;
  padding: 0.35rem 0.55rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--vp-c-text-3);
  line-height: 1;
}
.ce-mode-switch button:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}
.ce-mode-switch button.active {
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.14));
  color: var(--vp-c-brand-1);
}
.ce-mode-switch button + button {
  border-left: 1px solid var(--vp-c-divider);
}
.ce-icon-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ce-icon-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.ce-btn {
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.12s;
}
.ce-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ce-btn-discard {
  background: transparent;
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.ce-btn-discard:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
}
.ce-btn-save {
  background: var(--vp-button-brand-bg, #4f46e5);
  color: #fff;
}
.ce-btn-save:hover:not(:disabled) {
  opacity: 0.9;
}

/* 编辑 + 预览（支持三种模式） */
.ce-edit-area {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
/* split: 左编辑右预览各占一半 */
.ce-edit-area.mode-split .ce-textarea {
  flex: 1;
  width: 50%;
}
.ce-edit-area.mode-split .ce-preview {
  flex: 1;
  width: 50%;
  max-width: none;
}
/* edit: 只有编辑区 */
.ce-edit-area.mode-edit .ce-textarea {
  flex: 1;
}
/* preview: 只有预览区 */
.ce-edit-area.mode-preview .ce-preview {
  flex: 1;
  max-width: none;
  width: 100%;
}
.ce-textarea {
  padding: 1rem 1.25rem;
  border: none;
  outline: none;
  resize: none;
  font-family: 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}
.ce-preview {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.ce-edit-area.mode-edit .ce-preview,
.ce-edit-area.mode-preview .ce-textarea {
  display: none;
}
.ce-edit-area.mode-preview .ce-preview {
  border-left: none;
}
/* 单预览模式时居中限制宽度，更像学员视角 */
.ce-edit-area.mode-preview .ce-preview > div {
  max-width: 760px;
  margin: 0 auto;
}
.ce-preview :deep(h1),
.ce-preview :deep(h2),
.ce-preview :deep(h3) {
  margin-top: 1.5rem;
}
.ce-preview :deep(table) {
  display: table;
  width: 100%;
}
kbd {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.72rem;
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}
</style>
