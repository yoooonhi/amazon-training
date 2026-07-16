<script setup>
/**
 * 管理员后台外壳
 *
 * 左侧导航 + 右侧内容区，点击导航切换页面。
 * 权限校验、loading、error 在外壳统一处理。
 * 各页面组件独立加载数据，用 keep-alive 缓存。
 */
import { ref, computed, onMounted, shallowRef } from 'vue'
import { supabase } from '../../lib/supabase'
import { LEVELS } from '../../lib/accessControl'

import OverviewPage from './OverviewPage.vue'
import StudentsPage from './StudentsPage.vue'
import LearningPage from './LearningPage.vue'
import VisitsPage from './VisitsPage.vue'
import MembersPage from './MembersPage.vue'
import AccessPage from './AccessPage.vue'
import CommentsPage from './CommentsPage.vue'

const isMounted = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const isAdmin = ref(false)
const sidebarOpen = ref(false) // 移动端侧边栏开关

// 当前页面
const currentPage = ref('overview')

// 导航配置
const navItems = [
  { key: 'overview', label: '数据概览', icon: '📊' },
  { key: 'students', label: '学员管理', icon: '👥' },
  { key: 'learning', label: '学习分析', icon: '📈' },
  { key: 'visits', label: '访问分析', icon: '🌐' },
  { key: 'members', label: '会员管理', icon: '👑' },
  { key: 'access', label: '课程授权', icon: '🔑' },
  { key: 'comments', label: '评论管理', icon: '💬' },
]

// 当前页面标题
const currentTitle = computed(() =>
  navItems.find((n) => n.key === currentPage.value)?.label || ''
)

// 动态组件映射
const pageComponents = {
  overview: OverviewPage,
  students: StudentsPage,
  learning: LearningPage,
  visits: VisitsPage,
  members: MembersPage,
  access: AccessPage,
  comments: CommentsPage,
}
const currentComponent = computed(() => pageComponents[currentPage.value])

// 共享数据：外壳拉一次 profiles（轻量），各页面按需拉自己的数据
const totalStudents = ref(0)
const refreshKey = ref(0) // 子页面数据刷新用

async function checkAdmin() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) {
    errorMsg.value = '请先登录管理员账号'
    loading.value = false
    return
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.session.user.id)
    .single()
  if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
    errorMsg.value = '你不是管理员账号，无法查看后台'
    loading.value = false
    return
  }
  isAdmin.value = true
}

// 快速拉学员总数（概览卡用）
async function loadTotalStudents() {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
  totalStudents.value = count || 0
}

function switchPage(key) {
  currentPage.value = key
  sidebarOpen.value = false // 移动端切页后收起侧边栏
}

onMounted(async () => {
  isMounted.value = true
  await checkAdmin()
  if (isAdmin.value) {
    await loadTotalStudents()
    loading.value = false
  }
})
</script>

<template>
  <div v-if="isMounted" class="admin-shell">
    <!-- 未登录或非管理员 -->
    <div v-if="errorMsg" class="error-box">
      <p>🔒 {{ errorMsg }}</p>
      <a href="/" class="back-link">← 返回首页</a>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="loading-box">加载中...</div>

    <!-- 后台主体 -->
    <div v-else-if="isAdmin" class="admin-layout">
      <!-- 移动端遮罩 -->
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>

      <!-- 移动端顶部栏 -->
      <div class="mobile-topbar">
        <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">
          ☰
        </button>
        <span class="mobile-title">📊 管理员后台</span>
      </div>

      <!-- 左侧导航 -->
      <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <span class="sidebar-logo">📊</span>
          <span class="sidebar-title">管理员后台</span>
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="item in navItems"
            :key="item.key"
            :class="['nav-item', { active: currentPage === item.key }]"
            @click="switchPage(item.key)"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <main class="admin-content">
        <div class="content-header">
          <h2 class="content-title">{{ currentTitle }}</h2>
          <button class="refresh-btn" @click="refreshKey++">🔄 刷新</button>
        </div>
        <div class="content-body">
          <keep-alive>
            <component
              :is="currentComponent"
              :key="currentPage + '-' + refreshKey"
            />
          </keep-alive>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 60vh;
}
.error-box,
.loading-box {
  padding: 3rem;
  text-align: center;
  color: var(--vp-c-text-2);
}
.error-box p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}
.back-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

/* ===== 布局 ===== */
.admin-layout {
  display: flex;
  gap: 0;
  margin: -1rem -2rem 0;
  min-height: 70vh;
}

/* 左侧导航：sticky 固定，不随右侧内容滚动 */
.admin-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--vp-c-bg-soft);
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: 100vh;
  overflow-y: auto;
}
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.25rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.5rem;
}
.sidebar-logo {
  font-size: 1.3rem;
}
.sidebar-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.5rem;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.15s;
}
.nav-item:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.nav-item.active {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.1));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.nav-icon {
  font-size: 1.05rem;
  width: 1.3rem;
  text-align: center;
}

/* 移动端顶部栏（默认隐藏） */
.mobile-topbar {
  display: none;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.menu-toggle {
  border: none;
  background: none;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}
.mobile-title {
  font-weight: 700;
  font-size: 0.95rem;
}

/* 右侧内容 */
.admin-content {
  flex: 1;
  min-width: 0;
  padding: 1.5rem 2rem;
}
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.content-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.refresh-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  cursor: pointer;
}
.refresh-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-2);
}

.sidebar-overlay {
  display: none;
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
    margin: -1rem -1.2rem 0;
  }
  .mobile-topbar {
    display: flex;
  }
  .admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
    width: 240px;
  }
  .admin-sidebar.open {
    transform: translateX(0);
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
  }
  .admin-content {
    padding: 1rem 1.2rem;
  }
}
</style>
