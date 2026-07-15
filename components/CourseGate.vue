<script setup>
import { ref, computed, onMounted } from 'vue'
import { authState, supabase } from '../lib/supabase'
import { getLevelByPath, isLevelAccessible, isMentorRole, publicLevels, LEVELS } from '../lib/accessControl'

const isMounted = ref(false)
const role = ref(null) // 当前用户角色
const accessLevels = ref([]) // 当前用户被导师授权的等级
const currentPath = ref('')

// 判断当前页面是否需要门控拦截
const blockedLevel = computed(() => {
  const level = getLevelByPath(currentPath.value)
  if (!level) return null // 非课程页面
  if (isLevelAccessible(level, role.value, accessLevels.value)) return null // 可访问，不拦截
  return level // 被拦截的等级
})

const isLoggedIn = computed(() => role.value !== null)

function updateRole(profile) {
  role.value = profile?.role || null
  accessLevels.value = profile?.accessLevels || []
}

function refreshPath() {
  // VitePress 在浏览器侧用 history API，取当前实际路径
  currentPath.value = window.location.pathname
}

onMounted(() => {
  isMounted.value = true
  refreshPath()

  // 订阅全局登录状态
  authState.onChange((_user, profile) => updateRole(profile))

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
  <!-- 被拦截时显示全屏遮罩 -->
  <div v-if="isMounted && blockedLevel" class="course-gate-overlay">
    <div class="gate-card">
      <div class="gate-icon">🔒</div>
      <h2 class="gate-title">{{ blockedLevel }}课程 · 内测中</h2>
      <p class="gate-desc">
        本课程正在导师内测阶段，暂未对学员开放。<br />
        测试通过后将逐步开放，敬请期待。
      </p>
      <div class="gate-actions">
        <a href="/" class="gate-btn gate-btn-primary">← 返回首页</a>
      </div>
      <p v-if="isLoggedIn" class="gate-hint">你当前的角色无法访问此内容。</p>
      <p v-else class="gate-hint">如你是导师，请先登录。</p>
    </div>
  </div>
</template>

<style scoped>
.course-gate-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  padding: 1.5rem;
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
.gate-hint {
  margin: 1.25rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
</style>
