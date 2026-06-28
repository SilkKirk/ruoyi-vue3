<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
          <el-form-item label="流程名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入流程名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="definitionList">
      <el-table-column label="定义ID" align="center" prop="definitionId" width="180" />
      <el-table-column label="流程名称" align="center" prop="name" />
      <el-table-column label="流程Key" align="center" prop="key" width="150" />
      <el-table-column label="版本" align="center" prop="version" width="80" />
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.suspended === 1 ? 'danger' : 'success'">
            {{ scope.row.suspended === 1 ? '已挂起' : '已激活' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="部署ID" align="center" prop="deploymentId" width="180" />
      <el-table-column label="部署时间" align="center" prop="deployTime" width="160" />
      <el-table-column label="操作" align="center" width="200">
        <template #default="scope">
          <el-button link type="primary" @click="handleViewDiagram(scope.row)" v-hasPermi="['workflow:definition:query']">流程图</el-button>
          <el-button v-if="scope.row.suspended === 1" link type="primary" @click="handleUpdateState(scope.row, 2)" v-hasPermi="['workflow:definition:edit']">激活</el-button>
          <el-button v-else link type="warning" @click="handleUpdateState(scope.row, 1)" v-hasPermi="['workflow:definition:edit']">挂起</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['workflow:definition:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 查看流程图对话框 -->
    <el-dialog title="流程图" v-model="diagramOpen" width="80%" top="5vh" @closed="destroyViewer">
      <div ref="diagramRef" class="diagram-canvas"></div>
    </el-dialog>
  </div>
</template>

<script setup name="WorkflowDefinition">
import { listDefinition, getDefinitionBpmnXml, updateDefinitionState, delDefinition } from '@/api/workflow/definition'
import Viewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

const { proxy } = getCurrentInstance()
const definitionList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const diagramOpen = ref(false)
const diagramRef = ref(null)
let bpmnViewer = null

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  name: undefined
})

function getList() {
  loading.value = true
  listDefinition(queryParams.value).then(response => {
    definitionList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }

function handleViewDiagram(row) {
  diagramOpen.value = true
  // 延迟等待对话框渲染完成
  setTimeout(async () => {
    if (!diagramRef.value) return
    try {
      const res = await getDefinitionBpmnXml(row.definitionId)
      const xml = res.data || res.msg || ''
      if (!xml) { proxy.$modal.msgWarning('暂无流程图数据'); return }
      const flowableXml = xml
        .replace(/xmlns:flowable="http:\/\/flowable\.org\/bpmn"/g, 'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"')
        .replace(/flowable:([a-zA-Z]+)/g, 'camunda:$1')
      bpmnViewer = new Viewer({ container: diagramRef.value })
      await bpmnViewer.importXML(flowableXml)
      bpmnViewer.get('canvas').zoom('fit-viewport')
    } catch (err) {
      console.error('加载流程图失败', err)
      proxy.$modal.msgError('加载流程图失败')
    }
  }, 300)
}

function destroyViewer() {
  if (bpmnViewer) { bpmnViewer.destroy(); bpmnViewer = null }
}

getList()
</script>

<style scoped>
.diagram-canvas {
  width: 100%;
  height: 600px;
  border: 1px solid #e4e7ed;
}
</style>
