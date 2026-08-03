<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { isMember as isMemberOf, isMentorRole } from '../lib/accessControl'
import { lessonIdToUrl } from '../lib/curriculum'

const isMounted = ref(false)
const currentUser = ref(null)
const currentProfile = ref(null)
const showLogin = ref(false)
const showUserMenu = ref(false)
const mode = ref('signin')
const email = ref('')
const password = ref('')
const nickname = ref('')
const loading = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const showPassword = ref(false) // 密码框显示/隐藏切换

// 评论提醒：管理员看「新提问数」，普通用户看「4 类互动（回复/点赞/置顶/精选）」
const newCommentsCount = ref(0)
const notifications = ref([]) // 普通用户：所有新互动详情（用于弹浮层列表）
const showNotifications = ref(false) // 通知浮层显隐
const LAST_SEEN_KEY = 'lastSeenCommentsAt'           // 管理员基准
const LAST_SEEN_REPLY_KEY = 'lastSeenInteractionsAt'  // 普通用户基准（4 类共用）
const READ_NOTIF_KEY = 'readNotifIds'                 // 已读通知 key 集合（点过单条的）

// 已读通知 key 集合（localStorage 持久化），用于「点单条不算全部已读」
function getReadNotifIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_NOTIF_KEY) || '[]')) }
  catch { return new Set() }
}
function saveReadNotifIds(set) {
  localStorage.setItem(READ_NOTIF_KEY, JSON.stringify([...set]))
}

// 课程标题反查（浮层里显示「在哪节课」）
let lessonTitleMap = null
async function getLessonTitle(lessonId) {
  if (!lessonTitleMap) {
    // 懒加载：从 lessonTitles（curriculum）建反查表
    const { lessonTitles } = await import('../lib/curriculum')
    lessonTitleMap = lessonTitles || {}
  }
  return lessonTitleMap[lessonId] || lessonId
}

// 查询新评论数（按角色不同）：
//  - 管理员：新主评论数（只数数，不取详情）
//  - 普通用户：4 类互动全部详情存入 notifications，newCommentsCount = 数组长度
async function loadNewCommentsCount() {
  if (!currentUser.value) {
    newCommentsCount.value = 0
    notifications.value = []
    return
  }
  try {
    if (isMentorRole(currentProfile.value?.role)) {
      // 管理员：数新主评论（排除自己）
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || null
      let query = supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .is('parent_id', null)
        .neq('user_id', currentUser.value.id)
      if (lastSeen) query = query.gt('created_at', lastSeen)
      const { count, error } = await query
      if (!error) newCommentsCount.value = count || 0
      return
    }

    // 普通用户：取我所有评论（含完整字段，4 类共用）
    const { data: myComments, error: e1 } = await supabase
      .from('comments')
      .select('id, lesson_id, content, is_pinned, is_featured, created_at, updated_at')
      .eq('user_id', currentUser.value.id)
    if (e1 || !myComments || myComments.length === 0) {
      newCommentsCount.value = 0
      notifications.value = []
      return
    }
    const myIds = myComments.map((c) => c.id)
    const myCommentMap = Object.fromEntries(myComments.map((c) => [c.id, c]))
    const lastSeen = localStorage.getItem(LAST_SEEN_REPLY_KEY) || null

    // ① 被回复：取所有新回复（带内容、回复者、时间）
    const replyQ = supabase.from('comments')
      .select('id, parent_id, user_id, content, lesson_id, created_at')
      .in('parent_id', myIds).neq('user_id', currentUser.value.id)
      .order('created_at', { ascending: false })
    const replies = lastSeen ? (await replyQ.gt('created_at', lastSeen)).data : (await replyQ).data

    // ② 被点赞：取所有新点赞
    const likeQ = supabase.from('comment_likes')
      .select('comment_id, user_id, created_at')
      .in('comment_id', myIds)
      .order('created_at', { ascending: false })
    const likes = lastSeen ? (await likeQ.gt('created_at', lastSeen)).data : (await likeQ).data

    // ③④ 被置顶/精选：我的评论里 updated_at 变化且对应字段为 true
    const pinned = myComments.filter(
      (c) => c.is_pinned && (!lastSeen || new Date(c.updated_at) > new Date(lastSeen))
    )
    const featured = myComments.filter(
      (c) => c.is_featured && (!lastSeen || new Date(c.updated_at) > new Date(lastSeen))
    )

    // 收集所有涉及的 user_id（回复者、点赞者），批量查昵称
    const userIds = [...new Set([
      ...(replies || []).map((r) => r.user_id),
      ...(likes || []).map((l) => l.user_id),
    ])]
    let userNames = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, nickname, email').in('id', userIds)
      userNames = Object.fromEntries((profs || []).map((p) => [
        p.id, p.nickname || (p.email ? p.email.split('@')[0] : '用户')
      ]))
    }

    // 组装通知列表（统一格式 {type, lessonId, commentId, text, fromName, time}）
    const list = []
    for (const r of (replies || [])) {
      list.push({
        type: 'reply', lessonId: r.lesson_id, commentId: r.parent_id,
        text: r.content, fromName: userNames[r.user_id] || '某用户', time: r.created_at,
        key: 'reply-' + r.id,
      })
    }
    for (const l of (likes || [])) {
      const c = myCommentMap[l.comment_id]
      list.push({
        type: 'like', lessonId: c?.lesson_id, commentId: l.comment_id,
        text: c?.content, fromName: userNames[l.user_id] || '某用户', time: l.created_at,
        key: 'like-' + l.comment_id + '-' + l.user_id,
      })
    }
    for (const c of pinned) {
      list.push({
        type: 'pin', lessonId: c.lesson_id, commentId: c.id,
        text: c.content, fromName: '管理员', time: c.updated_at,
        key: 'pin-' + c.id,
      })
    }
    for (const c of featured) {
      list.push({
        type: 'feature', lessonId: c.lesson_id, commentId: c.id,
        text: c.content, fromName: '管理员', time: c.updated_at,
        key: 'feature-' + c.id,
      })
    }
    // 按时间倒序
    list.sort((a, b) => new Date(b.time) - new Date(a.time))
    // 过滤掉已点过（已读）的通知，剩下的才算未读
    const readIds = getReadNotifIds()
    const unread = list.filter((n) => !readIds.has(n.key))
    notifications.value = unread
    newCommentsCount.value = unread.length
    // 异步填充课程标题（不阻塞红点显示）
    Promise.all(unread.map((n) => getLessonTitle(n.lessonId))).then((titles) => {
      notifications.value = unread.map((n, i) => ({ ...n, lessonTitle: titles[i] }))
    })
  } catch {
    // 表不存在等异常，静默降级
  }
}

