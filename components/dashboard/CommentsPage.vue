<script setup>
/**
 * 评论管理页
 * 迁移自 MentorDashboard：评论列表 + 4维筛选 + 置顶/精选/删除 + 课程热度排行
 */
import { ref, computed, reactive, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { getLessonLabel } from '../../lib/curriculum'
import { modalConfirm, modalAlert } from '../../lib/modal'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

const loading = ref(true)
const allComments = ref([])

const cmFilter = reactive({ lesson: 'all', status: 'all', type: 'all', time: 'all' })
function resetCmFilter() {
  cmFilter.lesson = 'all'; cmFilter.status = 'all'; cmFilter.type = 'all'; cmFilter.time = 'all'
}

async function loadData() {
  loading.value = true
  const { data: rawComments } = await supabase
    .from('comments')
    .select('id, lesson_id, user_id, parent_id, content, is_pinned, is_featured, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  const list = rawComments || []
  const userIds = [...new Set(list.map((c) => c.user_id))]
  const profileMap = {}
  if (userIds.length) {
    const { data: cp } = await supabase.from('profiles').select('id, nickname, role').in('id', userIds)
    ;(cp || []).forEach((p) => (profileMap[p.id] = p))
  }
  const ids = list.map((c) => c.id)
  const likeMap = {}
  if (ids.length) {
    const { data: cl } = await supabase.from('comment_likes').select('comment_id').in('comment_id', ids)
    ;(cl || []).forEach((l) => (likeMap[l.comment_id] = (likeMap[l.comment_id] || 0) + 1))
  }
  const commentById = {}
  list.forEach((c) => (commentById[c.id] = c))
  allComments.value = list.map((c) => {
    const p = profileMap[c.user_id] || {}
    const parent = c.parent_id ? commentById[c.parent_id] : null
    return {
      ...c,
      authorName: p.nickname || '同学',
      authorRole: p.role || null,
      likeCount: likeMap[c.id] || 0,
      lessonLabel: lessonTitle(c.lesson_id),
      parentAuthor: parent ? (profileMap[parent.user_id]?.nickname || '同学') : null,
    }
  })
  loading.value = false
}

// lessonId → 可读标签（课序号 + 课名）
function lessonTitle(id) {
  return getLessonLabel(id)
}

const commentLessons = computed(() => {
  const map = {}
  allComments.value.forEach((c) => { if (!map[c.lesson_id]) map[c.lesson_id] = c.lessonLabel })
  return Object.entries(map).map(([id, label]) => ({ id, label }))
})

// 课程热度排行
const hotLessons = computed(() => {
  const map = {}
  allComments.value.forEach((c) => {
    if (!map[c.lesson_id]) map[c.lesson_id] = { label: c.lessonLabel, count: 0 }
    map[c.lesson_id].count++
  })
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8)
})

const filteredComments = computed(() => {
  return allComments.value
    .filter((c) => cmFilter.lesson === 'all' || c.lesson_id === cmFilter.lesson)
    .filter((c) => {
      if (cmFilter.status === 'pinned') return c.is_pinned
      if (cmFilter.status === 'featured') return c.is_featured
      if (cmFilter.status === 'normal') return !c.is_pinned && !c.is_featured
      return true
    })
    .filter((c) => {
      if (cmFilter.type === 'main') return !c.parent_id
      if (cmFilter.type === 'reply') return !!c.parent_id
      return true
    })
    .filter((c) => {
      if (cmFilter.time === 'today') {
        const d = new Date(c.created_at); const now = new Date()
        return d.toDateString() === now.toDateString()
      }
      if (cmFilter.time === 'week') return (Date.now() - new Date(c.created_at).getTime()) < 7 * 86400000
      return true
    })
})

async function cmDelete(comment) {
  const ok = await modalConfirm('其下的回复也会一并删除，确定吗？', '删除评论')
  if (!ok) return
  const { error } = await supabase.from('comments').delete().eq('id', comment.id)
  if (error) { await modalAlert('删除失败：' + error.message, '出错了'); return }
  allComments.value = allComments.value.filter((c) => c.id !== comment.id && c.parent_id !== comment.id)
}
async function cmTogglePinned(comment) {
  const { error } = await supabase.from('comments').update({ is_pinned: !comment.is_pinned }).eq('id', comment.id)
  if (error) { await modalAlert('操作失败：' + error.message, '出错了'); return }
  comment.is_pinned = !comment.is_pinned
}
async function cmToggleFeatured(comment) {
  const { error } = await supabase.from('comments').update({ is_featured: !comment.is_featured }).eq('id', comment.id)
  if (error) { await modalAlert('操作失败：' + error.message, '出错了'); return }
  comment.is_featured = !comment.is_featured
}

function renderCommentMd(md) {
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'del', 'hr', 'span'],
    ALLOWED_ATTR: ['href', 'title'],
  })
}
function commentTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
function isAdminAuthor(c) { return c.authorRole === 'mentor' || c.authorRole === 'admin' }

onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading-box">加载评论数据中...</div>
  <div v-else>
    <!-- 课程热度 -->
    <div class="data-section">
      <h3 class="section-title">🔥 讨论最热的课程 Top 8</h3>
      <div v-if="hotLessons.length === 0" class="empty-hint">暂无评论</div>
      <div v-else class="hot-list">
        <div v-for="(l, i) in hotLessons" :key="i" class="hot-item">
          <span class="hot-rank">{{ i + 1 }}</span>
          <span class="hot-name">{{ l.label }}</span>
          <span class="hot-count">{{ l.count }} 条</span>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="cm-filters">
      <select v-model="cmFilter.lesson" class="cm-select">
        <option value="all">全部课程</option>
        <option v-for="l in commentLessons" :key="l.id" :value="l.id">{{ l.label }}</option>
      </select>
      <select v-model="cmFilter.status" class="cm-select">
        <option value="all">全部状态</option>
        <option value="pinned">📌 已置顶</option>
        <option value="featured">⭐ 已加精</option>
        <option value="normal">普通</option>
      </select>
      <select v-model="cmFilter.type" class="cm-select">
        <option value="all">全部类型</option>
        <option value="main">主评论</option>
        <option value="reply">回复</option>
      </select>
      <select v-model="cmFilter.time" class="cm-select">
        <option value="all">全部时间</option>
        <option value="today">今日</option>
        <option value="week">近 7 天</option>
      </select>
      <button class="cm-reset" @click="resetCmFilter">重置</button>
    </div>

    <!-- 评论列表 -->
    <div v-if="filteredComments.length === 0" class="empty-hint" style="padding:2rem;text-align:center;">没有匹配的评论</div>
    <div v-else class="cm-list">
      <div v-for="c in filteredComments" :key="c.id" class="cm-item" :class="{ pinned: c.is_pinned, reply: c.parent_id }">
        <div class="cm-meta">
          <span class="cm-lesson">{{ c.lessonLabel }}</span>
          <span v-if="c.is_pinned" class="cm-tag pin">📌 置顶</span>
          <span v-if="c.is_featured" class="cm-tag feat">⭐ 精选</span>
          <span class="cm-author" :class="{ admin: isAdminAuthor(c) }">
            {{ c.parentAuthor ? `↪ ${c.authorName} 回复 ${c.parentAuthor}` : c.authorName }}
          </span>
          <span v-if="isAdminAuthor(c)" class="cm-role">管理员</span>
          <span class="cm-time">{{ commentTimeAgo(c.created_at) }}</span>
        </div>
        <div class="cm-content" v-html="renderCommentMd(c.content)"></div>
        <div class="cm-actions">
          <span class="cm-likes">❤ {{ c.likeCount }}</span>
          <button class="cm-btn" @click="cmTogglePinned(c)">{{ c.is_pinned ? '取消置顶' : '置顶' }}</button>
          <button class="cm-btn" @click="cmToggleFeatured(c)">{{ c.is_featured ? '取消精选' : '精选' }}</button>
          <button class="cm-btn danger" @click="cmDelete(c)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './dashboard-shared.css';
.cm-filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
.cm-select { padding: 0.35rem 0.6rem; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 0.8rem; cursor: pointer; }
.cm-reset { padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-2); font-size: 0.78rem; cursor: pointer; }
.cm-list { display: flex; flex-direction: column; gap: 0.6rem; }
.cm-item { padding: 0.75rem 1rem; border-radius: 8px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-left: 3px solid transparent; }
.cm-item.pinned { border-color: var(--vp-c-brand-2); border-left-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft, rgba(52,81,178,0.04)); }
.cm-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.35rem; font-size: 0.78rem; }
.cm-lesson { font-weight: 600; color: var(--vp-c-brand-1); }
.cm-tag { font-size: 0.7rem; font-weight: 600; padding: 0.05rem 0.35rem; border-radius: 3px; }
.cm-tag.pin { color: var(--vp-c-brand-1); }
.cm-tag.feat { color: #d97706; }
.cm-author { font-weight: 600; color: var(--vp-c-text-1); }
.cm-author.admin { color: var(--vp-c-brand-1); }
.cm-role { font-size: 0.68rem; padding: 0.05rem 0.35rem; border-radius: 3px; background: var(--vp-c-brand-soft, rgba(52,81,178,0.12)); color: var(--vp-c-brand-1); font-weight: 600; }
.cm-time { font-size: 0.72rem; color: var(--vp-c-text-3); margin-left: auto; }
.cm-content { font-size: 0.85rem; line-height: 1.6; color: var(--vp-c-text-1); margin-bottom: 0.4rem; }
.cm-content :deep(p) { margin: 0.25rem 0; }
.cm-actions { display: flex; align-items: center; gap: 0.4rem; }
.cm-likes { font-size: 0.75rem; color: var(--vp-c-text-2); margin-right: auto; }
.cm-btn { padding: 0.25rem 0.7rem; border-radius: 5px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-2); font-size: 0.76rem; cursor: pointer; }
.cm-btn:hover { color: var(--vp-c-text-1); border-color: var(--vp-c-brand-2); }
.cm-btn.danger:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.06); }

.hot-list { display: flex; flex-direction: column; gap: 0.4rem; }
.hot-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; }
.hot-rank { width: 1.5rem; font-weight: 700; color: var(--vp-c-brand-1); }
.hot-name { flex: 1; color: var(--vp-c-text-1); }
.hot-count { font-weight: 600; color: var(--vp-c-text-2); }
</style>
