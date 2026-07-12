<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, authState } from '../lib/supabase'

const props = defineProps({
  lessonId: { type: String, required: true },
  items: { type: Array, required: true }
})

const LOCAL_CHECKS_KEY = 'amazon-training-checks'
const LOCAL_PROGRESS_KEY = 'amazon-training-progress'

const checks = ref({})
const isMounted = ref(false)
const isLoggedIn = ref(false)
const saving = ref(false)

const allChecked = computed(() => props.items.every((_, i) => checks.value[`${props.lessonId}-${i}`]))

function loadChecks() {
  try {
    const raw = localStorage.getItem(LOCAL_CHECKS_KEY)
    if (raw) checks.value = JSON.parse(raw)
  } catch (e) {
    checks.value = {}
  }
}

async function loadRemoteChecks() {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) return
  // 拉这节课的进度看是否完成（验收清单明细也存云端）
  const { data } = await supabase.from('progress')
    .select('completed')
    .eq('lesson_id', props.lessonId)
    .single()
  if (data?.completed) {
    // 如果远程标记完成，本地全勾上
    props.items.forEach((_, i) => { checks.value[`${props.lessonId}-${i}`] = true })
  }
}

async function toggle(key) {
  checks.value[key] = !checks.value[key]
  // 始终同步到本地（游客也能用）
  localStorage.setItem(LOCAL_CHECKS_KEY, JSON.stringify(checks.value))

  // 更新本地 progress
  updateLocalProgress()

  // 直接检查 Supabase session 是否登录，不依赖 isLoggedIn 状态
  await syncToRemote()
}

function updateLocalProgress() {
  let localProgress = {}
  try { localProgress = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}') } catch(e) {}
  if (allChecked.value) {
    localProgress[props.lessonId] = { completed: true, completedAt: Date.now() }
  } else {
    delete localProgress[props.lessonId]
  }
  localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(localProgress))
}

async function syncToRemote() {
  saving.value = true
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) { saving.value = false; return }

  await supabase.from('progress').upsert({
    lesson_id: props.lessonId,
    completed: allChecked.value,
    completed_at: allChecked.value ? new Date().toISOString() : null,
  }, { onConflict: 'user_id,lesson_id' })
  saving.value = false
}

onMounted(() => {
  loadChecks()
  isMounted.value = true
  authState.onChange(async (user) => {
    isLoggedIn.value = !!user
    if (user) await loadRemoteChecks()
  })
  supabase.auth.getSession().then(async ({ data }) => {
    isLoggedIn.value = !!data.session?.user
    if (data.session?.user) await loadRemoteChecks()
  })
})
</script>

<template>
  <div v-if="isMounted" class="lesson-check">
    <div class="check-header">
      <span class="check-icon">✅</span>
      <span class="check-title">今日验收清单</span>
      <span class="check-status" :class="{ pass: allChecked }">
        {{ allChecked ? '全部通过' : `${items.filter((_, i) => checks[`${lessonId}-${i}`]).length}/${items.length}` }}
      </span>
      <span v-if="saving" class="saving-hint">同步中...</span>
    </div>
    <div class="check-list">
      <label
        v-for="(item, i) in items"
        :key="i"
        class="check-item"
        :class="{ checked: checks[`${lessonId}-${i}`] }"
      >
        <input
          type="checkbox"
          :checked="!!checks[`${lessonId}-${i}`]"
          @change="toggle(`${lessonId}-${i}`)"
        />
        <span class="check-text">{{ item }}</span>
      </label>
    </div>
    <div v-if="allChecked" class="check-celebrate">
      🎉 本课验收通过！{{ isLoggedIn ? '进度已同步到云端。' : '进度已记录（登录可跨设备同步）。' }}
    </div>
  </div>
</template>

<style scoped>
.lesson-check {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.check-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.check-icon {
  font-size: 1.2rem;
}
.check-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}
.check-status {
  margin-left: auto;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.saving-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.check-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: all 0.15s;
}
.check-item:hover {
  border-color: var(--vp-c-brand-2);
}
.check-item.checked {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  border-color: var(--vp-c-brand-1);
}
.check-item input[type="checkbox"] {
  margin-top: 0.15rem;
  width: 18px;
  height: 18px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
  flex-shrink: 0;
}
.check-text {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}
.check-item.checked .check-text {
  text-decoration: line-through;
  color: var(--vp-c-text-2);
}
.check-celebrate {
  margin-top: 1rem;
  padding: 0.75rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
  border-radius: 8px;
}
</style>
