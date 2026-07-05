import { onBeforeUnmount } from 'vue'

export function useIframeBridge(detailFrameRef) {
  function onFrameLoad() {
    const f = detailFrameRef.value
    if (!f) return
    try {
      f.contentWindow.postMessage({ type: 'ruoyi-iframe-resize' }, '*')
    } catch(e) { /* 跨域静默失败 */ }
  }

  function onTaskCompleted() {
    // 由子页面通过 ruoyi-task-completed 触发
  }

  const onMessage = (e) => {
    const f = detailFrameRef.value
    if (!f) return
    if (e.data?.type === 'ruoyi-iframe-height' && e.data.height > 200) {
      f.style.height = e.data.height + 'px'
    }
  }

  window.addEventListener('message', onMessage)
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))

  return { onFrameLoad, onTaskCompleted }
}