// 打开通知浮层（不清零）
function openNotifications() {
  showNotifications.value = true
}

// 标记全部已读：更新基准时间，清零红点 + 关闭浮层 + 清空已读集合
function markAllSeen() {
  const isMentor = isMentorRole(currentProfile.value?.role)
  const key = isMentor ? LAST_SEEN_KEY : LAST_SEEN_REPLY_KEY
  localStorage.setItem(key, new Date().toISOString())
  localStorage.removeItem(READ_NOTIF_KEY) // 普通用户：清空已读 key 集合
  newCommentsCount.value = 0
  notifications.value = []
  showNotifications.value = false
}

// 跳转到某条通知对应的课程页，并把这条标记为已读（红点数 -1）
function goToNotification(notif) {
  // 把这条的 key 存进「已读集合」，下次查询会自动过滤掉
  const readIds = getReadNotifIds()
  if (notif.key) readIds.add(notif.key)
  saveReadNotifIds(readIds)
  // 从当前列表移除（即时反馈，红点 -1）
  notifications.value = notifications.value.filter((n) => n.key !== notif.key)
  newCommentsCount.value = notifications.value.length
  // 全部已读了：更新基准时间 + 清空已读集合（下次从新基准开始数，老 key 不残留）
  if (notifications.value.length === 0) {
    localStorage.setItem(LAST_SEEN_REPLY_KEY, new Date().toISOString())
    localStorage.removeItem(READ_NOTIF_KEY)
  }
  const url = lessonIdToUrl[notif.lessonId]
  if (url) window.location.href = url
}

// 通知类型 → 标签/动作文案
function typeLabel(t) {
  return { reply: '💬', like: '👍', pin: '📌', feature: '⭐' }[t] || '•'
}
function actionText(t) {
  return { reply: '回复了你', like: '赞了你的评论', pin: '置顶了你的评论', feature: '精选了你的评论' }[t] || ''
}
function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
function relTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return min + ' 分钟前'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + ' 小时前'
  const day = Math.floor(hr / 24)
  if (day < 30) return day + ' 天前'
  return new Date(iso).toLocaleDateString('zh-CN')
}

// HoverCard 延时控制：进入延时短（防误触），离开延时短（跟手收起）
let enterTimer
let leaveTimer
const ENTER_DELAY = 200
const LEAVE_DELAY = 200

