<template>
  <div class="app-container">
    <div class="head-tabs" style="margin-bottom:16px" v-if="!props.initialTab">
      <el-button :type="activeTab === 'todo' ? 'primary' : 'default'" size="small" @click="activeTab='todo';getList()">我的待办</el-button>
      <el-button :type="activeTab === 'done' ? 'primary' : 'default'" size="small" @click="activeTab='done';getList()">我的已办</el-button>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
          <el-form-item label="任务名称" prop="taskName">
            <el-input v-model="queryParams.taskName" placeholder="请输入" clearable @keyup.enter="handleQuery" />
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

    <el-table v-loading="loading" :data="taskList" :max-height="500" border>
      <el-table-column label="任务/节点" align="center" prop="taskName" min-width="120" />
      <el-table-column label="流程名称" align="center" prop="processName" min-width="120" />
      <el-table-column label="业务摘要" align="center" prop="businessSummary" min-width="160" />
      <el-table-column label="办理人" align="center" min-width="100">
        <template #default="scope">
          {{ scope.row.assigneeName || scope.row.assignee }}
        </template>
      </el-table-column>
      <el-table-column label="部门" align="center" prop="deptName" min-width="100" />
      <el-table-column label="创建时间" align="center" min-width="155">
        <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="流程状态" align="center" min-width="100" v-if="activeTab === 'done'">
        <template #default="scope">
          <el-tag v-if="scope.row.processStatus === 'COMPLETED'" type="success" size="small">已结束</el-tag>
          <el-tag v-else-if="scope.row.processStatus === 'RUNNING'" type="warning" size="small">运行中</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" min-width="160">
        <template #default="scope">
          <el-button v-if="scope.row.status === 'Rejected'" link type="primary" @click="handleApprove(scope.row, true)">
            修改
          </el-button>
          <el-button v-else link type="primary" @click="handleApprove(scope.row)">
            {{ activeTab === 'todo' ? '审批' : '详情' }}
          </el-button>
          <el-button v-if="activeTab === 'todo'" link type="primary" @click="handleTransfer(scope.row)">
            转办
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 审批/详情对话框 -->
    <el-dialog :title="activeTab === 'todo' ? '流程审批' : '流程详情'" v-model="approveOpen" width="800px" top="3vh" append-to-body>
      <el-tabs v-model="approveTab" v-if="currentTask">
        <el-tab-pane label="业务数据" name="business">
          <div v-if="currentTask?.detailRoute" style="margin-top:10px">
            <iframe ref="detailFrame" :src="getDetailUrl(currentTask)" style="width:100%;min-height:350px;border:1px solid #e8e8e8;border-radius:4px" @load="onFrameLoad"></iframe>
          </div>
          <el-divider v-if="activeTab === 'todo' && currentTask?.status !== 'Rejected'" />
          <el-form v-if="activeTab === 'todo' && currentTask?.status !== 'Rejected'" ref="approveRef" :model="approveForm" label-width="80px">
            <el-form-item label="审批意见"><el-input v-model="approveForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="审批历史" name="history">
          <ApprovalTimeline :history-list="historyList" />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <template v-if="activeTab === 'todo' && currentTask?.status === 'Rejected'">
          <el-button type="primary" @click="triggerModifySubmit" :loading="modifySubmitting">提交修改</el-button>
        </template>
        <template v-else-if="activeTab === 'todo'">
          <el-button type="success" @click="submitApprove" :loading="submitting">通 过</el-button>
          <el-button type="warning" @click="submitReject" :loading="submitting">驳 回</el-button>
        </template>
        <el-button @click="approveOpen = false">关 闭</el-button>
      </template>
    </el-dialog>

    <!-- 转办对话框（选择用户） -->
    <el-dialog title="选择转办用户" v-model="transferOpen" width="700px" top="5vh">
      <el-form :model="transferQueryParams" ref="transferQueryRef" :inline="true">
        <el-form-item label="用户名称" prop="userName">
          <el-input v-model="transferQueryParams.userName" placeholder="请输入用户名称" clearable style="width:160px" @keyup.enter="handleTransferQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleTransferQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetTransferQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table ref="transferUserTableRef" :data="transferUserList" highlight-current-row @row-click="handleTransferRowClick" height="280px" border>
        <el-table-column label="用户名称" prop="userName" :show-overflow-tooltip="true" />
        <el-table-column label="用户昵称" prop="nickName" :show-overflow-tooltip="true" />
        <el-table-column label="邮箱" prop="email" :show-overflow-tooltip="true" />
        <el-table-column label="手机" prop="phonenumber" width="120" />
      </el-table>
      <pagination v-show="transferTotal > 0" :total="transferTotal" v-model:page="transferQueryParams.pageNum" v-model:limit="transferQueryParams.pageSize" @pagination="getTransferUserList" />
      <template #footer>
        <el-button type="primary" :disabled="!transferSelectedUser" @click="submitTransfer">确 定</el-button>
        <el-button @click="transferOpen = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="WorkflowTask">
