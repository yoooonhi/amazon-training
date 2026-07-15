<script setup>
import { ref, computed, onMounted } from 'vue'
import { authState, supabase } from '../lib/supabase'
import { curriculum } from '../lib/curriculum'
import { getLastLesson } from '../lib/visitTracker'
import { getLevelByPath, isLevelAccessible, isMentorRole } from '../lib/accessControl'

const isMounted = ref(false)
const lastLesson = ref(null) // { path, lessonId, ts }
const role = ref(null)

// 根据 lessonId 反查课程标题（等级 + 课号 + 模块名）
const lessonLabel = computed(() => {
  if (!lastLesson.value) return ''
  const { lessonId, path } = lastLesson.value
  for (const w of curriculum) {
    if (w.lessons.includes(lessonId)) {
      const idx = w.lessons.indexOf(lessonId) + 1
      return `${w.level}${w.week}.${idx} ${w.title}`
    }
  }
  // 兜底：找不到课程信息，用路径
  return path
})

// 是否应该显示卡片
const shouldShow = computed(() => {
  if (!lastLesson.value) return false
  // 检查这节课当前用户是否有权访问
  const level = getLevelByPath(lastLesson.value.path)
  return isLevelAccessible(level, role.value)
})

// 时间格式化
const timeAgo = computed(() => {
  if (!lastLesson.value?.ts) return ''
  const diff = Date.now() - lastLesson.value.ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return ''
})

onMounted(() => {
  isMounted.value = true
  lastLesson.value = getLastLesson()

  // 订阅登录状态（拿 role 做权限判断）
  authState.onChange((_user, profile) => {
    role.value = profile?.role || null
  })
  // 首次补拉 session
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()
      role.value = profile?.role || null
    } else {
      role.value = null
    }
  })
})
</script>

<template>
  <a
    v-if="isMounted && shouldShow"
    :href="lastLesson.path"
    class="continue-card"
  >
    <div class="cc-left">
      <span class="cc-icon">📖</span>
      <div class="cc-text">
        <div class="cc-label">继续学习</div>
        <div class="cc-title">{{ lessonLabel }}</div>
      </div>
    </div>
    <div class="cc-right">
      <span v-if="timeAgo" class="cc-time">{{ timeAgo }}</span>
      <span class="cc-arrow">→</span>
    </div>
  </a>
</template>

<style scoped>
.continue-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1rem 0 0.5rem;
  padding: 0.9rem 1.1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-brand-1);
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}
.continue-card:hover {
  border-color: var(--vp-c-brand-2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
.cc-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.cc-icon {
  font-size: 1.4rem;
  line-height: 1;
}
.cc-text {
  min-width: 0;
}
.cc-label {
  font-size: 0.75rem;
  color: var(--vp-c-brand-1);
  font-weight: 700;
  margin-bottom: 0.15rem;
}
.cc-title {
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}
.cc-time {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.cc-arrow {
  font-size: 1.1rem;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}
</style>
