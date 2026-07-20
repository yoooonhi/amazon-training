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
import { ref, computed, onMounted, watch } from 'vue'
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase'
import { modalConfirm, modalAlert } from '../../lib/modal'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

const BUCKET = 'course-content'

const loading = ref(true)
const busy = ref(false) // 保存中防重复
const files = ref([]) // [{ name, path, prefix, size, title }]
const selectedPath = ref('')
const editContent = ref('')
const originalContent = ref('') // 保存时的原始内容，用于判断是否有改动
const showPreview = ref(true)
const errorMsg = ref('')

// 目录路径 → 中文名称映射（左侧分组标题用）
const GROUP_LABELS = {
  'playbooks/ads-16-tactics': '广告打法手册',
  'playbooks': '实战手册',
  'beginner': '初级课程',
  'intermediate': '中级课程',
  'advanced': '高级课程',
  'expert': '进阶课程',
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
  await Promise.all(allFiles.map(async (f) => {
    try {
      const md = await fetchRaw(f.path)
      f.title = extractTitle(md) || f.name
    } catch {
      f.title = f.name
    }
  }))
  // 触发响应式更新
  files.value = [...allFiles]
  loading.value = false
}

// 按目录分组（左侧导航用），分组标题用中文
const groupedFiles = computed(() => {
  const groups = {}
  files.value.forEach((f) => {
    const parts = f.path.split('/')
    const groupKey = parts.slice(0, -1).join('/') || '（根）'
    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(f)
  })
  return Object.entries(groups).map(([key, items]) => ({
    key,
    label: GROUP_LABELS[key] || key, // 没有映射就用原始路径
    items,
  }))
})

// 当前选中文件的中文标题
const selectedTitle = computed(() => {
  const f = files.value.find((x) => x.path === selectedPath.value)
  return f?.title || selectedPath.value
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
    return
  }
  const remote = await fetchRaw(path)
  editContent.value = remote
  originalContent.value = remote
}

// 草稿 key
function draftKey(path) {
  return `content-draft::${path}`
}

// 内容变化时存草稿
watch(editContent, (val) => {
  if (selectedPath.value) {
    localStorage.setItem(draftKey(selectedPath.value), val)
  }
})

// 是否有未保存改动
const dirty = computed(() => editContent.value !== originalContent.value)

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
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

function fileName(path) {
  return path.split('/').pop()
}

onMounted(loadFileList)
</script>

<template>
  <div class="content-editor">
    <!-- 左侧：文件列表 -->
    <aside class="ce-sidebar">
      <div class="ce-sidebar-head">
        <h3>课程内容</h3>
        <button class="ce-refresh-btn" @click="loadFileList" :disabled="loading" title="刷新文件列表">↻</button>
      </div>
      <div v-if="loading" class="ce-empty">加载中…</div>
      <div v-else-if="files.length === 0" class="ce-empty">
        暂无文件<br />
        <small>请先执行迁移脚本上传内容</small>
      </div>
      <div v-else class="ce-file-tree">
        <div v-for="group in groupedFiles" :key="group.key" class="ce-group">
          <div class="ce-group-title">{{ group.label }}</div>
          <button
            v-for="f in group.items"
            :key="f.path"
            class="ce-file-item"
            :class="{ active: f.path === selectedPath }"
            @click="selectFile(f.path)"
          >
            <span class="ce-file-name">{{ f.title || fileName(f.path) }}</span>
            <span class="ce-file-size">{{ formatSize(f.size) }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- 右侧：编辑区 -->
    <main class="ce-main">
      <div v-if="errorMsg && !selectedPath" class="ce-error-banner">{{ errorMsg }}</div>
      <div v-else-if="!selectedPath" class="ce-empty-main">
        <div class="ce-empty-icon">📝</div>
        <p>从左侧选择一个文件开始编辑</p>
        <p class="ce-empty-hint">编辑后点「保存」，内容即时生效，学员侧无需重新部署</p>
      </div>
      <template v-else>
        <!-- 顶栏：中文标题 + 文件路径（副） + 操作按钮 -->
        <div class="ce-toolbar">
          <div class="ce-toolbar-left">
            <span class="ce-current-title">{{ selectedTitle }}</span>
            <span class="ce-current-path">{{ selectedPath }}</span>
            <span v-if="dirty" class="ce-dirty-badge">未保存</span>
          </div>
          <div class="ce-toolbar-right">
            <button class="ce-toggle-btn" :class="{ active: showPreview }" @click="showPreview = !showPreview">
              {{ showPreview ? '隐藏预览' : '☰ 显示预览' }}
            </button>
            <button class="ce-btn ce-btn-discard" @click="discard" :disabled="!dirty || busy">放弃改动</button>
            <button class="ce-btn ce-btn-save" @click="save" :disabled="!dirty || busy">
              {{ busy ? '保存中…' : '💾 保存' }}
            </button>
          </div>
        </div>

        <!-- 编辑 + 预览分栏 -->
        <div class="ce-edit-area" :class="{ 'no-preview': !showPreview }">
          <textarea
            v-model="editContent"
            class="ce-textarea"
            spellcheck="false"
            placeholder="在此编辑 markdown 内容…"
          ></textarea>
          <div v-if="showPreview" class="ce-preview vp-doc">
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
  height: 100%;
  min-height: 0;
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
  padding: 0.5rem;
}
.ce-group {
  margin-bottom: 0.5rem;
}
.ce-group-title {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  padding: 0.4rem 0.5rem 0.2rem;
  font-weight: 600;
  word-break: break-all;
}
.ce-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.45rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  text-align: left;
  transition: background 0.12s;
  gap: 0.5rem;
}
.ce-file-item:hover {
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.08));
}
.ce-file-item.active {
  background: var(--vp-c-brand-soft, rgba(99, 102, 241, 0.14));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.ce-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ce-file-size {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
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
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 1rem;
  flex-shrink: 0;
}
.ce-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  min-width: 0;
}
.ce-current-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ce-current-path {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ce-dirty-badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  font-weight: 600;
}
.ce-toolbar-right {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.ce-toggle-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.ce-toggle-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.ce-btn {
  padding: 0.35rem 0.9rem;
  border-radius: 6px;
  font-size: 0.8rem;
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

/* 编辑 + 预览 */
.ce-edit-area {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
.ce-edit-area.no-preview .ce-textarea {
  flex: 1;
}
.ce-textarea {
  flex: 1;
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
  width: 50%;
  max-width: 760px;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
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
</style>
