import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://aljylrkepzwldvaslyfr.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsanlscmtlcHp3bGR2YXNseWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc2MTMsImV4cCI6MjA5OTQxMzYxM30.1bQEio6-FL_E4wooyk-HpCq8bR5tfuqBr_EpZdtDino'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// 当前登录用户的状态（跨组件共享）
export const authState = {
  user: null as any,
  profile: null as any,
  listeners: [] as Function[],
  set(user: any, profile: any) {
    this.user = user
    this.profile = profile
    this.listeners.forEach(fn => fn(user, profile))
  },
  onChange(fn: Function) {
    this.listeners.push(fn)
  },
}

// 初始化：监听登录状态变化
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    // 拉 profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    // 拉该用户的课程等级授权（表可能还没建，用 try-catch 容错）
    let accessLevels: string[] = []
    try {
      const { data: accessRows, error: accessErr } = await supabase
        .from('course_access')
        .select('level')
        .eq('user_id', session.user.id)
      if (!accessErr && accessRows) {
        accessLevels = accessRows.map((r: any) => r.level)
      }
    } catch {
      // course_access 表不存在时静默降级
    }
    // 把授权等级挂到 profile 上，各组件通过 authState.onChange 自动获取
    authState.set(session.user, { ...profile, accessLevels })
  } else {
    authState.set(null, null)
  }
})