// 鼠标移入：清掉离开计时，等 200ms 后展开（避免鼠标扫过触发）
function onMenuEnter() {
  clearTimeout(leaveTimer)
  enterTimer = window.setTimeout(() => {
    showUserMenu.value = true
  }, ENTER_DELAY)
}

// 鼠标移出：清掉进入计时，等 200ms 后收起
// 注意：不要用 document.activeElement 做"焦点在卡片内就不收起"的判断——
// 一旦用户点过卡片里的输入框/按钮，焦点会一直留在 .nav-user 内，导致移出后永不收起。
// 打字时鼠标本身就在卡片上（mouseleave 不会触发），不需要额外保护。
function onMenuLeave() {
  clearTimeout(enterTimer)
  leaveTimer = window.setTimeout(() => {
    showUserMenu.value = false
  }, LEAVE_DELAY)
}

// 是否为付费会员（管理员也视为会员）
const isMemberUser = computed(() => isMemberOf(currentProfile.value))

// 点击页面任意位置关闭下拉菜单（点菜单自身不关）
function handleOutsideClick(e) {
  if (!showUserMenu.value) return
  const menu = document.querySelector('.nav-user')
  if (menu && !menu.contains(e.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  isMounted.value = true
  authState.onChange((user, profile) => {
    currentUser.value = user
    currentProfile.value = profile
    showLogin.value = false
    showUserMenu.value = false
    // 登录/切换账号后查新评论数（仅管理员生效）
    loadNewCommentsCount()
  })
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      currentUser.value = data.session.user
      supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
        .then(({ data: p }) => {
          currentProfile.value = p
          loadNewCommentsCount()
        })
    }
  })
  document.addEventListener('click', handleOutsideClick)
  // 由课程门控（如技能补给站）触发的「打开登录/注册」事件
  window.addEventListener('open-auth-panel', handleOpenAuthPanel)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('open-auth-panel', handleOpenAuthPanel)
})

// 外部触发打开登录面板：已登录则忽略，未登录默认进注册模式
function handleOpenAuthPanel() {
  if (currentUser.value) return
  mode.value = 'signup'
  email.value = ''
  password.value = ''
  errorMsg.value = ''
  infoMsg.value = ''
  showLogin.value = true
}

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  infoMsg.value = ''
  try {
    if (mode.value === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.value, password: password.value,
      })
      if (error) throw error
      if (data.user && !data.session) {
        infoMsg.value = '注册成功！请去邮箱点击确认链接，然后回来登录。'
      } else if (data.session) {
        if (nickname.value) {
          await supabase.from('profiles').update({ nickname: nickname.value }).eq('id', data.user.id)
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value, password: password.value,
      })
      if (error) throw error
    }
  } catch (e) {
    errorMsg.value = e.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
  // 刷新页面，确保所有组件状态干净重置（进度清空）
  window.location.reload()
}

async function saveNickname() {
  if (!nickname.value || !currentUser.value) return
  const { error } = await supabase.from('profiles')
    .update({ nickname: nickname.value }).eq('id', currentUser.value.id)
  if (!error) {
    currentProfile.value = { ...currentProfile.value, nickname: nickname.value }
    nickname.value = ''
  }
}

function displayName() {
  if (currentProfile.value?.nickname) return currentProfile.value.nickname
  if (currentUser.value?.email) return currentUser.value.email.split('@')[0]
  return '用户'
}
</script>

