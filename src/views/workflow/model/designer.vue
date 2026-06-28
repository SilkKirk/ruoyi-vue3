<template>
  <div class="designer-container">
    <div class="designer-header">
      <el-page-header :title="modelName" @back="goBack">
        <template #content>
          <el-tag type="info" v-if="modelKey">Key: {{ modelKey }}</el-tag>
        </template>
        <template #extra>
          <el-dropdown trigger="click" @command="locateNode">
            <el-button>节点列表<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="n in nodeList" :key="n.id" :command="n.id">
                  <el-tag :type="nodeTypeTag(n.type)" size="small" style="margin-right:6px">{{ nodeLabel(n.type) }}</el-tag>
                  {{ n.name || n.id }}
                </el-dropdown-item>
                <el-dropdown-item v-if="nodeList.length === 0" disabled>暂无节点</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" @click="handleSave">保存</el-button>
          <el-button type="success" @click="handleDeploy" v-hasPermi="['workflow:model:deploy']">
            保存并部署
          </el-button>
        </template>
      </el-page-header>
    </div>
    <div class="designer-body">
      <div class="designer-canvas" ref="canvasRef"></div>
      <div class="designer-properties" ref="propertiesRef"></div>
    </div>
  </div>
</template>

<script setup name="WorkflowDesigner">
import { getModel, getModelBpmnXml, saveModel, deployModel } from '@/api/workflow/model'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import Modeler from 'bpmn-js/lib/Modeler'
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, CamundaPlatformPropertiesProviderModule } from 'bpmn-js-properties-panel'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda'
import '@bpmn-io/properties-panel/assets/properties-panel.css'
import translations from './translations'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'

/** 中文翻译 */
function createTranslate() {
  return function(template, replacements) {
    const t = translations[template] || template
    if (replacements) return t.replace(/{([^}]+)}/g, (_, k) => replacements[k] || '{' + k + '}')
    return t
  }
}

/** 将元素节点上的 oldPrefix: 属性批量改为 newPrefix: */
function renamePrefixedAttributes(el, oldPrefix, newPrefix) {
  for (let j = el.attributes.length - 1; j >= 0; j--) {
    const attr = el.attributes[j]
    if (attr.name.startsWith(oldPrefix + ':')) {
      el.setAttribute(newPrefix + ':' + attr.name.slice(oldPrefix.length + 1), attr.value)
      el.removeAttribute(attr.name)
    }
  }
}

/** 导入时将 flowable: 转为 camunda:（Camunda 面板才能读取） */
function toCamundaXml(xml) {
  if (!xml) return xml
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  root.removeAttribute('xmlns:flowable')
  root.setAttribute('xmlns:camunda', 'http://camunda.org/schema/1.0/bpmn')
  // 遍历所有元素节点，重命名属性前缀
  const iter = doc.createNodeIterator(doc, NodeFilter.SHOW_ELEMENT, null)
  let el
  while ((el = iter.nextNode())) {
    renamePrefixedAttributes(el, 'flowable', 'camunda')
  }
  return new XMLSerializer().serializeToString(doc)
}

/** 保存时将 camunda: 转为 flowable:（Flowable 引擎才能识别） */
function toFlowableXml(xml) {
  if (!xml) return xml
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  root.removeAttribute('xmlns:camunda')
  root.setAttribute('xmlns:flowable', 'http://flowable.org/bpmn')
  const iter = doc.createNodeIterator(doc, NodeFilter.SHOW_ELEMENT, null)
  let el
  while ((el = iter.nextNode())) {
    renamePrefixedAttributes(el, 'camunda', 'flowable')
  }
  return new XMLSerializer().serializeToString(doc)
}

const route = useRoute()
const router = useRouter()
const modelId = ref('')
const modelName = ref('')
const modelKey = ref('')
const canvasRef = ref(null)
const propertiesRef = ref(null)
const bpmnModeler = ref(null)
const nodeList = ref([])

