<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  lessonId: { type: String, required: true },
  questions: { type: Array, required: true }
  // Each question: { q: '题目', type: 'truefalse'|'single', options: ['A','B','C','D'], answer: 0 (index), explain: '解析' }
})

const answers = ref({}) // { qIndex: selectedIndex }
const revealed = ref({}) // { qIndex: true }
const isMounted = ref(false)

function selectAnswer(qIndex, optIndex) {
  if (revealed.value[qIndex]) return
  answers.value[qIndex] = optIndex
}

function reveal(qIndex) {
  if (answers.value[qIndex] === undefined) return
  revealed.value[qIndex] = true
}

function isCorrect(qIndex) {
  return answers.value[qIndex] === props.questions[qIndex].answer
}

onMounted(() => { isMounted.value = true })
</script>

<template>
  <div v-if="isMounted" class="self-test">
    <div class="test-header">
      <span class="test-icon">📝</span>
      <span class="test-title">自测题</span>
    </div>
    <div v-for="(question, qi) in questions" :key="qi" class="question-block">
      <div class="question-text">
        <span class="q-num">Q{{ qi + 1 }}</span>
        <span class="q-type">{{ question.type === 'truefalse' ? '判断题' : '单选题' }}</span>
        {{ question.q }}
      </div>
      <div class="options">
        <button
          v-for="(opt, oi) in question.options"
          :key="oi"
          class="option-btn"
          :class="{
            selected: answers[qi] === oi,
            correct: revealed[qi] && oi === question.answer,
            wrong: revealed[qi] && answers[qi] === oi && oi !== question.answer
          }"
          @click="selectAnswer(qi, oi)"
          :disabled="revealed[qi]"
        >
          <span class="opt-letter">{{ String.fromCharCode(65 + oi) }}</span>
          {{ opt }}
        </button>
      </div>
      <button
        v-if="answers[qi] !== undefined && !revealed[qi]"
        class="reveal-btn"
        @click="reveal(qi)"
      >
        确认答案
      </button>
      <div v-if="revealed[qi]" class="explain-box" :class="{ correct: isCorrect(qi), wrong: !isCorrect(qi) }">
        <div class="explain-result">
          {{ isCorrect(qi) ? '✅ 回答正确' : '❌ 回答错误' }}
          <span class="correct-answer">正确答案：{{ String.fromCharCode(65 + question.answer) }}</span>
        </div>
        <div class="explain-text">{{ question.explain }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.self-test {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}
.test-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.test-icon { font-size: 1.2rem; }
.test-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}
.question-block {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.question-block:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.question-text {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  margin-bottom: 0.75rem;
}
.q-num {
  font-weight: 800;
  color: var(--vp-c-brand-1);
  margin-right: 0.4rem;
}
.q-type {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  background: var(--vp-c-divider);
  color: var(--vp-c-text-2);
  margin-right: 0.4rem;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.option-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.option-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg-soft);
}
.option-btn.selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.08));
}
.option-btn.correct {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}
.option-btn.wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
.option-btn:disabled {
  cursor: default;
}
.opt-letter {
  font-weight: 700;
  min-width: 1.2rem;
}
.reveal-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}
.reveal-btn:hover { opacity: 0.9; }
.explain-box {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
}
.explain-box.correct {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.explain-box.wrong {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.explain-result {
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.correct-answer {
  font-weight: 400;
  margin-left: 0.5rem;
  color: var(--vp-c-text-2);
}
.explain-text {
  color: var(--vp-c-text-1);
  line-height: 1.6;
}
</style>
