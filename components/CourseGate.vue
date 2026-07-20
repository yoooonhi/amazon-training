<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { authState, supabase } from '../lib/supabase'
import {
  getLevelByPath, isLevelAccessible, isMentorRole,
  isSkillPath, isSkillAccessible, getSkillSlug, MEMBER_SKILL_SLUGS,
  isPlaybookPath, isPlaybookAccessible, isPathAccessible,
} from '../lib/accessControl'

const isMounted = ref(false)
const role = ref(null) // 当前用户角色
const accessLevels = ref([]) // 当前用户被管理员授权的等级
const profile = ref(null) // 当前用户完整 profile（含 is_member）
const currentPath = ref('')
// 权限是否已校验完成（getSession/profile 拉取结束）。
// 在此之前不显示拦截卡（避免授权用户刷新时闪现「内测中」），也不放行受保护页正文。
const authResolved = ref(false)

const isLoggedIn = computed(() => role.value !== null)

// 判断当前页面是否需要主课程门控拦截
const blockedLevel = computed(() => {
  const level = getLevelByPath(currentPath.value)
  if (!level) return null // 非课程页面
  if (isLevelAccessible(level, role.value, accessLevels.value)) return null // 可访问，不拦截
  return level // 被拦截的等级
})

// 判断当前页面是否是实战手册（playbooks），且当前用户不是管理员
const isPlaybookBlocked = computed(() => {
  if (!isPlaybookPath(currentPath.value)) return false
  return !isPlaybookAccessible(profile.value)
})

// 判断当前页面是否是需要会员才能访问的技能课
const isSkillBlocked = computed(() => {
  if (!isSkillPath(currentPath.value)) return false
  return !isSkillAccessible(currentPath.value, profile.value)
})

// 被拦截的是不是会员专属技能课（文案区分用）
const isMemberSkillBlocked = computed(() => {
  if (!isSkillBlocked.value) return false
  const slug = getSkillSlug(currentPath.value)
  return slug ? MEMBER_SKILL_SLUGS.includes(slug) : false
})

// 当前页面在「游客视角」下是否本就公开（首页、入门课、domain-basics 等）。
// 这种页面 transformHead 不会注入预隐藏脚本，HTML 初始就是可见的，
// 这里用来判断「放行时是否需要主动去掉 doc-gated」——公开页本来就没人加它。
const isPublicPage = computed(() => isPathAccessible(currentPath.value, undefined, undefined))

// 是否处于拦截状态（任一遮罩显示）。
// 必须等 authResolved：未授权用户在权限未明时也先别急着弹拦截卡，
// 否则授权用户刷新时会先闪一下「内测中」。
const isBlocked = computed(() => isMounted.value && authResolved.value && (blockedLevel.value || isSkillBlocked.value || isPlaybookBlocked.value))

// 控制 <html> 上的 doc-gated class，决定 .vp-doc 正文是否可见。
// 反转后的语义：
//   - 公开页：确保没有 doc-gated（覆盖 SPA 从受保护页跳入、残留 class 的场景）
//   - 受保护页：transformHead 已在渲染前注入 doc-gated；这里只在「确定放行」时移除
function syncGateClass() {
  if (typeof document === 'undefined') return
  if (isPublicPage.value) {
    document.documentElement.classList.remove('doc-gated')
    return
  }
  // 受保护页：权限校验完成且未拦截，才移除 doc-gated 让正文显示
  const shouldHideDoc = !(authResolved.value && !isBlocked.value)
  document.documentElement.classList.toggle('doc-gated', shouldHideDoc)
}
watch(isBlocked, syncGateClass)
watch(authResolved, syncGateClass)
watch(currentPath, syncGateClass)

// 弹出登录/注册面板（触发导航栏 AuthPanel 打开）
function openAuthPanel() {
  window.dispatchEvent(new CustomEvent('open-auth-panel'))
}

function updateRole(p) {
  profile.value = p || null
  role.value = p?.role || null
  accessLevels.value = p?.accessLevels || []
}

function refreshPath() {
  // VitePress 在浏览器侧用 history API，取当前实际路径
  currentPath.value = window.location.pathname
}

onMounted(() => {
  isMounted.value = true
  refreshPath()
  // 首次同步一次正文可见性（watch immediate:false，这里兜底初始态）
  syncGateClass()

  // 订阅全局登录状态
  authState.onChange((_user, profile) => {
    updateRole(profile)
    // authState 推来的 profile 一定来自已就绪的 session，标记为已校验
    authResolved.value = true
  })

  // 首次挂载补拉一次 session（处理页面直接刷新的情况）
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      updateRole(profile)
    } else {
      updateRole(null)
    }
    authResolved.value = true
  })

  // SPA 路由切换时刷新路径
  if (window.__COURSE_GATE_POPSTATE__ === undefined) {
    window.__COURSE_GATE_POPSTATE__ = true
    window.addEventListener('popstate', refreshPath)
    // hook pushState/replaceState 以捕获编程式导航
    ;['pushState', 'replaceState'].forEach((fn) => {
      const orig = history[fn]
      history[fn] = function (...args) {
        const ret = orig.apply(this, args)
        setTimeout(refreshPath, 0)
        return ret
      }
    })
  }
})
</script>

