/**
 * 侧边栏权限守卫
 *
 * VitePress 的侧边栏是配置层生成的静态 DOM，无法在 config.ts 里按角色条件渲染。
 * 这里用客户端 DOM 操作兜底：所有课程标题始终可见，受保护等级用 🔒 标记锁定状态。
 * 被导师单独授权某等级的学员，该等级去掉 🔒 图标；未授权的保留 🔒，
 * 点击后由 CourseGate.vue 的全屏遮罩拦截（无法访问内容）。
 *
 * DOM 结构（VitePress 1.6）：
 *   <section class="VPSidebarItem level-0">
 *     <div class="item">
 *       <h2 class="text">🔒 初级1 · 广告优化实战</h2>
 *     </div>
 *   </section>
 * 分组标题是 level-0 VPSidebarItem 内的 .text 元素。
 */
import { authState, supabase } from './supabase'
import {
  publicLevels, isMentorRole, isMember,
  SKILL_PATH_PREFIX, PUBLIC_SKILL_SLUGS,
} from './accessControl'

// 受保护等级的关键字（出现在侧边栏分组标题里的）
const PROTECTED_KEYWORDS = ['初级', '中级', '高级', '进阶'].filter(
  (kw) => !publicLevels.includes(kw as any)
)

let currentRole: string | null | undefined = undefined // undefined = 还没查过
let currentAccessLevels: string[] = [] // 当前用户被授权的等级
let currentIsMember = false // 当前用户是否为付费会员
let installedWatcher = false

// 取侧边栏所有 level-0 分组标题元素
function getGroupTitles(): Element[] {
  // level-0 分组的标题文本在 .item > .text 里
  return [...document.querySelectorAll('.VPSidebar .VPSidebarItem.level-0 > .item > .text')]
}

// 去掉标题里的 🔒 emoji
function unlockTitle(titleEl: Element) {
  const el = titleEl as HTMLElement
  if (el.textContent?.includes('🔒')) {
    el.textContent = el.textContent.replace(/🔒\s*/g, '')
  }
}

// 恢复标题里的 🔒 emoji（需要时还原）
function lockTitle(titleEl: Element, level: string) {
  const el = titleEl as HTMLElement
  if (!el.textContent?.includes('🔒')) {
    el.textContent = '🔒 ' + level + el.textContent.replace(level, '')
  }
}

function applyVisibility() {
  applyLevelVisibility()
  applySkillVisibility()
}

// 技能补给站：非会员时给非公开课项加 🔒，会员/导师去掉。
// 技能课是侧边栏里的链接项，结构为 .VPSidebarItem 内的 <a href>。
function applySkillVisibility() {
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>(
      '.VPSidebar a[href^="' + SKILL_PATH_PREFIX + '"]'
    ),
  ]
  // 会员或导师才解锁全部；未登录/免费登录用户只能看白名单
  const member = currentIsMember || isMentorRole(currentRole)
  links.forEach((a) => {
    // 文本节点在链接或其子元素里
    const textEl = (a.querySelector('.text') as HTMLElement) || a
    const href = a.getAttribute('href') || ''
    const slug = href.slice(SKILL_PATH_PREFIX.length).replace(/\/+$/, '').split('/')[0]
    const unlocked = member || PUBLIC_SKILL_SLUGS.includes(slug)
    // 去掉可能残留的锁标记后再按需添加
    if (textEl.dataset.skillLocked === '1') {
      textEl.textContent = textEl.textContent.replace(/🔒\s*/, '')
      delete textEl.dataset.skillLocked
    }
    if (!unlocked) {
      textEl.textContent = '🔒 ' + textEl.textContent
      textEl.dataset.skillLocked = '1'
    }
  })
}

// 主课程五级：导师全可见；非导师受保护等级标 🔒，已授权的解锁。
function applyLevelVisibility() {
  const titles = getGroupTitles()
  // 导师：所有分组可见，去掉所有 🔒
  if (isMentorRole(currentRole)) {
    titles.forEach((title) => {
      // 显示：连同外层 .group 容器一起恢复
      const group = title.closest('.group') as HTMLElement
      const section = title.closest('.VPSidebarItem.level-0') as HTMLElement
      if (group) group.style.display = ''
      if (section) section.style.display = ''
      unlockTitle(title)
    })
    return
  }
  // 非导师：受保护等级始终可见，已授权的去掉 🔒，未授权的保留 🔒 标记锁定。
  // 未授权用户点击课程项后，由 CourseGate.vue 全屏遮罩拦截内容访问。
  titles.forEach((title) => {
    const text = (title.textContent || '').trim()
    const matchedKw = PROTECTED_KEYWORDS.find((kw) => text.includes(kw))
    if (!matchedKw) return // 非受保护等级，不动
    const group = title.closest('.group') as HTMLElement
    const section = title.closest('.VPSidebarItem.level-0') as HTMLElement
    if (currentAccessLevels.includes(matchedKw)) {
      // 已授权：显示并去掉 🔒
      if (group) group.style.display = ''
      if (section) section.style.display = ''
      unlockTitle(title)
    } else {
      // 未授权：保持显示，保留 🔒 锁定标识
      if (group) group.style.display = ''
      if (section) section.style.display = ''
      lockTitle(title, matchedKw)
    }
  })
}

async function loadRole(): Promise<{ role: string | null; accessLevels: string[]; isMember: boolean }> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) return { role: null, accessLevels: [], isMember: false }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_member')
    .eq('id', session.session.user.id)
    .single()
  // 拉授权等级（表可能还没建，容错）
  let accessLevels: string[] = []
  try {
    const { data: accessRows, error: aErr } = await supabase
      .from('course_access')
      .select('level')
      .eq('user_id', session.session.user.id)
    if (!aErr && accessRows) accessLevels = accessRows.map((r: any) => r.level)
  } catch { /* 静默降级 */ }
  return {
    role: profile?.role || null,
    accessLevels,
    isMember: isMember(profile),
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
      currentIsMember = isMember(profile)
      applyVisibility()
    })
    // 首次补拉
    loadRole().then(({ role, accessLevels, isMember: member }) => {
      currentRole = role
      currentAccessLevels = accessLevels
      currentIsMember = member
      applyVisibility()
    })
  }

  // 等 DOM 渲染后再应用（路由切换后侧边栏刚重建）
  requestAnimationFrame(() => {
    requestAnimationFrame(applyVisibility)
  })
}