<template>
  <div v-if="isMounted" class="nav-auth">
    <!-- 已登录：右上角用户菜单（hover 展开卡片，移动端点击展开） -->
    <div
      v-if="currentUser"
      class="nav-user"
      @mouseenter="onMenuEnter"
      @mouseleave="onMenuLeave"
      @click="showUserMenu = !showUserMenu"
    >
      <span class="nav-avatar">👤</span>
      <span class="nav-username">{{ displayName() }}</span>
      <span v-if="currentProfile?.role === 'mentor'" class="nav-role">管理员</span>
      <span v-else-if="isMemberUser" class="nav-member">VIP 会员</span>
      <!-- 评论提醒红点（管理员=新提问，普通用户=我的评论被回复） -->
      <span
        v-if="currentUser && newCommentsCount > 0"
        class="nav-badge"
        :title="isMentorRole(currentProfile?.role) ? `${newCommentsCount} 条新提问待处理` : `${newCommentsCount} 条新互动（回复/点赞/置顶/精选）`"
        @click.stop="isMentorRole(currentProfile?.role) ? markAllSeen() : openNotifications()"
      >{{ newCommentsCount > 99 ? '99+' : newCommentsCount }}</span>

      <!-- HoverCard（只展示 + 操作，定位跟原来的下拉一致） -->
      <Transition name="dropdown">
        <div v-if="showUserMenu" class="user-dropdown" @click.stop>
          <div class="dropdown-header">
            <div class="dropdown-avatar">👤</div>
            <div class="dropdown-id">
              <div class="dropdown-name-row">
                <span class="dropdown-name">{{ displayName() }}</span>
                <span v-if="currentProfile?.role === 'mentor'" class="dropdown-role-tag">管理员</span>
                <span v-else-if="isMemberUser" class="dropdown-member">👑 会员</span>
              </div>
              <div class="dropdown-email">{{ currentUser.email }}</div>
            </div>
          </div>
          <a
            v-if="currentProfile?.role === 'mentor'"
            href="/dashboard"
            class="dropdown-item dropdown-admin"
            @click="markAllSeen"
          >
            <span>📊 管理员后台</span>
            <span v-if="newCommentsCount > 0" class="admin-comment-badge">{{ newCommentsCount > 99 ? '99+' : newCommentsCount }} 新评论</span>
          </a>
          <!-- 普通用户：新互动提醒（点击弹通知浮层，不清零） -->
          <button
            v-else-if="newCommentsCount > 0"
            class="dropdown-item dropdown-reply"
            @click="openNotifications"
          >
            <span>💬 你有 {{ newCommentsCount > 99 ? '99+' : newCommentsCount }} 条新互动</span>
            <span class="reply-hint">点击查看</span>
          </button>
          <div v-if="!currentProfile?.nickname" class="dropdown-item nickname-row">
            <input v-model="nickname" placeholder="设置昵称" class="dropdown-input" @keyup.enter="saveNickname" />
            <button @click="saveNickname" class="dropdown-btn">保存</button>
          </div>
          <button class="dropdown-item dropdown-logout" @click="handleLogout">退出登录</button>
        </div>
      </Transition>
    </div>

    <!-- 未登录：登录按钮 -->
    <div v-else class="nav-login-btn" @click="showLogin = true">
      登录 / 注册
    </div>

    <!-- 登录弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLogin && !currentUser" class="modal-overlay" @click.self="showLogin = false">
          <div class="auth-form">
            <button class="modal-close" @click="showLogin = false">✕</button>
            <h3 class="modal-title">{{ mode === 'signup' ? '注册账号' : '登录' }}</h3>
            <div class="form-tabs">
              <button :class="{ active: mode === 'signin' }" @click="mode = 'signin'">登录</button>
              <button :class="{ active: mode === 'signup' }" @click="mode = 'signup'">注册</button>
            </div>
            <input v-model="email" type="email" placeholder="邮箱" class="form-input" />
            <div class="password-field">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="密码（至少6位）"
                class="form-input password-input"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <!-- 显示状态：睁开的眼（点击后隐藏） -->
                <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <!-- 隐藏状态：划掉的眼（点击后显示） -->
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
            <input v-if="mode === 'signup'" v-model="nickname" placeholder="昵称（选填，注册后可改）" class="form-input" />
            <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
            <p v-if="infoMsg" class="form-info">{{ infoMsg }}</p>
            <button class="submit-btn" :disabled="loading" @click="handleSubmit">
              {{ loading ? '处理中...' : (mode === 'signup' ? '注册' : '登录') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 通知浮层（普通用户：列出所有新互动） -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showNotifications" class="notif-overlay" @click.self="showNotifications = false">
          <div class="notif-panel">
            <button class="modal-close" @click="showNotifications = false">✕</button>
            <h3 class="notif-title">💬 新互动（{{ notifications.length }}）</h3>
            <div class="notif-list">
              <div
                v-for="(n, i) in notifications"
                :key="i"
                class="notif-item"
                @click="goToNotification(n)"
              >
                <span class="notif-type" :class="'type-' + n.type">{{ typeLabel(n.type) }}</span>
                <div class="notif-body">
                  <p class="notif-main">
                    <strong>{{ n.fromName }}</strong>
                    <span class="notif-action">{{ actionText(n.type) }}</span>
                  </p>
                  <p v-if="n.text" class="notif-text">{{ truncate(n.text, 40) }}</p>
                  <p class="notif-meta">
                    <span class="notif-lesson">{{ n.lessonTitle || n.lessonId }}</span>
                    <span class="notif-time">{{ relTime(n.time) }}</span>
                  </p>
                </div>
              </div>
              <p v-if="notifications.length === 0" class="notif-empty">暂无新互动</p>
            </div>
            <button class="notif-markall" @click="markAllSeen">全部标记已读</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.nav-auth {
  display: inline-flex;
  align-items: center;
}

/* 未登录按钮 */
.nav-login-btn {
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  border: none;
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.nav-login-btn:hover {
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.06));
}

/* 已登录用户区 */
.nav-user {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
}
.nav-user:hover {
  background: var(--vp-c-bg-soft);
}
.nav-avatar {
  font-size: 1.1rem;
}
.nav-username {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-role {
  font-size: 0.65rem;
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
  background: #ff9900;
  color: #fff;
  font-weight: 600;
}
.nav-member {
  font-size: 0.62rem;
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 2px rgba(245, 158, 11, 0.35);
}
/* 新评论提醒红点徽章 */
.nav-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--vp-c-bg);
  animation: badge-pulse 2s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
/* 下拉菜单「管理员后台」项：横向布局 + 新评论提示 */
.dropdown-admin {
  justify-content: space-between;
  align-items: center;
}
.admin-comment-badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
}
/* 普通用户「新回复」提示项 */
.dropdown-reply {
  justify-content: space-between;
  align-items: center;
}
.reply-hint {
  flex-shrink: 0;
  font-size: 0.68rem;
  color: var(--vp-c-brand-1);
}
.dropdown-member {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: #b45309;
  background: rgba(255, 193, 7, 0.14);
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
}

