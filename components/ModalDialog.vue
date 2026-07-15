<script setup>
// macOS 风格对话框渲染组件
// 挂在全局（theme/index.ts 的 Layout 里），其他组件直接调 modalConfirm/modalAlert
import { modalState, closeModal } from '../lib/modal'

function handleKey(e) {
  if (!modalState.visible) return
  if (e.key === 'Escape') closeModal(modalState.type === 'confirm' ? false : true)
  if (e.key === 'Enter') closeModal(modalState.type === 'confirm' ? true : true)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modalState.visible"
        class="modal-mask"
        @click.self="closeModal(modalState.type === 'confirm' ? false : true)"
        tabindex="0"
        @keydown="handleKey"
      >
        <div class="modal-card">
          <div class="modal-icon" :class="modalState.type">
            {{ modalState.type === 'confirm' ? '⚠️' : 'ℹ️' }}
          </div>
          <div class="modal-body">
            <h3 class="modal-title">{{ modalState.title }}</h3>
            <p class="modal-message">{{ modalState.message }}</p>
          </div>
          <div class="modal-actions">
            <button
              v-if="modalState.type === 'confirm'"
              class="modal-btn cancel"
              @click="closeModal(false)"
            >取消</button>
            <button
              class="modal-btn primary"
              :class="{ danger: modalState.type === 'confirm' }"
              @click="closeModal(true)"
            >确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}
.modal-card {
  background: var(--vp-c-bg);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--vp-c-divider);
  padding: 1.5rem;
  min-width: min(320px, calc(100vw - 2rem));
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.modal-icon {
  font-size: 1.8rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
}
.modal-icon.confirm {
  background: rgba(255, 153, 0, 0.12);
}
.modal-icon.alert {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.1));
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.modal-message {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.modal-btn {
  padding: 0.45rem 1.2rem;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  min-width: 4rem;
}
.modal-btn:hover { opacity: 0.85; }
.modal-btn.cancel {
  background: var(--vp-c-bg);
}
.modal-btn.primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}
.modal-btn.primary.danger {
  background: #ef4444;
  border-color: #ef4444;
}

/* 过渡动画 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.2s, opacity 0.2s;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.95) translateY(-8px);
  opacity: 0;
}
</style>