import { todoList, doneList, completeTask, rejectTask, transferTask, getTaskHistory } from '@/api/workflow/task'
import { listUser } from '@/api/system/user'
import { formatTime } from '@/utils/workflow'
import { useIframeBridge } from '@/utils/useIframeBridge'
import ApprovalTimeline from '@/components/workflow/ApprovalTimeline.vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  initialTab: { type: String, default: null }
})

const { proxy } = getCurrentInstance()
const route = useRoute()
// 优先使用 props.initialTab，其次从路由 query 参数读取，默认 todo
const activeTab = ref(props.initialTab || (route.query.tab === 'done' ? 'done' : 'todo'))
const taskList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const currentTask = ref(null)
const approveOpen = ref(false)
const approveTab = ref('business')
const historyList = ref([])
const submitting = ref(false)
const modifySubmitting = ref(false)
const transferOpen = ref(false)
const transferUserList = ref([])
const transferTotal = ref(0)
const transferSelectedUser = ref(null)

const queryParams = ref({ pageNum: 1, pageSize: 10, taskName: undefined })
const approveForm = ref({ comment: '' })
const transferQueryParams = reactive({ pageNum: 1, pageSize: 10, userName: undefined })
const detailFrame = ref(null)
const { onFrameLoad } = useIframeBridge(detailFrame)

// 额外监听 ruoyi-task-completed（task 页面特有）
const onMessage = (e) => {
  if (e.data?.type === 'ruoyi-task-completed') {
    modifySubmitting.value = false
    approveOpen.value = false
    getList()
  }
}
window.addEventListener('message', onMessage)
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => window.removeEventListener('message', onMessage))


function getList() {
  loading.value = true
  const api = activeTab.value === 'todo' ? todoList : doneList
  api(queryParams.value).then(res => {
    taskList.value = res.rows
    total.value = res.total
    loading.value = false
  })
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }

function getDetailUrl(task) {
  let url = task.detailRoute + task.businessKey
  if (task.status === 'Rejected') {
    url += '?edit=1&taskId=' + task.taskId
  }
  return url
}

function handleApprove(row, editMode = false) {
  currentTask.value = row
  if (!editMode) approveForm.value.comment = ''
  approveTab.value = 'business'
  approveOpen.value = true
  historyList.value = []
  getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => { editMode ? null : proxy.$modal.msgError('获取审批历史失败') })
}

function triggerModifySubmit() {
  modifySubmitting.value = true
  detailFrame.value?.contentWindow?.postMessage({ type: 'ruoyi-task-submit' }, '*')
  // 重置 loading：iframe 提交完成后通过 ruoyi-task-completed 关闭
  setTimeout(() => { modifySubmitting.value = false }, 5000)
}

function submitApprove() {
  submitting.value = true
  completeTask({ taskId: currentTask.value.taskId, comment: approveForm.value.comment, variables: { approved: 0 } })
    .then(() => { proxy.$modal.msgSuccess('审批通过'); approveOpen.value = false; getList() })
    .finally(() => { submitting.value = false })
}

function submitReject() {
  if (!approveForm.value.comment) { proxy.$modal.msgWarning('请填写驳回意见'); return }
  submitting.value = true
  rejectTask({ taskId: currentTask.value.taskId, comment: approveForm.value.comment })
    .then(() => { proxy.$modal.msgSuccess('已驳回'); approveOpen.value = false; getList() })
    .finally(() => { submitting.value = false })
}

/** 打开转办对话框，加载用户列表 */
function handleTransfer(row) {
  currentTask.value = row
  transferSelectedUser.value = null
  transferQueryParams.pageNum = 1
  getTransferUserList()
  transferOpen.value = true
}

/** 查询转办用户列表 */
function getTransferUserList() {
  listUser(transferQueryParams).then(res => {
    transferUserList.value = res.rows
    transferTotal.value = res.total
  })
}
function handleTransferQuery() { transferQueryParams.pageNum = 1; getTransferUserList() }
function resetTransferQuery() { proxy.resetForm('transferQueryRef'); handleTransferQuery() }
function handleTransferRowClick(row) {
  transferSelectedUser.value = row
}

function submitTransfer() {
  if (!transferSelectedUser.value) { proxy.$modal.msgWarning('请选择一个用户'); return }
  transferTask({ taskId: currentTask.value.taskId, transferUserId: transferSelectedUser.value.userName })
    .then(() => { proxy.$modal.msgSuccess('转办成功'); transferOpen.value = false; getList() }).catch(() => { proxy.$modal.msgError('转办失败') })
}

getList()
</script>

<style scoped>
.app-container {
  width: 100%;
}
.el-table {
  width: 100% !important;
}
:deep(.el-table__body-wrapper),
:deep(.el-table__header-wrapper) {
  width: 100%;
}
:deep(.el-dialog__body) {
  max-height: 68vh;
  overflow-y: auto;
}
</style>
