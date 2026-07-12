<script setup>
import { ref, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'

const isMounted = ref(false)
const currentUser = ref(null)
const currentProfile = ref(null)
const showLogin = ref(false)
const mode = ref('signin') // signin | signup
const email = ref('')
const password = ref('')
const nickname = ref('')
const loading = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

onMounted(() => {
  isMounted.value = true
  authState.onChange((user, profile) => {
    currentUser.value = user
    currentProfile.value = profile
    showLogin.value = false
  })
  // 检查已有 session
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      currentUser.value = data.session.user
      supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
        .then(({ data: p }) => { currentProfile.value = p })
    }
  })
})

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  infoMsg.value = ''

  try {
    if (mode.value === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      if (data.user && !data.session) {
        infoMsg.value = '注册成功！请去邮箱点击确认链接，然后回来登录。'
      } else if (data.session) {
        // 直接登录了（邮箱确认关闭的情况）
        if (nickname.value) {
          await supabase.from('profiles').update({ nickname: nickname.value }).eq('id', data.user.id)
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
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
  currentUser.value = null
  currentProfile.value = null
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
</script>

<template>
  <div v-if="isMounted" class="auth-panel">
    <!-- 已登录 -->
    <div v-if="currentUser" class="auth-user">
      <div class="user-info">
        <span class="user-avatar">👤</span>
        <div class="user-detail">
          <span class="user-name">{{ currentProfile?.nickname || currentUser.email }}</span>
          <span v-if="currentProfile?.role === 'mentor'" class="role-badge">导师</span>
        </div>
      </div>
      <div class="user-actions">
        <a v-if="currentProfile?.role === 'mentor'" href="/dashboard" class="dashboard-link">📊 导师后台</a>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
      <div v-if="!currentProfile?.nickname" class="nickname-set">
        <input v-model="nickname" placeholder="设置你的昵称" class="nickname-input" />
        <button @click="saveNickname" class="nickname-btn">保存</button>
      </div>
    </div>

    <!-- 未登录 -->
    <div v-else-if="!showLogin" class="auth-prompt">
      <span class="prompt-text">登录后进度跨设备同步</span>
      <button class="login-btn" @click="showLogin = true">登录 / 注册</button>
    </div>

    <!-- 登录表单 -->
    <div v-else class="auth-form">
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
      <button class="cancel-btn" @click="showLogin = false">取消</button>
    </div>
  </div>
</template>

<style scoped>
.auth-panel {
  margin: 1rem 0;
}
.auth-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.2rem;
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.06));
  border-radius: 10px;
  border: 1px solid var(--vp-c-brand-1);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.user-avatar {
  font-size: 1.4rem;
}
.user-detail {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.user-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}
.role-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: #ff9900;
  color: #fff;
  font-weight: 600;
  width: fit-content;
}
.user-actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.dashboard-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-1);
}
.dashboard-link:hover {
  opacity: 0.85;
}
.logout-btn {
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
}
.logout-btn:hover {
  border-color: var(--vp-c-text-2);
}
.nickname-set {
  display: flex;
  gap: 0.4rem;
  width: 100%;
  margin-top: 0.5rem;
}
.nickname-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  font-size: 0.85rem;
}
.nickname-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}
.auth-prompt {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1.2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
}
.prompt-text {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.login-btn {
  margin-left: auto;
  padding: 0.35rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  background: transparent;
  color: var(--vp-c-brand-1);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.login-btn:hover {
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.06));
}
.auth-form {
  padding: 1.2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 340px;
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
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}
.dark .form-tabs button.active {
  background: #3e63dd;
  border-color: #3e63dd;
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
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.dark .submit-btn {
  background: #3e63dd;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cancel-btn {
  padding: 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
