<script setup>
/**
 * 管理员后台外壳（全屏独立布局）
 *
 * 完全脱离 VitePress 文档布局，全屏接管：
 * 左侧深色导航栏（固定不滚动）+ 右侧内容区（独立滚动）
 * 不显示站点顶部导航、底部栏、课程侧边栏。
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

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
const sidebarCollapsed = ref(false) // 桌面端折叠
const mobileSidebarOpen = ref(false) // 移动端展开
const currentPage = ref('overview')
const refreshKey = ref(0)

// 导航分组
const navGroups = [
  {
    label: '数据',
    items: [
      { key: 'overview', label: '数据概览', icon: '📊' },
      { key: 'learning', label: '学习分析', icon: '📈' },
      { key: 'visits', label: '访问分析', icon: '🌐' },
    ],
  },
  {
    label: '管理',
    items: [
      { key: 'students', label: '学员管理', icon: '👥' },
      { key: 'members', label: '会员管理', icon: '👑' },
      { key: 'access', label: '课程授权', icon: '🔑' },
    ],
  },
  {
    label: '内容',
    items: [
      { key: 'comments', label: '评论管理', icon: '💬' },
    ],
  },
]

const currentTitle = computed(() => {
  for (const g of navGroups) {
    const found = g.items.find((i) => i.key === currentPage.value)
    if (found) return found.label
  }
  return ''
})
const currentIcon = computed(() => {
  for (const g of navGroups) {
    const found = g.items.find((i) => i.key === currentPage.value)
    if (found) return found.icon
  }
  return '📊'
})

const pageComponents = {
  overview: OverviewPage, students: StudentsPage, learning: LearningPage,
  visits: VisitsPage, members: MembersPage, access: AccessPage, comments: CommentsPage,
}
const currentComponent = computed(() => pageComponents[currentPage.value])

async function checkAdmin() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) {
    errorMsg.value = '请先登录管理员账号'
    loading.value = false
    return
  }
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', session.session.user.id).single()
  if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
    errorMsg.value = '你不是管理员账号，无法查看后台'
    loading.value = false
    return
  }
  isAdmin.value = true
  loading.value = false
}

function switchPage(key) {
  currentPage.value = key
  mobileSidebarOpen.value = false
}

onMounted(() => {
  isMounted.value = true
  checkAdmin()
})
</script>

<template>
  <div v-if="isMounted" class="admin-root">
    <!-- 未登录/非管理员 -->
    <div v-if="errorMsg" class="gate-screen">
      <div class="gate-card">
        <div class="gate-icon">🔒</div>
        <h2>{{ errorMsg }}</h2>
        <a href="/" class="gate-btn">← 返回首页</a>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="gate-screen">
      <div class="gate-loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    </div>

    <!-- 全屏后台 -->
    <div v-else-if="isAdmin" class="admin-app">
      <!-- 移动端遮罩 -->
      <div v-if="mobileSidebarOpen" class="sidebar-backdrop" @click="mobileSidebarOpen = false"></div>

      <!-- 左侧深色导航 -->
      <aside
        class="admin-nav"
        :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }"
      >
        <!-- Logo 区 -->
        <div class="nav-logo" @click="switchPage('overview')">
          <span class="nav-logo-icon">📊</span>
          <span v-if="!sidebarCollapsed" class="nav-logo-text">运营后台</span>
        </div>

        <!-- 折叠按钮（桌面端） -->
        <button class="nav-collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <span v-if="sidebarCollapsed">▶</span>
          <span v-else>◀</span>
        </button>

        <!-- 导航分组 -->
        <nav class="nav-body">
          <template v-for="group in navGroups" :key="group.label">
            <div v-if="!sidebarCollapsed" class="nav-group-label">{{ group.label }}</div>
            <button
              v-for="item in group.items"
              :key="item.key"
              :class="['nav-link', { active: currentPage === item.key }]"
              :title="item.label"
              @click="switchPage(item.key)"
            >
              <span class="nav-link-icon">{{ item.icon }}</span>
              <span v-if="!sidebarCollapsed" class="nav-link-text">{{ item.label }}</span>
            </button>
          </template>
        </nav>

        <!-- 底部 -->
        <div class="nav-footer">
          <a href="/" class="nav-home-link" :title="sidebarCollapsed ? '首页' : ''">
            <span class="nav-link-icon">🏠</span>
            <span v-if="!sidebarCollapsed" class="nav-link-text">返回首页</span>
          </a>
        </div>
      </aside>

      <!-- 右侧主区域 -->
      <div class="admin-main">
        <!-- 移动端顶部栏 -->
        <div class="mobile-header">
          <button class="mobile-menu-btn" @click="mobileSidebarOpen = !mobileSidebarOpen">☰</button>
          <span class="mobile-title">{{ currentIcon }} {{ currentTitle }}</span>
        </div>

        <!-- 内容标题栏 -->
        <div class="content-topbar">
          <div class="topbar-left">
            <span class="topbar-icon">{{ currentIcon }}</span>
            <h1 class="topbar-title">{{ currentTitle }}</h1>
          </div>
          <button class="topbar-refresh" @click="refreshKey++">
            <span>🔄</span> 刷新
          </button>
        </div>

        <!-- 页面内容 -->
        <div class="content-scroll">
          <div class="content-inner">
            <keep-alive>
              <component :is="currentComponent" :key="currentPage + '-' + refreshKey" />
            </keep-alive>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 全屏根容器 ===== */
