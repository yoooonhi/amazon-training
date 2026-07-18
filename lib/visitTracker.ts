// 网站访问埋点模块
// 访问定义：同一访客 24 小时内只算 1 次（关闭浏览器后再来、或跨天才算新的）
import { supabase } from './supabase'
import { getLessonIdByPath } from './curriculum'

const VISITOR_KEY = 'amazon-training-visitor-id'
const LAST_VISIT_KEY = 'amazon-training-last-visit'
const LAST_LESSON_KEY = 'amazon-training-last-lesson'
const DAY_MS = 24 * 60 * 60 * 1000

// 所有课程内容目录前缀（classifyPage 和记录最后位置共用）
// 注意：含 playbooks（实战手册），其 lessonId 也在 pathToLessonId 映射表里
const CONTENT_PREFIXES = [
  '/content/modules/',
  '/content/beginner/',
  '/content/intermediate/',
  '/content/advanced/',
  '/content/expert/',
  '/content/skills/',
  '/content/playbooks/',
]

// 获取或生成访客永久 ID
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

// 距上次记录是否已超过 24 小时（满足才记一次）
function shouldRecord(): boolean {
  try {
    const last = localStorage.getItem(LAST_VISIT_KEY)
    if (!last) return true
    return (Date.now() - parseInt(last)) > DAY_MS
  } catch {
    return true
  }
}

// 页面路径归类
function classifyPage(path: string): string {
  if (path === '/' || path === '' || path.endsWith('/index.html')) return 'home'
  if (path.startsWith('/dashboard')) return 'dashboard'
  if (path.startsWith('/content/00-overview')) return 'overview'
  // 匹配任意课程内容目录（入门/初级/中级/高级/进阶）
  for (const prefix of CONTENT_PREFIXES) {
    if (path.startsWith(prefix)) {
      // 把 URL 路径还原成 getLessonIdByPath 认的相对路径格式
      const rel = ('content/' + path.slice('/content/'.length)).replace(/\.html$/, '.md')
      return getLessonIdByPath(rel) ? 'lesson' : 'other'
    }
  }
  return 'other'
}

// 记录一次访问（fire-and-forget，失败静默，不阻塞页面）
export async function recordVisit(): Promise<void> {
  if (!shouldRecord()) return // 24h 内已记过，跳过
  try {
    // 先拿登录态（不依赖组件上下文，直接查 session）
    const { data: session } = await supabase.auth.getSession()
    const user = session.session?.user || null

    // 标记已记录（先标记，防止插入失败时反复重试刷量）
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))

    await supabase.from('site_visits').insert({
      visitor_id: getVisitorId(),
      path: location.pathname,
      page_type: classifyPage(location.pathname),
      is_logged_in: !!user,
      user_id: user?.id || null,
    })
  } catch {
    // 静默失败，不影响用户体验
  }
}

// ===== 记录用户最后学习的课程位置 =====

/**
 * 记录当前页面为"最后学习的课程"。
 * 仅当当前页是课程页时才写 localStorage，否则保留之前的记录。
 * 在路由切换时调用。
 */
export function recordLastLesson(): void {
  try {
    const path = location.pathname
    // 判断是否是课程内容页
    const isContent = CONTENT_PREFIXES.some((p) => path.startsWith(p))
    if (!isContent) return
    // 还原成 getLessonIdByPath 认的相对路径
    const rel = ('content/' + path.slice('/content/'.length)).replace(/\.html$/, '.md')
    const lessonId = getLessonIdByPath(rel)
    if (!lessonId) return // 不是有效的课程页（如目录页）
    localStorage.setItem(
      LAST_LESSON_KEY,
      JSON.stringify({ path, lessonId, ts: Date.now() })
    )
  } catch {
    // 静默失败
  }
}

export interface LastLesson {
  path: string
  lessonId: string
  ts: number
}

/**
 * 读取用户最后学习的课程位置。
 * 返回 null 表示没有记录（首次访问）。
 */
export function getLastLesson(): LastLesson | null {
  try {
    const raw = localStorage.getItem(LAST_LESSON_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.path || !data?.lessonId) return null
    return data as LastLesson
  } catch {
    return null
  }
}