/* 下拉菜单 */
.user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  padding: 0.4rem;
  z-index: 1000;
}
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem;
  margin-bottom: 0.2rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.dropdown-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
}
.dropdown-id {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.dropdown-name-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}
.dropdown-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dropdown-email {
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dropdown-role-tag {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  background: #ff9900;
  color: #fff;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  text-decoration: none;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}
.dropdown-item:hover {
  background: var(--vp-c-bg-soft);
}
.dropdown-logout {
  color: #ef4444;
  margin-top: 0.2rem;
  border-radius: 6px;
}
.nickname-row {
  flex-direction: row;
  gap: 0.3rem;
}
.dropdown-input {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.8rem;
  background: var(--vp-c-bg);
}
.dropdown-btn {
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.78rem;
  cursor: pointer;
}
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 弹窗 */
.auth-form {
  padding: 1.5rem 1.8rem;
  background: var(--vp-c-bg);
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 360px;
  max-width: calc(100vw - 2rem);
  position: relative;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}
.modal-title {
  margin: 0 0 0.3rem;
  font-size: 1.15rem;
  color: var(--vp-c-text-1);
}
.modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close:hover {
  background: var(--vp-c-divider);
  color: var(--vp-c-text-1);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .auth-form, .modal-leave-active .auth-form {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .auth-form, .modal-leave-to .auth-form {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
.form-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}
.form-tabs button {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  cursor: pointer;
}
.form-tabs button.active {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  font-weight: 600;
}
.form-input {
  padding: 0.5rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.9rem;
  background: var(--vp-c-bg);
}
.form-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
/* 密码框 + 小眼睛 */
.password-field {
  position: relative;
}
.password-input {
  width: 100%;
  padding-right: 2.4rem;
}
.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  color: var(--vp-c-text-2);
  opacity: 0.55;
  transition: opacity 0.15s;
}
.password-toggle:hover {
  opacity: 1;
}
.form-error {
  color: #ef4444;
  font-size: 0.82rem;
  margin: 0;
}
.form-info {
  color: #22c55e;
  font-size: 0.82rem;
  margin: 0;
}
.submit-btn {
  padding: 0.55rem;
  border-radius: 4px;
  border: none;
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 通知浮层 */
.notif-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.notif-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  width: 420px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.notif-title {
  margin: 0;
  padding: 1.2rem 1.5rem 0.8rem;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
}
.notif-list {
  overflow-y: auto;
  padding: 0.5rem;
  flex: 1;
  /* 隐藏滚动条但保留滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.notif-list::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
.notif-item {
  display: flex;
  gap: 0.7rem;
  padding: 0.7rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  align-items: flex-start;
}
.notif-item:hover {
  background: var(--vp-c-bg-soft);
}
.notif-item + .notif-item {
  border-top: 1px solid var(--vp-c-divider);
}
.notif-type {
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1.4;
}
.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-main {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}
.notif-action {
  margin-left: 0.2rem;
  color: var(--vp-c-text-2);
}
.notif-text {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notif-meta {
  margin: 0.2rem 0 0;
  display: flex;
  gap: 0.6rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
.notif-time {
  margin-left: auto;
}
.notif-empty {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}
.notif-markall {
  margin: 0;
  padding: 0.8rem;
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  background: none;
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.notif-markall:hover {
  background: var(--vp-c-bg-soft);
}
</style>
