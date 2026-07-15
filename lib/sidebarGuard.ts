/**
 * 侧边栏权限守卫
 *
 * VitePress 的侧边栏是配置层生成的静态 DOM，无法在 config.ts 里按角色条件渲染。
 * 这里用客户端 DOM 操作兜底：非导师用户隐藏受保护等级的侧边栏分组。
 * 被导师单独授权某等级的学员，该等级分组也可见。
 *
 * 识别规则：侧边栏分组的标题文本以受保护等级关键字开头（如"初级 ·"、"中级 ·"）。
 * 对应 config.ts 里的分组标题命名约定："初级N · 标题"。
 */
import { authState, supabase } from './supabase'
import { publicLevels, isMentorRole } from './accessControl'

// 受保护等级的关键字（出现在侧边栏分组标题开头的）
const PROTECTED_KEYWORDS = ['初级', '中级', '高级', '进阶'].filter(
  (kw) => !publicLevels.includes(kw as any)
)

let currentRole: string | null | undefined = undefined // undefined = 还没查过
let currentAccessLevels: string[] = [] // 当前用户被授权的等级
let installedWatcher = false

function applyVisibility() {
  // 导师：所有分组可见，需把可能被隐藏的重置回来
  if (isMentorRole(currentRole)) {
    document.querySelectorAll('.VPSidebar .group-title').forEach((title) => {
      const group = title.closest('.VPSidebarItem') || title.closest('.group')
      if (group) (group as HTMLElement).style.display = ''
    })
    return
  }
  // 非导师：隐藏受保护且未授权的分组
  const groupHeaders = document.querySelectorAll('.VPSidebar .group-title')
  groupHeaders.forEach((title) => {
    const text = (title.textContent || '').trim()
    // 找到这个分组属于哪个等级
    const matchedKw = PROTECTED_KEYWORDS.find((kw) => text.startsWith(kw))
    if (!matchedKw) return
    // 如果该用户被授权了这个等级，显示分组
    const group = title.closest('.VPSidebarItem') || title.closest('.group')
    if (!group) return
    if (currentAccessLevels.includes(matchedKw)) {
      ;(group as HTMLElement).style.display = ''
    } else {
      ;(group as HTMLElement).style.display = 'none'
    }
  })
}

async function loadRole(): Promise<{ role: string | null; accessLevels: string[] }> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) return { role: null, accessLevels: [] }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.session.user.id)
    .single()
  const { data: accessRows } = await supabase
    .from('course_access')
    .select('level')
    .eq('user_id', session.session.user.id)
  return {
    role: profile?.role || null,
    accessLevels: (accessRows || []).map((r: any) => r.level),
  }
}

/**
 * 初始化侧边栏守卫。幂等，可多次调用。
 * 在 enhanceApp 和路由切换时调用。
 * 仅在浏览器环境执行（SSR 构建时跳过）。
 */
export async function setupSidebarGuard() {
  // SSR 构建环境没有浏览器 API，直接跳过
  if (typeof window === 'undefined') return

  // 首次安装时订阅登录状态，之后只做 DOM 刷新
  if (!installedWatcher) {
    installedWatcher = true
    authState.onChange((_user, profile) => {
      currentRole = profile?.role || null
      currentAccessLevels = profile?.accessLevels || []
      applyVisibility()
    })
    // 首次补拉
    loadRole().then(({ role, accessLevels }) => {
      currentRole = role
      currentAccessLevels = accessLevels
      applyVisibility()
    })
  }

  // 等 DOM 渲染后再应用（路由切换后侧边栏刚重建）
  requestAnimationFrame(() => {
    requestAnimationFrame(applyVisibility)
  })
}
