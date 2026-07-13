<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useData } from 'vitepress'
import { supabase, authState } from '../lib/supabase'
import { getLessonIdByPath } from '../lib/curriculum'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// --------------------------------------------------------
// 1. 路径 → lessonId 推导（零侵入注入的核心）
//    用显式映射表，不靠字符串推导（各模块 lessonId 规则不统一）
// --------------------------------------------------------
const { page } = useData()
const lessonId = computed(() => {
  return getLessonIdByPath(page.value?.relativePath || '')
})

// --------------------------------------------------------
// 2. 状态
// --------------------------------------------------------
const isMounted = ref(false)
const currentUser = ref(null)
const profile = ref(null)
const isMentor = computed(() => profile.value?.role === 'mentor' || profile.value?.role === 'admin')

const comments = ref([])        // 全部评论（主+回复）
const myLikes = ref(new Set())  // 当前用户点过赞的 comment_id
const loading = ref(false)
const errorMsg = ref('')
const sortMode = ref('new')     // new | hot

// 输入框
const newComment = ref('')
const submitting = ref(false)
const submitError = ref('')

// 回复状态
const replyTo = ref(null)       // 正在回复的主评论 id
const replyContent = ref('')
const replySubmitting = ref(false)

// --------------------------------------------------------
// 3. 加载评论（一次查询拉全树 + 聚合点赞数 + 当前用户点赞）
// --------------------------------------------------------
async function loadComments() {
  if (!lessonId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    // 1. 查这节课的全部评论（不 join profiles —— 避免 schema cache 关系问题）
    const { data: rawComments, error } = await supabase
      .from('comments')
      .select('id, lesson_id, user_id, parent_id, content, is_pinned, is_featured, created_at')
      .eq('lesson_id', lessonId.value)
      .order('created_at', { ascending: true })
    if (error) throw error
    const list = rawComments || []
    // 2. 批量查涉及的 profiles（昵称、角色），前端组装
    const userIds = [...new Set(list.map(c => c.user_id))]
    const profileMap = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, role')
        .in('id', userIds)
      ;(profilesData || []).forEach(p => { profileMap[p.id] = p })
    }
    // 3. 点赞数 + 我是否点过赞
    const likeCountsMap = {}
    const myLikesSet = new Set()
    if (list.length > 0) {
      const ids = list.map(c => c.id)
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', ids)
      ;(likesData || []).forEach(l => {
        likeCountsMap[l.comment_id] = (likeCountsMap[l.comment_id] || 0) + 1
        if (currentUser.value && l.user_id === currentUser.value.id) myLikesSet.add(l.comment_id)
      })
    }
    // 组装最终数据
    comments.value = list.map(c => ({ ...c, profiles: profileMap[c.user_id] || { nickname: null, role: null } }))
    likeCounts.value = likeCountsMap
    myLikes.value = myLikesSet
  } catch (e) {
    errorMsg.value = '评论加载失败：' + (e.message || e)
  } finally {
    loading.value = false
  }
}

const likeCounts = ref({})

// --------------------------------------------------------
// 4. 派生：主评论 + 回复分组 + 排序
// --------------------------------------------------------
const topLevel = computed(() => comments.value.filter(c => !c.parent_id))
const repliesByParent = computed(() => {
  const map = {}
  comments.value.filter(c => c.parent_id).forEach(c => {
    if (!map[c.parent_id]) map[c.parent_id] = []
    map[c.parent_id].push(c)
  })
  return map
})

const sortedTopLevel = computed(() => {
  let list = [...topLevel.value]
  // 单次排序：置顶为主键（永远在最前），时间/热度为次键
  list.sort((a, b) => {
    // 置顶优先
    const pa = a.is_pinned ? 1 : 0
    const pb = b.is_pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    // 同置顶级别下，按热度或时间
    if (sortMode.value === 'hot') {
      return (likeCounts.value[b.id] || 0) - (likeCounts.value[a.id] || 0)
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })
  return list
})

const totalCount = computed(() => topLevel.value.length)
const replyCount = computed(() => comments.value.length - topLevel.value.length)

// --------------------------------------------------------
// 5. 发表主评论
// --------------------------------------------------------
async function submitComment() {
  const text = newComment.value.trim()
  if (!text) return
  if (!currentUser.value) { submitError.value = '请先登录'; return }
  if (text.length > 5000) { submitError.value = '评论最长 5000 字'; return }
  submitting.value = true
  submitError.value = ''
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        lesson_id: lessonId.value,
        user_id: currentUser.value.id,
        content: text,
      })
      .select('id, lesson_id, user_id, parent_id, content, is_pinned, is_featured, created_at')
      .single()
    if (error) throw error
    comments.value.push({ ...data, profiles: { nickname: profile.value?.nickname, role: profile.value?.role } })
    newComment.value = ''
  } catch (e) {
    submitError.value = '发布失败：' + (e.message || e) + '（若刚建表，请检查是否已在 Supabase 执行建表 SQL）'
  } finally {
    submitting.value = false
  }
}