/** 刷新节点列表 */
function refreshNodeList() {
  if (!bpmnModeler.value) { nodeList.value = []; return }
  const registry = bpmnModeler.value.get('elementRegistry')
  const all = registry.getAll()
  nodeList.value = all.filter(e => e.type && !e.type.startsWith('bpmndi') && !e.type.startsWith('bpmn:Collaboration') && !e.type.startsWith('bpmn:Process') && !e.type.startsWith('bpmn:Participant') && !e.type.startsWith('bpmn:Lane'))
    .map(e => ({ id: e.id, name: e.businessObject?.name || '', type: e.type }))
}

/** 定位节点 */
function locateNode(id) {
  if (!bpmnModeler.value) return
  const el = bpmnModeler.value.get('elementRegistry').get(id)
  if (el) {
    bpmnModeler.value.get('canvas').scrollToElement(el, { top: 0.3, left: 0.45 })
    bpmnModeler.value.get('selection').select(el)
  }
}
function nodeLabel(t) {
  const m = { 'bpmn:StartEvent':'开始','bpmn:EndEvent':'结束','bpmn:UserTask':'任务','bpmn:ServiceTask':'服务','bpmn:ExclusiveGateway':'排他','bpmn:ParallelGateway':'并行','bpmn:SequenceFlow':'连线' }
  return m[t] || t.split(':').pop()
}
function nodeTypeTag(t) {
  if (t.includes('Start')) return 'success'
  if (t.includes('End')) return 'danger'
  if (t.includes('Task')) return 'primary'
  if (t.includes('Gateway')) return 'warning'
  return 'info'
}

async function initModeler() {
  if (!canvasRef.value) return
  try {
    bpmnModeler.value = new Modeler({
      container: canvasRef.value,
      propertiesPanel: { parent: propertiesRef.value },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        CamundaPlatformPropertiesProviderModule,
        { translate: ['value', createTranslate()] }
      ],
      moddleExtensions: { camunda: camundaModdle }
    })
    await loadBpmn(bpmnModeler.value)
    bpmnModeler.value.get('canvas').zoom('fit-viewport')
    bpmnModeler.value.get('eventBus').on('keyboard.shortcut', (ctx) => {
      if (ctx.key === 's' && (ctx.ctrlKey || ctx.metaKey)) { handleSave(); return false }
    })
  } catch (err) {
    console.error('初始化失败', err)
    ElMessage.error('初始化流程设计器失败')
  }
}

