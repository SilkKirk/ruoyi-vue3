<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
          <el-form-item label="流程名称" prop="processName">
            <el-input
              v-model="queryParams.processName"
              placeholder="请输入流程名称"
              clearable
              @keyup.enter="handleQuery"
            />
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

    <el-table v-loading="loading" :data="instanceList">
      <el-table-column label="实例ID" align="center" prop="instanceId" width="180" />
      <el-table-column label="流程名称" align="center" prop="processName" />
      <el-table-column label="业务Key" align="center" prop="businessKey" width="150" />
      <el-table-column label="发起人" align="center" prop="startUserName" width="100" />
      <el-table-column label="发起时间" align="center" prop="startTime" width="160" />
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="250">
        <template #default="scope">
          <el-button link type="primary" icon="Picture" @click="handleDiagram(scope.row)" v-hasPermi="['workflow:instance:query']">跟踪</el-button>
          <el-button
            v-if="scope.row.status === 'SUSPENDED'"
            link type="primary"
            @click="handleUpdateState(scope.row, 2)"
          >激活</el-button>
          <el-button
            v-if="scope.row.status === 'RUNNING'"
            link type="warning"
            @click="handleUpdateState(scope.row, 1)"
          >挂起</el-button>
          <el-button
            v-if="scope.row.status === 'RUNNING' || scope.row.status === 'SUSPENDED'"
            link type="danger"
            @click="handleStop(scope.row)"
            v-hasPermi="['workflow:instance:stop']"
          >终止</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <BpmnTrackDialog v-model="diagramOpen" :instance-id="currentInstanceId" />
  </div>
</template>

<script setup name="WorkflowInstance">
import { listInstance, updateInstanceState, stopInstance } from '@/api/workflow/instance'
import BpmnTrackDialog from '@/components/workflow/BpmnTrackDialog.vue'
import { statusType, statusLabel } from '@/utils/workflow'

const { proxy } = getCurrentInstance()

const instanceList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const diagramOpen = ref(false)
const currentInstanceId = ref('')

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  processName: undefined
})

function getList() {
  loading.value = true
  listInstance(queryParams.value).then(response => {
    instanceList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleDiagram(row) {
  currentInstanceId.value = row.instanceId
  diagramOpen.value = true
}

function handleUpdateState(row, state) {
  const action = state === 1 ? '挂起' : '激活'
  proxy.$modal.confirm('确认' + action + '流程实例吗？').then(() => {
    return updateInstanceState({ instanceId: row.instanceId, state: state })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess(action + '成功')
  }).catch(() => {})
}

function handleStop(row) {
  proxy.$modal.prompt('请输入终止原因', '终止流程实例').then(({ value }) => {
    return stopInstance(row.instanceId, { reason: value || '手动终止' })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('终止成功')
  }).catch(() => {})
}

getList()
</script>