// --------------------------------------------------------
// 6. 回复
// --------------------------------------------------------
function startReply(parentId) {
  replyTo.value = parentId
  replyContent.value = ''
  nextTick(() => {
    document.querySelector(`[data-reply-box="${parentId}"] textarea`)?.focus()
  })
}
function cancelReply() {
  replyTo.value = null
  replyContent.value = ''
}
async function submitReply(parentId) {
  const text = replyContent.value.trim()
  if (!text) return
  if (text.length > 5000) { submitError.value = '回复最长 5000 字'; return }
  replySubmitting.value = true
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        lesson_id: lessonId.value,
        user_id: currentUser.value.id,
        parent_id: parentId,
        content: text,
      })
      .select('id, lesson_id, user_id, parent_id, content, is_pinned, is_featured, created_at')
      .single()
    if (error) throw error
    comments.value.push({ ...data, profiles: { nickname: profile.value?.nickname, role: profile.value?.role } })
    cancelReply()
  } catch (e) {
    submitError.value = '回复失败：' + (e.message || e)
  } finally {
    replySubmitting.value = false
  }
}

// --------------------------------------------------------
// 7. 点赞（乐观更新）
// --------------------------------------------------------
async function toggleLike(commentId) {
  if (!currentUser.value) return
  const liked = myLikes.value.has(commentId)
  // 乐观更新 UI
  if (liked) {
    myLikes.value.delete(commentId)
    likeCounts.value[commentId] = Math.max(0, (likeCounts.value[commentId] || 1) - 1)
  } else {
    myLikes.value.add(commentId)
    likeCounts.value[commentId] = (likeCounts.value[commentId] || 0) + 1
  }
  // 写库
  try {
    if (liked) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', commentId).eq('user_id', currentUser.value.id)
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: commentId, user_id: currentUser.value.id,
      })
    }
  } catch (e) {
    // 回滚：恢复点赞状态和计数
    if (liked) {
      myLikes.value.add(commentId)
      likeCounts.value[commentId] = (likeCounts.value[commentId] || 0) + 1
    } else {
      myLikes.value.delete(commentId)
      likeCounts.value[commentId] = Math.max(0, (likeCounts.value[commentId] || 1) - 1)
    }
  }
}

// --------------------------------------------------------
// 8. 删除
// --------------------------------------------------------
async function deleteComment(commentId) {
  if (!confirm('确定删除？删除后其下的回复也会一并清除。')) return
  try {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) throw error
    // 本地移除：该条 + 它的所有回复（级联）
    comments.value = comments.value.filter(
      c => c.id !== commentId && c.parent_id !== commentId
    )
  } catch (e) {
    alert('删除失败：' + (e.message || e))
  }
}

// --------------------------------------------------------
// 9. 管理员：置顶 / 精选
// --------------------------------------------------------
async function togglePinned(comment) {
  try {
    const { error } = await supabase
      .from('comments').update({ is_pinned: !comment.is_pinned })
      .eq('id', comment.id)
    if (error) throw error
    comment.is_pinned = !comment.is_pinned
  } catch (e) { alert('操作失败：' + (e.message || e)) }
}
async function toggleFeatured(comment) {
  try {
    const { error } = await supabase
      .from('comments').update({ is_featured: !comment.is_featured })
      .eq('id', comment.id)
    if (error) throw error
    comment.is_featured = !comment.is_featured
  } catch (e) { alert('操作失败：' + (e.message || e)) }
}

