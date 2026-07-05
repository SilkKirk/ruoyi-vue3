<template>
  <el-dialog :title="title" v-model="visible" width="80%" top="5vh"
    :close-on-click-modal="false" destroy-on-close
    @opened="onOpened" @closed="onClosed">
    <div class="diagram-wrapper" v-loading="loading">
      <div ref="diagramRef" class="diagram-canvas"></div>
      <div class="zoom-buttons">
        <span class="zoom-btn" @click="zoomIn" title="放大">＋</span>
        <span class="zoom-btn" @click="zoomOut" title="缩小">－</span>
        <span class="zoom-btn" @click="zoomFit" title="适应窗口">⊡</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import { getDiagramInfo } from '@/api/workflow/definition'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  definitionId: { type: String, default: '' },
  instanceId: { type: String, default: '' },
  title: { type: String, default: '流程图跟踪' }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const loading = ref(false)
const diagramRef = ref(null)
let bpmnViewer = null

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  if (!val) {
    emit('update:modelValue', false)
  }
})

async function onOpened() {
  if (!diagramRef.value) return
  loading.value = true
  try {
    const res = await getDiagramInfo(props.definitionId, props.instanceId)
    const data = res.data
    if (!data || !data.bpmnXml) return

    const xml = data.bpmnXml
      .replace(/xmlns:flowable="http:\/\/flowable\.org\/bpmn"/g,
               'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"')
      .replace(/flowable:([a-zA-Z]+)/g, 'camunda:$1')

    bpmnViewer = new NavigatedViewer({
      container: diagramRef.value,
      zoomScroll: { scrollToZoom: true }
    })

    await bpmnViewer.importXML(xml)

    const canvas = bpmnViewer.get('canvas')
    canvas.resized()
    canvas.zoom('fit-viewport')

    if (data.completedActivityIds) {
      for (const id of data.completedActivityIds) {
        canvas.addMarker(id, 'highlight-completed')
      }
    }
    if (data.activeActivityIds) {
      for (const id of data.activeActivityIds) {
        canvas.addMarker(id, 'highlight-active')
      }
    }
    if (data.completedFlowIds) {
      for (const id of data.completedFlowIds) {
        canvas.addMarker(id, 'highlight-completed')
      }
    }

    await nextTick()
    try {
      const elementRegistry = bpmnViewer.get('elementRegistry')
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of elementRegistry.getAll()) {
        if (el.x == null || el.y == null || el.type === 'bpmn:Process') continue
        const r = el.x + (el.width || 50)
        const b = el.y + (el.height || 30)
        if (el.x < minX) minX = el.x
        if (el.y < minY) minY = el.y
        if (r > maxX) maxX = r
        if (b > maxY) maxY = b
      }
      if (isFinite(minX)) {
        const dw = maxX - minX, dh = maxY - minY
        const cw = diagramRef.value.clientWidth, ch = diagramRef.value.clientHeight
        const scale = Math.min(cw / dw, ch / dh) * 0.7
        canvas.viewbox({
          x: minX - (cw / scale - dw) / 2,
          y: minY - (ch / scale - dh) / 2,
          width: cw / scale,
          height: ch / scale
        })
      }
    } catch (e) {
      // centering is best-effort
    }
  } catch (err) {
    console.error('加载流程图失败', err)
  } finally {
    loading.value = false
  }
}

function onClosed() {
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
}

function zoomIn() {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  canvas.zoom(canvas.zoom() * 1.2)
}

function zoomOut() {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  canvas.zoom(canvas.zoom() / 1.2)
}

function zoomFit() {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  canvas.resized()
  canvas.zoom('fit-viewport')
}
</script>

<style scoped>
.diagram-wrapper {
  position: relative;
  height: 60vh;
  min-height: 400px;
}
.diagram-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.zoom-buttons {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: rgba(255,255,255,0.92);
  user-select: none;
}
.zoom-btn:hover {
  background: #fff;
  border-color: #409eff;
  color: #409eff;
}
</style>

<style>
.djs-shape.highlight-completed .djs-visual > rect,
.djs-shape.highlight-completed .djs-visual > circle,
.djs-shape.highlight-completed .djs-visual > ellipse,
.djs-shape.highlight-completed .djs-visual > polygon {
  fill: #c8e6c9 !important;
  stroke: #4caf50 !important;
  stroke-width: 2 !important;
}
.djs-shape.highlight-active .djs-visual > rect,
.djs-shape.highlight-active .djs-visual > circle,
.djs-shape.highlight-active .djs-visual > ellipse,
.djs-shape.highlight-active .djs-visual > polygon {
  stroke: #f44336 !important;
  stroke-width: 3 !important;
}
.djs-connection.highlight-completed .djs-visual > path {
  stroke: #4caf50 !important;
  stroke-width: 2 !important;
}
.djs-powered-by {
  display: none !important;
}
</style>
