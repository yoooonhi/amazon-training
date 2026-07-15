import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aljylrkepzwldvaslyfr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsanlscmtlcHp3bGR2YXNseWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc2MTMsImV4cCI6MjA5OTQxMzYxM30.1bQEio6-FL_E4wooyk-HpCq8bR5tfuqBr_EpZdtDino'

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
    // 拉该用户的课程等级授权（导师不需要，但查了也无害——导师走 isMentorRole 短路）
    const { data: accessRows } = await supabase
      .from('course_access')
      .select('level')
      .eq('user_id', session.user.id)
    const accessLevels = (accessRows || []).map((r: any) => r.level)
    // 把授权等级挂到 profile 上，各组件通过 authState.onChange 自动获取
    authState.set(session.user, { ...profile, accessLevels })
  } else {
    authState.set(null, null)
  }
})
