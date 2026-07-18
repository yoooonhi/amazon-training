/**
 * 侧边栏选中项自动滚动居中
 *
 * VitePress 默认不会把选中的侧边栏项滚到可见区，
 * 学员从「上一课/下一课」点进长列表里靠下的课时，选中项可能在视口外。
 *
 * 这里在路由切换后找到侧边栏的 active 项，无条件滚动到侧边栏垂直中点。
 *
 * 实现要点：
 *   - active class 由 Vue 在路由切换后异步更新，onAfterRouteChanged 触发时
 *     可能还没更新到新页面，所以用轮询等它出现（最多等 300ms）
 *   - 找到后用 scrollIntoView({block:'center'})，浏览器会自动找最近的可滚动祖先
 *
 * 调用方：theme/index.ts 在 onAfterRouteChanged 和首次加载时调用。
 * SSR 构建环境（无 window）直接跳过。
 */

export function scrollSidebarActive() {
  if (typeof window === 'undefined') return

  // VitePress 1.6 源码确认：选中项类名是 .VPSidebarItem.is-active（不是 .active）
  const SELECTOR = '.VPSidebarItem.is-active'
  let tries = 0
  const maxTries = 10 // 10 × 30ms = 最多等 300ms

  const tryScroll = () => {
    const active = document.querySelector(SELECTOR)
    if (active) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (++tries < maxTries) {
      setTimeout(tryScroll, 30)
    }
    // 超时仍未找到（如首页/非课程页），静默退出
  }

  // 等侧边栏 DOM 重建一帧后再开始轮询
  requestAnimationFrame(tryScroll)
}
