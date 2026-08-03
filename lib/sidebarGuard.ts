/**
 * 侧边栏权限守卫
 *
 * VitePress 的侧边栏是配置层生成的静态 DOM，无法在 config.ts 里按角色条件渲染。
 * 这里用客户端 DOM 操作兜底：所有课程标题始终可见，受保护等级用 🔒 标记锁定状态。
 * 被管理员单独授权某等级的学员，该等级去掉 🔒 图标；未授权的保留 🔒，
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
  SKILL_PATH_PREFIX, PUBLIC_SKILL_SLUGS, MEMBER_SKILL_SLUGS, LIMITED_FREE_SKILL_SLUGS,
  PLAYBOOK_PATH_PREFIX,
} from './accessControl'

// 受保护等级的关键字（出现在侧边栏分组标题里的）
const PROTECTED_KEYWORDS = ['初级', '中级', '高级', '进阶'].filter(
  (kw) => !publicLevels.includes(kw as any)
)

let currentRole: string | null | undefined = undefined // undefined = 还没查过
let currentAccessLevels: string[] = [] // 当前用户被授权的等级
let currentIsMember = false // 当前用户是否为付费会员
let currentPlaybookAccess: string[] = [] // 当前用户被授权的实战手册 slug
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

// 把标题里的 🔒 换成 👑（已解锁的等级，显示会员尊享感）
function crownTitle(titleEl: Element) {
  const el = titleEl as HTMLElement
  // 先去掉可能残留的 🔒 或 👑（emoji surrogate pair 占2单元 + 空格1 = 3字符）
  let text = el.textContent || ''
  if (text.startsWith('🔒 ') || text.startsWith('👑 ')) text = text.slice(3)
  el.textContent = '👑 ' + text
}

// 恢复标题里的 🔒 emoji（需要时还原）
function lockTitle(titleEl: Element, level: string) {
  const el = titleEl as HTMLElement
  // 先去掉可能残留的标记（🔒 或 👑），避免叠加
  let text = el.textContent || ''
  if (text.startsWith('🔒 ') || text.startsWith('👑 ')) text = text.slice(3)
  if (!text.includes('🔒')) {
    el.textContent = '🔒 ' + text
  }
}

function applyVisibility() {
  applyLevelVisibility()
  applySkillVisibility()
  applyPlaybookVisibility()
}

// 技能补给站：非会员/未登录时给受保护课项加标记。
// 会员专属课用 👑，普通受保护课用 🔒。
// 技能课是侧边栏里的链接项，结构为 .VPSidebarItem 内的 <a href>。
function applySkillVisibility() {
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>(
      '.VPSidebar a[href^="' + SKILL_PATH_PREFIX + '"]'
    ),
  ]
  const member = currentIsMember || isMentorRole(currentRole)
  const loggedIn = currentRole !== null
  links.forEach((a) => {
    const textEl = (a.querySelector('.text') as HTMLElement) || a
    const href = a.getAttribute('href') || ''
    const slug = href.slice(SKILL_PATH_PREFIX.length).replace(/\/+$/, '').split('/')[0]
    const isMemberOnly = MEMBER_SKILL_SLUGS.includes(slug)
    const isLimitedFree = LIMITED_FREE_SKILL_SLUGS.includes(slug)
    // 会员专属课：非会员加锁（含免费登录用户）
    // 普通技能课：未登录加锁，已登录解锁
    // 白名单课：所有人解锁
    const unlocked = member
      || PUBLIC_SKILL_SLUGS.includes(slug)
      || (loggedIn && !isMemberOnly)
    // 清掉残留的 emoji 前缀（旧版本会往 textContent 塞 🔒/👑/🧧限免，升级后改用 data-attr）
    let text = textEl.textContent || ''
    if (text.startsWith('🔒 ') || text.startsWith('👑 ')) text = text.slice(3)
    if (text.startsWith('🧧限免 ')) text = text.slice(5)
    textEl.textContent = text
    // 清掉旧 data 标记
    delete textEl.dataset.skillLocked
    delete textEl.dataset.skillBadge
    if (!unlocked) {
      // 被拦截：
      //   会员专属课 → 👑（点进去提示升级会员）
      //   限时免费课 → 绿色「免费」徽章（点进去提示登录，注册后即可免费学）
      //   其他锁定课 → 🔒
      if (isLimitedFree) {
        textEl.dataset.skillBadge = 'free'
        textEl.dataset.skillLocked = '1'
      } else {
        const icon = isMemberOnly ? '👑' : '🔒'
        textEl.textContent = icon + ' ' + text
        textEl.dataset.skillLocked = '1'
      }
    } else if (isMemberOnly) {
      // 会员专属课：已解锁后保留 👑 emoji（会员尊享感）
      textEl.textContent = '👑 ' + text
    } else if (isLimitedFree) {
      // 限时免费课：已解锁后用绿色「免费」徽章
      textEl.dataset.skillBadge = 'free'
    }
  })
}

// 实战手册（playbooks）：管理员全开 + 按手册单独授权。
// 处理两类元素：
//  1. 手册分组标题（「广告打法手册」等）：管理员或该手册已授权 → 去锁；否则加 🔒
//  2. 手册内所有链接项：同上，按链接 href 里的 slug 逐个判断
// 分组标题不含「初级/中级/高级/进阶」关键字，applyLevelVisibility 不会处理它，
// 必须在这里单独处理。
function applyPlaybookVisibility() {
  const mentor = isMentorRole(currentRole)

  // 从手册链接的 href 里提取 slug，并判断该手册对当前用户是否可访问
  const slugFromHref = (href: string): string | null => {
    if (!href || !href.includes(PLAYBOOK_PATH_PREFIX)) return null
    const rest = href.split(PLAYBOOK_PATH_PREFIX)[1] || ''
    return rest.split('/')[0] || null
  }
  const canAccessSlug = (slug: string | null): boolean => {
    if (!slug) return false
    return mentor || currentPlaybookAccess.includes(slug)
  }

  const handbookLinks = [
    ...document.querySelectorAll<HTMLAnchorElement>(
      '.VPSidebar a[href^="' + PLAYBOOK_PATH_PREFIX + '"]'
    ),
  ]
  const processedTitles = new WeakSet()
  handbookLinks.forEach((a) => {
    // 沿 DOM 向上找 level-0 分组容器
    const section = (a.closest('.VPSidebarItem.level-0') as HTMLElement) || null
    if (!section || processedTitles.has(section)) return
    processedTitles.add(section)
    const titleEl = section.querySelector('.item > .text') as HTMLElement | null
    if (!titleEl) return
    // 分组标题始终保留 👑 标识（无论是否授权，都体现「付费专享」定位）
    // 先去掉残留的 emoji 前缀，再统一加回 👑，避免重复叠加
    let text = titleEl.textContent || ''
    if (text.startsWith('🔒 ') || text.startsWith('👑 ')) text = text.slice(3)
    titleEl.textContent = '👑 ' + text
  })

  // 处理手册内所有链接项（按各自 href 的 slug 判断）
  handbookLinks.forEach((a) => {
    const textEl = (a.querySelector('.text') as HTMLElement) || a
    let text = textEl.textContent || ''
    if (text.startsWith('🔒 ') || text.startsWith('👑 ')) text = text.slice(3)
    textEl.textContent = text
    delete textEl.dataset.playbookLocked
    const slug = slugFromHref(a.getAttribute('href') || '')
    if (!canAccessSlug(slug)) {
      textEl.textContent = '👑 ' + text
      textEl.dataset.playbookLocked = '1'
    }
  })
}

// 主课程五级：管理员全可见；非管理员受保护等级标 🔒，已授权的解锁。
function applyLevelVisibility() {
  const titles = getGroupTitles()
  // 管理员：所有分组可见，去掉所有 🔒
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
  // 非管理员：受保护等级始终可见，已授权的去掉 🔒，未授权的保留 🔒 标记锁定。
  // 未授权用户点击课程项后，由 CourseGate.vue 全屏遮罩拦截内容访问。
  titles.forEach((title) => {
    const text = (title.textContent || '').trim()
    const matchedKw = PROTECTED_KEYWORDS.find((kw) => text.includes(kw))
    if (!matchedKw) return // 非受保护等级，不动
    const group = title.closest('.group') as HTMLElement
    const section = title.closest('.VPSidebarItem.level-0') as HTMLElement
    if (currentAccessLevels.includes(matchedKw)) {
      // 已授权：显示，并把 🔒 换成 👑（会员尊享感）
      if (group) group.style.display = ''
      if (section) section.style.display = ''
      crownTitle(title)
    } else {
      // 未授权：保持显示，保留 🔒 锁定标识
      if (group) group.style.display = ''
      if (section) section.style.display = ''
      lockTitle(title, matchedKw)
    }
  })
}

async function loadRole(): Promise<{ role: string | null; accessLevels: string[]; isMember: boolean; playbookAccess: string[] }> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) return { role: null, accessLevels: [], isMember: false, playbookAccess: [] }
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
  // 拉实战手册授权（playbook_access，与 course_access 同构）
  let playbookAccess: string[] = []
  try {
    const { data: pbRows, error: pbErr } = await supabase
      .from('playbook_access')
      .select('playbook')
      .eq('user_id', session.session.user.id)
    if (!pbErr && pbRows) playbookAccess = pbRows.map((r: any) => r.playbook)
  } catch { /* 静默降级 */ }
  return {
    role: profile?.role || null,
    accessLevels,
    isMember: isMember(profile),
    playbookAccess,
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
      currentPlaybookAccess = profile?.playbookAccess || []
      applyVisibility()
    })
    // 首次补拉
    loadRole().then(({ role, accessLevels, isMember: member, playbookAccess }) => {
      currentRole = role
      currentAccessLevels = accessLevels
      currentIsMember = member
      currentPlaybookAccess = playbookAccess
      applyVisibility()
    })
  }

  // 等 DOM 渲染后再应用（路由切换后侧边栏刚重建）
  requestAnimationFrame(() => {
    requestAnimationFrame(applyVisibility)
  })
}
