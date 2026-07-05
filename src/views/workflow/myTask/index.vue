<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
          <el-form-item label="流程名称" prop="processName">
            <el-input v-model="queryParams.processName" placeholder="请输入流程名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width:120px">
              <el-option label="运行中" value="RUNNING" />
              <el-option label="已完成" value="COMPLETED" />
            </el-select>
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
      <el-table-column label="流程名称" align="center" prop="processName" min-width="140" />
      <el-table-column label="业务摘要" align="center" prop="businessSummary" min-width="160" />
      <el-table-column label="当前节点" align="center" min-width="120">
        <template #default="scope">
          <span v-if="scope.row.currentActivity">{{ scope.row.currentActivity }}</span>
          <el-tag v-else type="success" size="small">已结束</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发起时间" align="center" prop="startTime" width="160" />
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="160">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">详情</el-button>
          <el-button link type="primary" icon="Picture" @click="handleDiagram(scope.row)">跟踪</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 详情对话框 -->
    <el-dialog title="流程详情" v-model="detailOpen" width="800px" top="3vh" append-to-body>
      <el-descriptions :column="2" border v-if="currentTask">
        <el-descriptions-item label="流程名称">{{ currentTask.processName }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(currentTask.status)" size="small">{{ statusLabel(currentTask.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发起时间">{{ currentTask.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ currentTask.endTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务Key">{{ currentTask.businessKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="实例ID">{{ currentTask.instanceId }}</el-descriptions-item>
      </el-descriptions>
      <el-divider />
      <el-tabs v-model="detailTab">
        <el-tab-pane label="业务数据" name="business">
          <div v-if="currentTask?.detailRoute" style="margin-top:10px">
            <iframe ref="detailFrame" :src="currentTask.detailRoute + currentTask.businessKey" style="width:100%;min-height:300px;border:1px solid #e8e8e8;border-radius:4px" @load="onFrameLoad"></iframe>
          </div>
          <el-empty v-else description="暂无业务数据" :image-size="60" />
        </el-tab-pane>
        <el-tab-pane label="审批历史" name="history">
          <ApprovalTimeline :history-list="historyList" />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <BpmnTrackDialog v-model="diagramOpen" :instance-id="currentInstanceId" />
  </div>
</template>

<script setup name="MyTask">
import { listMyInstance } from '@/api/workflow/instance'
import { getTaskHistory } from '@/api/workflow/task'
import BpmnTrackDialog from '@/components/workflow/BpmnTrackDialog.vue'
import ApprovalTimeline from '@/components/workflow/ApprovalTimeline.vue'
import { statusType, statusLabel } from '@/utils/workflow'
import { useIframeBridge } from '@/utils/useIframeBridge'

const { proxy } = getCurrentInstance()

const instanceList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const detailOpen = ref(false)
const detailTab = ref('business')
const currentTask = ref(null)
const historyList = ref([])
const diagramOpen = ref(false)
const currentInstanceId = ref('')
const detailFrame = ref(null)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  processName: undefined,
  status: undefined
})

const { onFrameLoad } = useIframeBridge(detailFrame)

function getList() {
  loading.value = true
  listMyInstance(queryParams.value).then(response => {
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

function handleDetail(row) {
  currentTask.value = row
  detailTab.value = 'business'
  detailOpen.value = true
  historyList.value = []
  if (row.instanceId) {
    getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => { proxy.$modal.msgError('获取审批历史失败') })
  }
}

function handleDiagram(row) {
  currentInstanceId.value = row.instanceId
  diagramOpen.value = true
}

getList()
</script>

<style scoped>
.app-container { width: 100%; }
.el-table { width: 100% !important; }
:deep(.el-table__body-wrapper),
:deep(.el-table__header-wrapper) { width: 100%; }
:deep(.el-dialog__body) {
  max-height: 68vh;
  overflow-y: auto;
}

</style>