<template>
  <!-- 权限校验进行中：受保护页正文已被 doc-gated 藏掉，这里给一个低调的加载态，
       避免用户看到一片空白。校验完成后此分支自动消失，显示拦截卡或正文。 -->
  <div v-if="isMounted && !isPublicPage && !authResolved" class="course-gate">
    <div class="gate-card gate-card-loading">
      <div class="gate-loading-dot"></div>
      <p class="gate-loading-text">正在校验访问权限…</p>
    </div>
  </div>

  <!-- 实战手册被拦截：内测中，仅管理员可见 -->
  <div v-else-if="authResolved && isPlaybookBlocked" class="course-gate">
    <div class="gate-card">
      <div class="gate-icon">🔒</div>
      <h2 class="gate-title">广告打法手册 · 内测中</h2>
      <p class="gate-desc">
        本手册正在内测阶段，暂未开放。<br />
        测试通过后将逐步开放，敬请期待。
      </p>
      <p v-if="isLoggedIn" class="gate-hint">此手册当前仅限管理员访问。</p>
    </div>
  </div>

  <!-- 主课程被拦截：内测中（仅内容区，保留侧边栏与导航） -->
  <div v-else-if="authResolved && blockedLevel" class="course-gate">
    <div class="gate-card">
      <div class="gate-icon">🔒</div>
      <h2 class="gate-title">{{ blockedLevel }}课程 · 内测中</h2>
      <p class="gate-desc">
        本课程正在内测阶段，暂未对学员开放。<br />
        测试通过后将开放，敬请期待。
      </p>
      <p v-if="isLoggedIn" class="gate-hint">你当前无法访问此内容。</p>
    </div>
  </div>

  <!-- 会员专属技能课被拦截 -->
  <div v-else-if="authResolved && isSkillBlocked && isMemberSkillBlocked" class="course-gate">
    <div class="gate-card">
      <div class="gate-icon">👑</div>
      <h2 class="gate-title">会员专享内容</h2>
      <p class="gate-desc" v-if="!isLoggedIn">
        这是技能补给站的会员专享课程。<br />
        升级会员即可解锁全部技能课程。
      </p>
      <p class="gate-desc" v-else>
        你当前是免费用户。<br />
        升级会员即可解锁这门专享技能课。
      </p>
      <div class="gate-actions">
        <button v-if="!isLoggedIn" class="gate-btn gate-btn-primary" @click="openAuthPanel">免费注册 / 登录</button>
        <span v-else class="gate-member-hint">👑 联系管理员开通会员解锁</span>
      </div>
      <p class="gate-hint">会员可访问全部技能补给站内容。</p>
    </div>
  </div>

  <!-- 技能补给站被拦截：需登录（仅内容区，保留侧边栏与导航） -->
  <div v-else-if="authResolved && isSkillBlocked" class="course-gate">
    <div class="gate-card">
      <div class="gate-icon">🔐</div>
      <h2 class="gate-title">登录后查看</h2>
      <p class="gate-desc">
        这是技能补给站的进阶内容。<br />
        免费注册 / 登录后即可解锁全部技能课程。
      </p>
      <div class="gate-actions">
        <button class="gate-btn gate-btn-primary" @click="openAuthPanel">免费注册 / 登录</button>
      </div>
      <p class="gate-hint">已登录用户可访问全部技能补给站内容。</p>
    </div>
  </div>
</template>

<style scoped>
.course-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}
.gate-card {
  max-width: 420px;
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.gate-icon {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 1rem;
}
.gate-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: var(--vp-c-text-1);
}
.gate-desc {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 1.5rem;
}
.gate-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}
.gate-btn {
  display: inline-block;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}
.gate-btn:hover {
  opacity: 0.85;
}
.gate-btn-primary {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.gate-member-hint {
  display: inline-block;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #b45309;
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(255, 193, 7, 0.35);
}
.gate-hint {
  margin: 1.25rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

/* 权限校验中的低调加载态（避免受保护页刷新时一片空白） */
.gate-card-loading {
  padding: 2rem 2rem;
  opacity: 0.8;
}
.gate-loading-text {
  margin: 0.75rem 0 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
.gate-loading-dot {
  width: 10px;
  height: 10px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  animation: gate-pulse 1s ease-in-out infinite;
}
@keyframes gate-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
</style>
