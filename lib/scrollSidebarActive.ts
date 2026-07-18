/**
 * 侧边栏选中项自动滚动居中
 *
 * VitePress 默认不会把选中的侧边栏项滚到可见区，
 * 学员从「上一课/下一课」点进长列表里靠下的课时，选中项可能在视口外。
 *
 * 这里在路由切换后找到侧边栏的 active 项，无条件滚动到侧边栏垂直中点。
 *
 * 调用方：theme/index.ts 在 onAfterRouteChanged 和首次加载时调用。
 * SSR 构建环境（无 window）直接跳过。
 */

export function scrollSidebarActive() {
  if (typeof window === 'undefined') return

  const scroll = () => {
    // VitePress 1.6 的滚动容器：.VPSidebar（已设 overflow-y:auto）
    // active 项的类名：.VPSidebarItem.active
    const sidebar = document.querySelector('.VPSidebar')
    const active = document.querySelector('.VPSidebarItem.active')
    if (!sidebar || !active) return

    // 无条件居中：让 active 项始终位于侧边栏垂直中点
    active.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  // 路由切换后侧边栏 DOM 需要一帧重建，等两帧再滚
  requestAnimationFrame(() => {
    requestAnimationFrame(scroll)
  })
}
