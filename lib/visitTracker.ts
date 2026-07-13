// 网站访问埋点模块
// 访问定义：同一访客 24 小时内只算 1 次（关闭浏览器后再来、或跨天才算新的）
import { supabase } from './supabase'
import { getLessonIdByPath } from './curriculum'

const VISITOR_KEY = 'amazon-training-visitor-id'
const LAST_VISIT_KEY = 'amazon-training-last-visit'
const DAY_MS = 24 * 60 * 60 * 1000

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
  if (path.startsWith('/content/modules/')) {
    // 复用课程清单判断是否是课程页
    const rel = path.replace(/^\/content\/modules\//, 'content/modules/').replace(/\.html$/, '.md')
    return getLessonIdByPath(rel) ? 'lesson' : 'other'
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
