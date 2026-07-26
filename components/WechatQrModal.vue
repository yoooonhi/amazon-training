<script setup>
// 微信二维码放大弹窗（全局挂载）
// 监听 footer 里 #wechat-id 的点击 → 弹出二维码
import { ref, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
const copied = ref(false)
const SITE_TAG = 'www.pipishou.top'

const copySite = async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(SITE_TAG)
    } else {
      // 降级方案：旧浏览器/非 HTTPS 环境
      const ta = document.createElement('textarea')
      ta.value = SITE_TAG
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (e) {
    copied.value = false
  }
}

const close = () => {
  visible.value = false
  document.removeEventListener('keydown', onKeydown)
}
const onKeydown = (e) => {
  if (e.key === 'Escape') close()
}
const open = () => {
  visible.value = true
  document.addEventListener('keydown', onKeydown)
}

// SPA 路由切换后 footer 会重新渲染，需要重新绑定点击
let bound = null
const bind = () => {
  if (bound) bound.removeEventListener('click', open)
  bound = document.getElementById('wechat-id')
  if (bound) {
    bound.addEventListener('click', open)
    bound.setAttribute('role', 'button')
    bound.setAttribute('tabindex', '0')
    bound.addEventListener('keydown', onKeydown)
  }
}
// 路由切换后由主题层 dispatchEvent('wechat-qr-rebind') 触发重新绑定
const onRebind = () => setTimeout(bind, 50)

onMounted(() => {
  // footer 渲染较晚，延迟绑定
  setTimeout(bind, 300)
  setTimeout(bind, 1200)
  window.addEventListener('wechat-qr-rebind', onRebind)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('wechat-qr-rebind', onRebind)
  if (bound) bound.removeEventListener('click', open)
})

// 暴露给路由切换钩子重新绑定
defineExpose({ bind })
</script>

<template>
  <Teleport to="body">
    <Transition name="qr-fade">
      <div v-if="visible" class="qr-mask" @click="close" role="dialog" aria-modal="true" aria-label="微信二维码">
        <div class="qr-card" @click.stop>
          <img class="qr-img" src="/images/wechat-qrcode.jpg" alt="微信二维码" />
          <p class="qr-tip">扫码添加微信 · WJSXRQS_</p>
          <p class="qr-sub">
            添加微信请备注：<span
              class="copy-site"
              @click="copySite"
              role="button"
              tabindex="0"
              :title="copied ? '已复制！' : '点击复制'"
              @keydown.enter.prevent="copySite"
              @keydown.space.prevent="copySite"
            >{{ SITE_TAG }}<span class="copy-icon">{{ copied ? '✓' : '⧉' }}</span></span>
          </p>
          <Transition name="toast">
            <span v-if="copied" class="copy-toast">已复制到剪贴板</span>
          </Transition>
          <button class="qr-close" @click="close" aria-label="关闭">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.qr-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(3px);
  cursor: zoom-out;
}
.qr-card {
  position: relative;
  background: var(--vp-c-bg);
  border-radius: 16px;
  padding: 1.25rem 1.25rem 1.1rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  border: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: default;
  text-align: center;
}
.qr-img {
  width: min(280px, 70vw);
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 10px;
}
.qr-tip {
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.qr-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
.copy-site {
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline dashed var(--vp-c-brand-1) 1px;
  text-underline-offset: 3px;
  transition: opacity 0.15s;
  outline: none;
  border-radius: 3px;
}
.copy-site:hover { opacity: 0.8; }
.copy-site:focus-visible {
  background: var(--vp-c-brand-soft, rgba(52, 81, 178, 0.1));
}
.copy-icon {
  margin-left: 0.2rem;
  font-size: 0.75rem;
  opacity: 0.7;
}
.copy-toast {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
.qr-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  transition: all 0.15s;
}
.qr-close:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.qr-fade-enter-active, .qr-fade-leave-active {
  transition: opacity 0.2s;
}
.qr-fade-enter-active .qr-card,
.qr-fade-leave-active .qr-card {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}
.qr-fade-enter-from, .qr-fade-leave-to { opacity: 0; }
.qr-fade-enter-from .qr-card,
.qr-fade-leave-to .qr-card {
  transform: scale(0.85);
  opacity: 0;
}
</style>
