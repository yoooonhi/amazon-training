<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  lessonId: { type: String, required: true },
  items: { type: Array, required: true } // ['我能做到XX', '我能做到YY', ...]
})

const STORAGE_KEY = 'amazon-training-checks'
const checks = ref({})
const isMounted = ref(false)

const allChecked = computed(() => props.items.every((_, i) => checks.value[`${props.lessonId}-${i}`]))

function loadChecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) checks.value = JSON.parse(raw)
  } catch (e) {
    checks.value = {}
  }
  isMounted.value = true
}

function toggle(key) {
  checks.value[key] = !checks.value[key]
}

// When all checked, also update the progress tracker
watch(allChecked, (val) => {
  if (!isMounted.value) return
  // Save checks
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checks.value))
  // Update progress
  const progressRaw = localStorage.getItem('amazon-training-progress')
  let progress = {}
  try { progress = JSON.parse(progressRaw) || {} } catch(e) {}
  if (val) {
    progress[props.lessonId] = { completed: true, completedAt: Date.now() }
  } else {
    delete progress[props.lessonId]
  }
  localStorage.setItem('amazon-training-progress', JSON.stringify(progress))
})

onMounted(loadChecks)
</script>

<template>
  <div v-if="isMounted" class="lesson-check">
    <div class="check-header">
      <span class="check-icon">✅</span>
      <span class="check-title">今日验收清单</span>
      <span class="check-status" :class="{ pass: allChecked }">
        {{ allChecked ? '全部通过' : `${items.filter((_, i) => checks[`${lessonId}-${i}`]).length}/${items.length}` }}
      </span>
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
      🎉 本课验收通过！进度已自动记录。
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
  font-size: 0.85rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.check-status.pass {
  background: var(--vp-c-brand-1);
  color: #fff;
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