async function loadBpmn(modeler) {
  try {
    const res = await getModelBpmnXml(modelId.value)
    let xml = res.data || res.msg || ''
    if (xml && xml.indexOf('<userTask') !== -1) {
      // 有用户任务，使用后端XML
      const camundaXml = toCamundaXml(xml)
      // 缺少BPMNDiagram时自动补全
      let finalXml = camundaXml
      if (finalXml.indexOf('BPMNDiagram') === -1) {
        const k = modelKey.value || 'process'
        const n = modelName.value || '流程'
        finalXml = `<?xml version="1.0" encoding="UTF-8"?>
        <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
          xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
          xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
          xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
          targetNamespace="http://www.flowable.org/processdef">
          <process id="${k}" name="${n}" isExecutable="true">
            <startEvent id="startEvent" name="开始"></startEvent>
            <userTask id="task1" name="审批任务" camunda:assignee="admin"></userTask>
            <endEvent id="endEvent" name="结束"></endEvent>
            <sequenceFlow id="flow1" sourceRef="startEvent" targetRef="task1"></sequenceFlow>
            <sequenceFlow id="flow2" sourceRef="task1" targetRef="endEvent"></sequenceFlow>
          </process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${k}">
              <bpmndi:BPMNShape id="shapeStart" bpmnElement="startEvent"><dc:Bounds x="156" y="82" width="36" height="36" /></bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="shapeTask1" bpmnElement="task1"><dc:Bounds x="240" y="60" width="100" height="80" /></bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="shapeEnd" bpmnElement="endEvent"><dc:Bounds x="388" y="82" width="36" height="36" /></bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="edge1" bpmnElement="flow1"><di:waypoint xsi:type="dc:Point" x="192" y="100" /><di:waypoint xsi:type="dc:Point" x="240" y="100" /></bpmndi:BPMNEdge>
              <bpmndi:BPMNEdge id="edge2" bpmnElement="flow2"><di:waypoint xsi:type="dc:Point" x="340" y="100" /><di:waypoint xsi:type="dc:Point" x="388" y="100" /></bpmndi:BPMNEdge>
            </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
        </definitions>`
      }
      await modeler.importXML(finalXml)
      refreshNodeList()
    } else {
      // 无用户任务或XML为空，使用前端默认模板
      const key = modelKey.value || 'process'
      const name = modelName.value || '新流程'
      await modeler.importXML(`<?xml version="1.0" encoding="UTF-8"?>
      <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        targetNamespace="http://www.flowable.org/processdef">
        <process id="${key}" name="${name}" isExecutable="true">
          <startEvent id="startEvent" name="开始"></startEvent>
          <userTask id="task1" name="审批任务" camunda:assignee="admin"></userTask>
          <endEvent id="endEvent" name="结束"></endEvent>
          <sequenceFlow id="flow1" sourceRef="startEvent" targetRef="task1"></sequenceFlow>
          <sequenceFlow id="flow2" sourceRef="task1" targetRef="endEvent"></sequenceFlow>
        </process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${key}">
            <bpmndi:BPMNShape id="shapeStart" bpmnElement="startEvent"><dc:Bounds x="156" y="82" width="36" height="36" /></bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="shapeTask1" bpmnElement="task1"><dc:Bounds x="240" y="60" width="100" height="80" /></bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="shapeEnd" bpmnElement="endEvent"><dc:Bounds x="388" y="82" width="36" height="36" /></bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="edge1" bpmnElement="flow1"><di:waypoint xsi:type="dc:Point" x="192" y="100" /><di:waypoint xsi:type="dc:Point" x="240" y="100" /></bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="edge2" bpmnElement="flow2"><di:waypoint xsi:type="dc:Point" x="340" y="100" /><di:waypoint xsi:type="dc:Point" x="388" y="100" /></bpmndi:BPMNEdge>
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </definitions>`)
    }
    refreshNodeList()
    modeler.get('canvas').zoom('fit-viewport')
  } catch (err) {
    console.error('加载流程图失败', err)
    ElMessage.error('加载流程图失败')
  }
}

async function handleSave() {
  if (!bpmnModeler.value) return
  try {
    const { xml } = await bpmnModeler.value.saveXML({ format: true })
    const flowableXml = toFlowableXml(xml)
    await saveModel({ modelId: modelId.value, bpmnXml: flowableXml })
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.message || err))
  }
}

async function handleDeploy() {
  if (!bpmnModeler.value) return
  try {
    const { xml } = await bpmnModeler.value.saveXML({ format: true })
    const flowableXml = toFlowableXml(xml)
    await saveModel({ modelId: modelId.value, bpmnXml: flowableXml })
    await deployModel(modelId.value)
    ElMessage.success('部署成功')
  } catch (err) {
    ElMessage.error('部署失败: ' + (err.message || err))
  }
}

function goBack() { router.push({ path: '/workflow/model' }) }

onMounted(() => {
  modelId.value = route.params.modelId
  getModel(modelId.value).then(res => {
    modelName.value = res.data.name; modelKey.value = res.data.key
  })
  setTimeout(initModeler, 300)
})
onBeforeUnmount(() => { if (bpmnModeler.value) { bpmnModeler.value.destroy(); bpmnModeler.value = null } })
</script>

<style scoped>
.designer-container { height: calc(100vh - 84px); display: flex; flex-direction: column; }
.designer-header { padding: 8px 16px; background: #fff; border-bottom: 1px solid #e4e7ed; flex-shrink: 0; }
.designer-body { flex: 1; display: flex; overflow: hidden; }
.designer-canvas { flex: 1; height: 100%; }
.designer-properties { width: 320px; height: 100%; overflow-y: auto; background: #f8f9fa; border-left: 1px solid #e4e7ed; }
:deep(.el-page-header__extra) { display: flex; gap: 8px; }
</style>
