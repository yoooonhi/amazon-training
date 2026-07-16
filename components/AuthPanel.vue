<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, authState } from '../lib/supabase'
import { isMember as isMemberOf } from '../lib/accessControl'

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

// 是否为付费会员（导师也视为会员）
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
  })
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      currentUser.value = data.session.user
      supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
        .then(({ data: p }) => { currentProfile.value = p })
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
    <!-- 已登录：右上角用户菜单 -->
    <div v-if="currentUser" class="nav-user" @click="showUserMenu = !showUserMenu">
      <span class="nav-avatar">👤</span>
      <span class="nav-username">{{ displayName() }}</span>
      <span v-if="currentProfile?.role === 'mentor'" class="nav-role">导师</span>
      <span v-else-if="isMemberUser" class="nav-member">VIP 会员</span>

      <!-- 下拉菜单 -->
      <Transition name="dropdown">
        <div v-if="showUserMenu" class="user-dropdown" @click.stop>
          <div class="dropdown-header">
            <span class="dropdown-email">{{ currentUser.email }}</span>
            <span v-if="currentProfile?.role !== 'mentor' && isMemberUser" class="dropdown-member">👑 付费会员</span>
          </div>
          <a v-if="currentProfile?.role === 'mentor'" href="/dashboard" class="dropdown-item">
            📊 导师后台
          </a>
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
            <input v-model="password" type="password" placeholder="密码（至少6位）" class="form-input" />
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
.dropdown-member {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #b45309;
  background: rgba(255, 193, 7, 0.14);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
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
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.2rem;
}
.dropdown-email {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
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
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 0.3rem;
  border-radius: 0 0 6px 6px;
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
</style>
