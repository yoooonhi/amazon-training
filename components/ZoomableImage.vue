<script setup>
// 通用图片查看器组件
// 用法：<ZoomableImage src="/images/foo.svg" alt="说明" />
// 功能：
//   - 图片右上角悬浮一个 🔍 放大按钮
//   - 点击图片或按钮 → 弹出全屏模态（黑色蒙版 + 居中大图）
//   - 模态内：滚轮缩放 / 点击图片切换 100%↔200% / 拖动平移
//   - ESC / 点击空白 / 点击 X 关闭
import { ref, computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  // 内联显示时的最大宽度（默认撑满容器，最大 1100px）
  maxWidth: { type: String, default: '1100px' },
})

const open = ref(false)
// 模态内图片的缩放与位移
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const wrapperStyle = computed(() => ({
  maxWidth: props.maxWidth,
}))

function show() {
  open.value = true
  scale.value = 1
  tx.value = 0
  ty.value = 0
}

function hide() {
  open.value = false
}

function toggleZoom() {
  // 在 100% 与 200% 之间切换
  if (scale.value > 1.5) {
    scale.value = 1
    tx.value = 0
    ty.value = 0
  } else {
    scale.value = 2
  }
}

function onWheel(e) {
  // 滚轮缩放，夹在 1x ~ 4x
  e.preventDefault()
  const next = scale.value + (e.deltaY < 0 ? 0.2 : -0.2)
  scale.value = Math.min(4, Math.max(1, Number(next.toFixed(2))))
  if (scale.value === 1) {
    tx.value = 0
    ty.value = 0
  }
}

function onKey(e) {
  if (e.key === 'Escape') hide()
}

// 拖动平移（仅在放大后有意义）
let dragging = false
let startX = 0
let startY = 0
let startTx = 0
let startTy = 0

function onDragStart(e) {
  if (scale.value === 1) return
  dragging = true
  startX = e.clientX
  startY = e.clientY
  startTx = tx.value
  startTy = ty.value
  // 阻止图片原生拖拽
  e.preventDefault()
}

function onDragMove(e) {
  if (!dragging) return
  tx.value = startTx + (e.clientX - startX)
  ty.value = startTy + (e.clientY - startY)
}

function onDragEnd() {
  dragging = false
}
</script>

<template>
  <div class="zoomable-wrap" :style="wrapperStyle">
    <img
      :src="src"
      :alt="alt"
      class="zoomable-img"
      loading="lazy"
      @click="show"
    />
    <button
      type="button"
      class="zoom-btn"
      :title="`放大查看：${alt}`"
      :aria-label="`放大查看：${alt}`"
      @click="show"
    >
      <span class="zoom-icon">🔍</span>
    </button>

    <Teleport to="body">
      <Transition name="zimg">
        <div
          v-if="open"
          class="zimg-mask"
          @click.self="hide"
          @wheel="onWheel"
          @keydown="onKey"
          tabindex="0"
        >
          <button
            type="button"
            class="zimg-close"
            title="关闭（ESC）"
            aria-label="关闭"
            @click="hide"
          >×</button>

          <div class="zimg-hint">{{ Math.round(scale * 100) }}% · 滚轮缩放 · 点击切换 · 放大后可拖动</div>

          <img
            :src="src"
            :alt="alt"
            class="zimg-full"
            :style="{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }"
            :class="{ draggable: scale > 1 }"
            @click="toggleZoom"
            @mousedown="onDragStart"
            @mousemove="onDragMove"
            @mouseup="onDragEnd"
            @mouseleave="onDragEnd"
            draggable="false"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.zoomable-wrap {
  position: relative;
  margin: 1rem auto;
  width: 100%;
  cursor: zoom-in;
}

.zoomable-img {
  display: block;
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: box-shadow 0.2s;
}
.zoomable-wrap:hover .zoomable-img {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 右上角放大按钮 */
.zoom-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(35, 40, 158, 0.85); /* 项目紫 #23289e 半透明 */
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  backdrop-filter: blur(4px);
}
.zoomable-wrap:hover .zoom-btn {
  opacity: 1;
}
.zoom-btn:hover {
  transform: scale(1.1);
}
.zoom-icon {
  font-size: 16px;
  line-height: 1;
}

/* 全屏模态 */
.zimg-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
  box-sizing: border-box;
}

.zimg-full {
  max-width: 92vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 8px;
  transition: transform 0.15s ease-out;
  user-select: none;
}
.zimg-full.draggable {
  cursor: grab;
}
.zimg-full.draggable:active {
  cursor: grabbing;
}

/* 关闭按钮 */
.zimg-close {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.zimg-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 顶部提示 */
.zimg-hint {
  position: absolute;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  white-space: nowrap;
  pointer-events: none;
}

/* 过渡动画 */
.zimg-enter-active,
.zimg-leave-active {
  transition: opacity 0.2s ease;
}
.zimg-enter-from,
.zimg-leave-to {
  opacity: 0;
}
</style>
