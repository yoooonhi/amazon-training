/**
 * 课程权限控制
 *
 * 三套机制：
 * 1. 主课程五级体系：入门 / 初级 / 中级 / 高级 / 进阶
 *    - 入门：全体学员可见
 *    - 其余等级：仅管理员（mentor / admin）可见，内测阶段
 *    - 开放某级课程给全体学员：往 publicLevels 里加即可。
 *
 * 2. 技能补给站：登录即可见
 *    - 第一课（domain-basics）对所有访客公开
 *    - 其余技能课（及后续新增的）需登录后才可访问
 *    - 控制白名单见 PUBLIC_SKILL_SLUGS
 *
 * 3. 实战手册（playbooks）：仅管理员可见
 *    - 独立参考栏目，不进五级体系，不占学习进度
 *    - 当前为内测阶段，只有 mentor / admin 可访问
 *    - 未来要开放时，改 isPlaybookAccessible 加条件即可
 *
 * 管理员始终可访问所有内容。
 */

// 所有课程等级（顺序即展示顺序）
export const LEVELS = ['入门', '初级', '中级', '高级', '进阶'] as const
export type Level = (typeof LEVELS)[number]

// 等级 → URL 路径前缀（对应 content/ 下的目录名）
export const LEVEL_PATH_PREFIX: Record<Level, string> = {
  入门: '/content/modules/',
  初级: '/content/beginner/',
  中级: '/content/intermediate/',
  高级: '/content/advanced/',
  进阶: '/content/expert/',
}

// 反向映射：路径前缀 → 等级
const PREFIX_TO_LEVEL: Record<string, Level> = Object.fromEntries(
  Object.entries(LEVEL_PATH_PREFIX).map(([level, prefix]) => [prefix, level as Level])
)

/**
 * 当前已对全体学员开放的等级。
 * 管理员（mentor / admin）始终可访问所有等级，不受此限制。
 * 要开放新等级，往数组里加即可。
 */
export const publicLevels: Level[] = ['入门']

/**
 * 判断一个 role 是否为管理员（含管理员）。
 * 全项目统一口径：mentor 和 admin 都放行。
 */
export function isMentorRole(role: string | null | undefined): boolean {
  return role === 'mentor' || role === 'admin'
}

/**
 * 根据当前页面路径，判断它属于哪个等级。
 * 不属于任何等级（如首页、总览页）返回 null。
 */
export function getLevelByPath(path: string): Level | null {
  for (const [prefix, level] of Object.entries(PREFIX_TO_LEVEL)) {
    if (path.startsWith(prefix)) return level
  }
  return null
}

/**
 * 判断某等级是否对指定角色开放。
 * - 管理员：所有等级都开放
 * - 全局开放（publicLevels）：所有人可访问
 * - 个人授权（accessLevels）：该用户被管理员单独授权的等级
 */
export function isLevelAccessible(
  level: Level | null,
  role: string | null | undefined,
  accessLevels?: string[] | null
): boolean {
  if (!level) return true // 非课程页面，不拦截
  if (isMentorRole(role)) return true // 管理员全放行
  if (publicLevels.includes(level)) return true // 全局开放
  if (accessLevels?.includes(level)) return true // 个人授权
  return false
}

// ===== 技能补给站：登录可见 =====
// 技能课路径前缀
export const SKILL_PATH_PREFIX = '/content/skills/'

/**
 * 技能补给站中免费公开的课（slug 白名单）。
 * 只有列在这里的课对所有访客开放；其余技能课需登录后才可访问。
 * 默认只开放第一课，后续新增的技能课都默认需要登录。
 */
export const PUBLIC_SKILL_SLUGS = ['domain-basics']

/**
 * 会员专属的技能课（slug 白名单）。
 * 只有付费会员（is_member）或管理员可访问；免费登录用户和游客被拦截。
 * 要把某门技能课设为会员专属，把它的 slug 加到这个数组里。
 */
export const MEMBER_SKILL_SLUGS = ['excel-for-ops']

/**
 * 判断是否为付费会员。
 * - 管理员 / 管理员：视为会员（避免被技能站门控拦截）
 * - profile.is_member === true：付费会员
 * 其余（含未登录、免费登录用户）返回 false。
 */
export function isMember(profile: any | null | undefined): boolean {
  if (!profile) return false
  if (isMentorRole(profile.role)) return true
  return profile.is_member === true
}

/**
 * 判断路径是否属于技能补给站。
 */
export function isSkillPath(path: string): boolean {
  return path.startsWith(SKILL_PATH_PREFIX)
}

/**
 * 从技能路径中提取 slug。
 * 如 '/content/skills/phishing-detection' → 'phishing-detection'
 */
export function getSkillSlug(path: string): string | null {
  if (!isSkillPath(path)) return null
  return path.slice(SKILL_PATH_PREFIX.length).replace(/\/+$/, '').split('/')[0]
}

/**
 * 判断某技能课是否对指定角色开放。
 * - 管理员：全部开放
 * - 会员专属（MEMBER_SKILL_SLUGS）：仅付费会员可访问
 * - 已登录（任意角色，含免费用户）：其余技能课全部开放
 * - 白名单（PUBLIC_SKILL_SLUGS）：对所有访客开放
 * - 其余（未登录访客）：不可访问
 */
export function isSkillAccessible(
  path: string,
  profile: any | null | undefined
): boolean {
  if (isMentorRole(profile?.role)) return true
  const slug = getSkillSlug(path)
  // 会员专属技能课：只有付费会员能看，免费用户和游客拦截
  if (slug && MEMBER_SKILL_SLUGS.includes(slug)) {
    return isMember(profile)
  }
  if (profile?.role) return true // 任意已登录用户
  if (slug && PUBLIC_SKILL_SLUGS.includes(slug)) return true
  return false
}

// ===== 实战手册（playbooks）：仅管理员可见 =====
// 独立参考栏目，不进五级体系，不占学习进度。
// 当前为内测阶段：只有 mentor / admin 可访问。
// 未来要开放时，改 isPlaybookAccessible 加条件即可。
export const PLAYBOOK_PATH_PREFIX = '/content/playbooks/'

/**
 * 判断路径是否属于实战手册栏目。
 */
export function isPlaybookPath(path: string): boolean {
  return path.startsWith(PLAYBOOK_PATH_PREFIX)
}

/**
 * 判断实战手册是否对当前用户开放。
 * - 管理员（mentor / admin）：可访问
 * - 其余（含付费会员、免费用户、游客）：拦截
 *
 * 这是手册的"仅管理员可见"档——比技能站（登录可见）
 * 和会员专属（付费会员可见）都更严，符合"内测"语义。
 */
export function isPlaybookAccessible(profile: any | null | undefined): boolean {
  return isMentorRole(profile?.role)
}

/**
 * 判断某路径是否对指定角色开放。
 * 便捷组合：getLevelByPath + isLevelAccessible（主课程） + 技能课登录校验 + 手册管理员校验。
 *
 * profile 为当前用户的完整 profile（含 role、is_member、accessLevels）。
 * 兼容旧调用：若只传了 role，主课程判定仍可用。
 */
export function isPathAccessible(
  path: string,
  profile?: any | null,
  accessLevels?: string[] | null
): boolean {
  // 实战手册：仅管理员可见
  if (isPlaybookPath(path)) {
    return isPlaybookAccessible(profile)
  }
  // 技能补给站：登录可见
  if (isSkillPath(path)) {
    return isSkillAccessible(path, profile)
  }
  // 主课程：等级授权
  const role = profile?.role ?? null
  return isLevelAccessible(getLevelByPath(path), role, accessLevels ?? profile?.accessLevels)
}