.admin-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* ===== 门控屏（未登录/加载） ===== */
.gate-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
}
.gate-card {
  text-align: center;
  padding: 2.5rem;
}
.gate-icon { font-size: 3rem; margin-bottom: 1rem; }
.gate-card h2 { font-size: 1.2rem; color: var(--vp-c-text-1); margin-bottom: 1.5rem; }
.gate-btn {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}
.gate-loading { text-align: center; color: var(--vp-c-text-2); }
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 后台主体布局 ===== */
.admin-app {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ===== 左侧深色导航 ===== */
.admin-nav {
  width: 220px;
  flex-shrink: 0;
  background: var(--vp-c-bg-alt, #1a1a2e);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.06);
  transition: width 0.2s ease;
  overflow: hidden;
}
.admin-nav.collapsed { width: 64px; }

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1.1rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.nav-logo-icon { font-size: 1.4rem; }
.nav-logo-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.nav-collapse-btn {
  position: absolute;
  right: -12px;
  top: 28px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.12);
  background: var(--vp-c-bg-alt, #1a1a2e);
  color: var(--vp-c-text-2);
  font-size: 0.6rem;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.admin-nav { position: relative; }

.nav-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.65rem;
  scrollbar-width: none;
}
.nav-body::-webkit-scrollbar { display: none; }

.nav-group-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.3);
  padding: 1rem 0.75rem 0.4rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 0.86rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  margin-bottom: 2px;
  transition: all 0.15s;
  white-space: nowrap;
}
.nav-link:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.9);
}
.nav-link.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  font-weight: 600;
}
.nav-link-icon { font-size: 1.1rem; flex-shrink: 0; width: 1.4rem; text-align: center; }
.nav-link-text { overflow: hidden; }

.nav-footer {
  padding: 0.65rem;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.nav-home-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.45);
  font-size: 0.82rem;
  text-decoration: none;
  transition: all 0.15s;
}
.nav-home-link:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8);
}

/* ===== 右侧主区域 ===== */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--vp-c-bg);
}

.mobile-header { display: none; }

.content-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
  background: var(--vp-c-bg);
}
.topbar-left { display: flex; align-items: center; gap: 0.6rem; }
.topbar-icon { font-size: 1.3rem; }
.topbar-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--vp-c-text-1); }
.topbar-refresh {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}
.topbar-refresh:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft, rgba(52,81,178,0.04));
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem 3rem;
}
.content-inner {
  max-width: 1400px;
  margin: 0 auto;
}

.sidebar-backdrop { display: none; }

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .admin-nav {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 1001;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  .admin-nav.mobile-open { transform: translateX(0); }
  .admin-nav.collapsed { width: 220px; }
  .nav-collapse-btn { display: none; }
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
  }
  .mobile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--vp-c-divider);
    flex-shrink: 0;
  }
  .mobile-menu-btn {
    border: none;
    background: none;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0.2rem;
  }
  .mobile-title { font-weight: 700; font-size: 1rem; }
  .content-topbar { display: none; }
  .content-scroll { padding: 1rem 1rem 2rem; }
}
</style>
