<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useData } from 'vitepress'
import { supabase, authState } from '../lib/supabase'
import { getLessonIdByPath } from '../lib/curriculum'

// 大拇指 SVG（取自参考稿，正反两个方向用 CSS scaleY(-1) 翻转实现）
const thumbSvg = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M2.5 18.334h-.833a.417.417 0 0 1-.417-.417V7.083a.417.417 0 0 1 .417-.416H2.5a.417.417 0 0 1 .417.416v10.834a.417.417 0 0 1-.417.416zm9.999-11.668h3.574c2.487 0 3.058 2.195 2.487 3.84l-2.487 6.545c-.21.761-.91 1.29-1.708 1.29H4.577a.417.417 0 0 1-.417-.417V7.082a.417.417 0 0 1 .417-.416h.856a.833.833 0 0 0 .682-.355l3.46-4.92c.234-.373.866-.66 1.54-.352 1.01.46 2.22 1.464 2.22 3.13 0 .627-.28 1.46-.836 2.497z"></path></svg>`

// --------------------------------------------------------
// 1. 路径 → lessonId 推导（与 Comments 一致的零侵入注入）
// --------------------------------------------------------
const { page } = useData()
const lessonId = computed(() => getLessonIdByPath(page.value?.relativePath || ''))

// --------------------------------------------------------
// 2. 状态
// --------------------------------------------------------
const isMounted = ref(false)
const currentUser = ref(null)
const loading = ref(false)
const errorMsg = ref('')
const submitting = ref(false)

const myChoice = ref(null)       // null=未提交 / true=有帮助 / false=无帮助（从库回显）
const justSubmitted = ref(false) // 刚提交成功（用于显示绿色 ✓ 成功提示）
const toast = ref('')            // 操作后的轻提示文案（取消/已切换）

// --------------------------------------------------------
// 3. 加载当前用户在本课的反馈（回显已选状态）
// --------------------------------------------------------
async function loadMyFeedback() {
  if (!lessonId.value || !currentUser.value) {
    myChoice.value = null
    justSubmitted.value = false
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const { data, error } = await supabase
      .from('lesson_feedback')
      .select('helpful, created_at')
      .eq('lesson_id', lessonId.value)
      .eq('user_id', currentUser.value.id)
      .maybeSingle() // 复合主键下最多一条；无记录返回 null
    if (error) throw error
    myChoice.value = data ? data.helpful : null
    justSubmitted.value = false
  } catch (e) {
    errorMsg.value = '反馈状态加载失败：' + (e.message || e)
  } finally {
    loading.value = false
  }
}

// --------------------------------------------------------
// 4. 点击反馈按钮：toggle + 可切换（与 comment_likes 的点赞/取消点赞一致）
//    - 未选 → 点某项      = insert（新增反馈）
//    - 已选 → 再点当前项  = delete（取消反馈，回到未选）
//    - 已选 → 点另一项    = delete 旧 + insert 新（切换选择）
//    所有分支失败均回查一次，保证 UI 与库一致。
// --------------------------------------------------------
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  justSubmitted.value = false
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

async function submit(helpful) {
  if (!currentUser.value || !lessonId.value) return
  if (submitting.value) return
  submitting.value = true
  errorMsg.value = ''

  const prev = myChoice.value
  try {
    // (A) 取消：再点当前已选项 → 删除记录
    if (prev === helpful) {
      const { error } = await supabase
        .from('lesson_feedback')
        .delete()
        .eq('lesson_id', lessonId.value)
        .eq('user_id', currentUser.value.id)
      if (error) throw error
      myChoice.value = null
      justSubmitted.value = false
      showToast('已取消反馈')
      return
    }

    // (B) 切换：之前选过另一项 → 先删旧记录
    if (prev !== null) {
      await supabase
        .from('lesson_feedback')
        .delete()
        .eq('lesson_id', lessonId.value)
        .eq('user_id', currentUser.value.id)
    }

    // (C) 新增（首次或切换后）→ 插入
    const { error } = await supabase
      .from('lesson_feedback')
      .insert({
        lesson_id: lessonId.value,
        user_id: currentUser.value.id,
        helpful,
      })
    if (error) {
      // 23505 = unique_violation：本课已有记录（并发/状态不同步），回查回显
      if (error.code === '23505') {
        await loadMyFeedback()
        return
      }
      throw error
    }
    myChoice.value = helpful
    justSubmitted.value = true
  } catch (e) {
    errorMsg.value = '操作失败：' + (e.message || e) + '（若刚建表，请检查是否已在 Supabase 执行建表 SQL）'
    // 出错后回查，避免 UI 与库不一致
    await loadMyFeedback()
  } finally {
    submitting.value = false
  }
}

