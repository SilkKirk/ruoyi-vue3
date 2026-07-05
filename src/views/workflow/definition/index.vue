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

    <BpmnTrackDialog v-model="diagramOpen" :definition-id="currentDefinitionId" />
  </div>
</template>

<script setup name="WorkflowDefinition">
import { listDefinition, updateDefinitionState, delDefinition } from '@/api/workflow/definition'
import BpmnTrackDialog from '@/components/workflow/BpmnTrackDialog.vue'

const { proxy } = getCurrentInstance()
const definitionList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const diagramOpen = ref(false)
const currentDefinitionId = ref('')

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
  currentDefinitionId.value = row.definitionId
  diagramOpen.value = true
}

function handleUpdateState(row, state) {
  const label = state === 1 ? '挂起' : '激活'
  proxy.$modal.confirm('确认' + label + '该流程定义吗？').then(() => {
    return updateDefinitionState({ definitionId: row.definitionId, state: state })
  }).then(() => {
    proxy.$modal.msgSuccess(label + '成功')
    getList()
  }).catch(() => {})
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除该流程定义吗？\n注意：将级联删除该流程定义下的所有流程实例！').then(() => {
    return delDefinition(row.definitionId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

getList()
</script>

