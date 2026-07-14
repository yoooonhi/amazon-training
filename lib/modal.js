// macOS 风格对话框的状态管理（单例）
// 用法：组件里 import { modalState, modalConfirm, modalAlert } 后，
//   - 在模板挂 <ModalDialog /> 渲染
//   - 用 await modalConfirm('...') / await modalAlert('...') 调用

import { reactive } from 'vue'

export const modalState = reactive({
  visible: false,
  type: 'alert',     // alert | confirm
  title: '',
  message: '',
  resolve: null,
})

// alert：仅一个确定按钮
export function modalAlert(message, title = '提示') {
  return new Promise((resolve) => {
    Object.assign(modalState, {
      visible: true,
      type: 'alert',
      title,
      message,
      resolve,
    })
  })
}

// confirm：确定/取消，resolve(boolean)
export function modalConfirm(message, title = '请确认') {
  return new Promise((resolve) => {
    Object.assign(modalState, {
      visible: true,
      type: 'confirm',
      title,
      message,
      resolve,
    })
  })
}

// 关闭（内部用）
export function closeModal(result) {
  if (modalState.resolve) {
    modalState.resolve(result)
    modalState.resolve = null
  }
  modalState.visible = false
}