// --------------------------------------------------------
// 5. 生命周期
// --------------------------------------------------------
onMounted(() => {
  isMounted.value = true
  authState.onChange(async (user) => {
    currentUser.value = user
    await loadMyFeedback()
  })
  supabase.auth.getSession().then(async ({ data }) => {
    currentUser.value = data.session?.user || null
    await loadMyFeedback()
  })
})

// SPA 切课时重新加载本课反馈状态（避免竞态）
watch(lessonId, async () => {
  await loadMyFeedback()
})
</script>

<template>
  <div v-if="isMounted && lessonId" class="feedback-section">
    <span class="feedback-title">本文是否对你有帮助</span>

    <!-- 未登录：提示登录后反馈 -->
    <div v-if="!currentUser" class="feedback-login-hint">
      🔒 登录后可以反馈本课对你是否有帮助
    </div>

    <!-- 已登录：反馈区（可切换、可取消，再次点击当前项即撤销） -->
    <div v-else class="feedback-options">
      <button
        type="button"
        class="feedback-option"
        :class="{ selected: myChoice === true }"
        :disabled="submitting"
        :title="myChoice === true ? '再点一次取消反馈' : '标记为有帮助'"
        @click="submit(true)"
      >
        <span class="feedback-thumb" v-html="thumbSvg"></span>
        <span class="feedback-label">有帮助</span>
      </button>
      <button
        type="button"
        class="feedback-option"
        :class="{ selected: myChoice === false }"
        :disabled="submitting"
        :title="myChoice === false ? '再点一次取消反馈' : '标记为无帮助'"
        @click="submit(false)"
      >
        <span class="feedback-thumb flip" v-html="thumbSvg"></span>
        <span class="feedback-label">无帮助</span>
      </button>
    </div>

    <!-- 提交成功提示 -->
    <div v-if="justSubmitted" class="feedback-success">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path fill="#55C948" d="M12 23c6.075 0 11-4.924 11-11S18.075 1 12 1 1 5.924 1 12s4.924 11 11 11Z" transform="scale(0.92) translate(1,1)"/>
        <path fill="white" d="M17.396 9.82a.832.832 0 0 0 0-1.176l-.486-.486a.832.832 0 0 0-1.176 0L10.472 13.426l-2.028-2.027a.832.832 0 0 0-1.176 0l-.486.486a.832.832 0 0 0 0 1.176l2.917 2.917a.833.833 0 0 0 1.037.118 1 1 0 0 0 .166-.118l6.494-6.157Z"/>
      </svg>
      <span>提交成功，感谢你的反馈！</span>
    </div>

    <!-- 操作后轻提示（取消 / 切换） -->
    <div v-else-if="toast" class="feedback-toast">{{ toast }}</div>

    <!-- 已选状态静默提示（可再次点击取消/切换） -->
    <div v-else-if="myChoice !== null && !loading" class="feedback-locked-hint">
      你已反馈「{{ myChoice ? '有帮助' : '无帮助' }}」· 可点击切换或取消
    </div>

    <!-- 错误 -->
    <div v-if="errorMsg" class="feedback-error">{{ errorMsg }}</div>
  </div>
</template>

<style scoped>
.feedback-section {
  margin: 1.5rem 0 0;
  padding: 1.25rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.feedback-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.feedback-login-hint {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

.feedback-options {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.feedback-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 1.4rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
  font: inherit;
  min-width: 92px;
}
.feedback-option:hover:not(:disabled) {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.06));
}
.feedback-option.selected {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.1));
  font-weight: 600;
}
.feedback-option:disabled {
  cursor: default;
  opacity: 0.6; /* 仅提交瞬间置灰，完成后恢复 */
}

.feedback-thumb {
  display: inline-flex;
  line-height: 0;
}
.feedback-thumb.flip {
  transform: scaleY(-1); /* 大拇指上下翻转 = 踩 */
}

.feedback-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.feedback-success {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #16a34a;
}

.feedback-toast {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.feedback-locked-hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.feedback-error {
  font-size: 0.8rem;
  color: #ef4444;
}
</style>