// --------------------------------------------------------
// 10. 工具：渲染 Markdown + 净化、显示名、时间
// --------------------------------------------------------
marked.setOptions({ breaks: true, gfm: true })
function renderMarkdown(md) {
  if (!md) return ''
  const raw = marked.parse(md)
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'del', 'hr', 'span'],
    ALLOWED_ATTR: ['href', 'title'],
  })
}
function displayName(c) {
  const nickname = c.profiles?.nickname
  if (nickname) return nickname
  return '同学'
}
function isCommentAuthor(c) {
  return currentUser.value && c.user_id === currentUser.value.id
}
function timeAgo(iso) {
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

// --------------------------------------------------------
// 11. 生命周期
// --------------------------------------------------------
onMounted(() => {
  isMounted.value = true
  authState.onChange(async (user, prof) => {
    currentUser.value = user
    profile.value = prof
  })
  supabase.auth.getSession().then(async ({ data }) => {
    currentUser.value = data.session?.user || null
    if (data.session?.user) {
      const { data: prof } = await supabase.from('profiles')
        .select('*').eq('id', data.session.user.id).single()
      profile.value = prof
    }
  })
})

// lessonId 推导出来后再加载（避免竞态）
watch(lessonId, async (id) => {
  if (id) {
    await loadComments()
  }
}, { immediate: true })
</script>

<template>
  <div v-if="isMounted && lessonId" class="comments-section">
    <div class="comments-header">
      <span class="comments-icon">💬</span>
      <span class="comments-title">课程问答</span>
      <span class="comments-count" v-if="!loading">
        {{ totalCount }} 条讨论 · {{ replyCount }} 个回答
      </span>
    </div>

    <!-- 排序切换 -->
    <div class="comments-toolbar" v-if="totalCount > 0">
      <button
        :class="['sort-btn', { active: sortMode === 'new' }]"
        @click="sortMode = 'new'"
      >最新</button>
      <button
        :class="['sort-btn', { active: sortMode === 'hot' }]"
        @click="sortMode = 'hot'"
      >最热</button>
    </div>

    <!-- 输入区：登录用户可见 -->
    <div class="comment-input-box" v-if="currentUser">
      <textarea
        v-model="newComment"
        class="comment-textarea"
        placeholder="写下你的提问或补充…  支持 Markdown（换行、加粗、列表、代码）"
        rows="3"
        maxlength="5000"
      ></textarea>
      <div class="input-footer">
        <span class="char-hint">{{ newComment.length }}/5000</span>
        <button
          class="submit-btn"
          :disabled="!newComment.trim() || submitting"
          @click="submitComment"
        >{{ submitting ? '发布中…' : '发布' }}</button>
      </div>
      <div v-if="submitError" class="submit-error">{{ submitError }}</div>
    </div>
    <!-- 未登录提示 -->
    <div class="login-hint" v-else>
      🔒 登录后可以提问、回答、点赞（评论对所有人可见）
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="state-box">加载评论中…</div>
    <!-- 错误态 -->
    <div v-else-if="errorMsg" class="state-box error">{{ errorMsg }}</div>
    <!-- 空态 -->
    <div v-else-if="totalCount === 0" class="empty-state">
      还没有讨论。成为第一个提问的人吧 👆
    </div>

    <!-- 评论列表 -->
    <div v-else class="comment-list">
      <div
        v-for="c in sortedTopLevel"
        :key="c.id"
        class="comment-item"
        :class="{ pinned: c.is_pinned }"
      >
        <!-- 主评论 -->
        <div class="comment-main">
          <div class="comment-meta">
            <span v-if="c.is_pinned" class="pin-badge" title="管理员置顶">📌 置顶</span>
            <span class="comment-author" :class="{ admin: c.profiles?.role === 'mentor' || c.profiles?.role === 'admin' }">
              {{ displayName(c) }}
            </span>
            <span v-if="c.profiles?.role === 'mentor' || c.profiles?.role === 'admin'" class="role-badge">管理员</span>
            <span v-if="c.is_featured" class="featured-badge" title="管理员标记优质/已解决">⭐ 精选</span>
            <span class="comment-time">{{ timeAgo(c.created_at) }}</span>
          </div>
          <div class="comment-content" v-html="renderMarkdown(c.content)"></div>
          <div class="comment-actions">
            <button
              v-if="currentUser"
              class="action-btn"
              :class="{ liked: myLikes.has(c.id) }"
              @click="toggleLike(c.id)"
            >❤ {{ likeCounts[c.id] || 0 }}</button>
            <button
              v-if="currentUser"
              class="action-btn"
              @click="replyTo === c.id ? cancelReply() : startReply(c.id)"
            >💬 回复</button>
            <button
              v-if="isCommentAuthor(c) || isMentor"
              class="action-btn danger"
              @click="deleteComment(c.id)"
            >删除</button>
            <!-- 管理员专属 -->
            <button v-if="isMentor" class="action-btn mentor" @click="togglePinned(c)">
              {{ c.is_pinned ? '取消置顶' : '置顶' }}
            </button>
            <button v-if="isMentor" class="action-btn mentor" @click="toggleFeatured(c)">
              {{ c.is_featured ? '取消精选' : '精选' }}
            </button>
          </div>
        </div>

        <!-- 回复列表 -->
        <div class="reply-list" v-if="repliesByParent[c.id]?.length">
          <div v-for="r in repliesByParent[c.id]" :key="r.id" class="reply-item">
            <div class="comment-meta">
              <span class="comment-author" :class="{ admin: r.profiles?.role === 'mentor' || r.profiles?.role === 'admin' }">
                {{ displayName(r) }}
              </span>
              <span v-if="r.profiles?.role === 'mentor' || r.profiles?.role === 'admin'" class="role-badge">管理员</span>
              <span v-if="r.is_featured" class="featured-badge">⭐ 精选</span>
              <span class="comment-time">{{ timeAgo(r.created_at) }}</span>
            </div>
            <div class="comment-content" v-html="renderMarkdown(r.content)"></div>
            <div class="comment-actions">
              <button
                v-if="currentUser"
                class="action-btn"
                :class="{ liked: myLikes.has(r.id) }"
                @click="toggleLike(r.id)"
              >❤ {{ likeCounts[r.id] || 0 }}</button>
              <button
                v-if="isCommentAuthor(r) || isMentor"
                class="action-btn danger"
                @click="deleteComment(r.id)"
              >删除</button>
              <button v-if="isMentor" class="action-btn mentor" @click="toggleFeatured(r)">
                {{ r.is_featured ? '取消精选' : '精选' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 回复输入框 -->
        <div class="reply-box" v-if="replyTo === c.id" :data-reply-box="c.id">
          <textarea
            v-model="replyContent"
            class="comment-textarea small"
            :placeholder="`回复 ${displayName(c)}…`"
            rows="2"
            maxlength="5000"
          ></textarea>
          <div class="input-footer">
            <button class="cancel-btn" @click="cancelReply">取消</button>
            <button
              class="submit-btn"
              :disabled="!replyContent.trim() || replySubmitting"
              @click="submitReply(c.id)"
            >{{ replySubmitting ? '发布中…' : '回复' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comments-section {
  margin: 2.5rem 0 1rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.comments-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.comments-icon { font-size: 1.2rem; }
.comments-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}
.comments-count {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.comments-toolbar {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.sort-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}
.sort-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

/* 输入区 */
.comment-input-box {
  margin-bottom: 1.5rem;
}
.comment-textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}
.comment-textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand-2);
}
.comment-textarea.small { font-size: 0.85rem; }
.input-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.char-hint {
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  margin-right: auto;
}
.submit-btn {
  padding: 0.4rem 1.1rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.submit-btn:hover:not(:disabled) { opacity: 0.9; }
.submit-btn:disabled { opacity: 0.5; cursor: default; }
.cancel-btn {
  padding: 0.4rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
}
.submit-error {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #ef4444;
}

.login-hint {
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

.state-box {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
.state-box.error { color: #ef4444; }
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

/* 评论项 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.comment-item {
  padding: 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}
.comment-item.pinned {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.05));
}
.comment-main { }
.comment-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}
.comment-author {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
}
.comment-author.admin {
  color: var(--vp-c-brand-1);
}
.role-badge {
  font-size: 0.7rem;
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.12));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pin-badge {
  font-size: 0.72rem;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.featured-badge {
  font-size: 0.72rem;
  color: #d97706;
  font-weight: 600;
}
.comment-time {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-left: auto;
}
.comment-content {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}
.comment-content :deep(p) { margin: 0.4rem 0; }
.comment-content :deep(p:first-child) { margin-top: 0; }
.comment-content :deep(p:last-child) { margin-bottom: 0; }
.comment-content :deep(pre) {
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
  font-size: 0.82rem;
}
.comment-content :deep(code) {
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  font-size: 0.85em;
}
.comment-content :deep(blockquote) {
  margin: 0.5rem 0;
  padding-left: 0.75rem;
  border-left: 3px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.comment-content :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.comment-content :deep(a:hover) { text-decoration: underline; }
.comment-content :deep(ul), .comment-content :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.5rem;
}
.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}
.action-btn {
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.action-btn.liked {
  color: #ef4444;
}
.action-btn.danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.action-btn.mentor:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
}

/* 回复列表 */
.reply-list {
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.reply-item {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}
.reply-item .comment-content {
  font-size: 0.86rem;
}
.reply-item .comment-time {
  margin-left: auto;
}

/* 回复输入框 */
.reply-box {
  margin-top: 0.75rem;
  padding-left: 1rem;
}
</style>
