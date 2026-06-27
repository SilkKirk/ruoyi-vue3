<template>
  <div class="app-container">
    <div class="head-tabs" style="margin-bottom:16px">
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
      <el-table-column label="业务Key" align="center" prop="businessKey" min-width="120" v-if="false" />
      <el-table-column label="办理人" align="center" prop="assignee" min-width="80" />
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
      <el-table-column label="操作" align="center" min-width="120">
        <template #default="scope">
          <el-button link type="primary" @click="handleApprove(scope.row)">
            {{ activeTab === 'todo' ? '审批' : '详情' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 审批/详情对话框 -->
    <el-dialog :title="activeTab === 'todo' ? '流程审批' : '流程详情'" v-model="approveOpen" width="800px" top="5vh">
      <el-tabs v-model="approveTab" v-if="currentTask">
        <el-tab-pane label="业务数据" name="business">
          <div v-if="currentTask?.detailRoute" style="margin-top:10px">
            <iframe ref="detailFrame" :src="currentTask.detailRoute + currentTask.businessKey" style="width:100%;border:1px solid #e8e8e8;border-radius:4px" @load="onFrameLoad"></iframe>
          </div>
          <el-divider v-if="activeTab === 'todo'" />
          <el-form v-if="activeTab === 'todo'" ref="approveRef" :model="approveForm" label-width="80px">
            <el-form-item label="审批意见"><el-input v-model="approveForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="审批历史" name="history">
          <el-timeline style="margin-top:10px">
            <el-timeline-item v-for="(item, idx) in historyList" :key="idx"
              :timestamp="formatTime(item.endTime || item.startTime)"
              :type="item.type === 'end' ? 'danger' : item.type === 'start' ? 'primary' : ''"
              placement="top">
              <div>
                <template v-if="item.type === 'start'">
                  <el-tag type="primary" size="small">发起</el-tag>
                  <strong>流程发起</strong> - {{ item.assignee }}
                </template>
                <template v-else-if="item.type === 'end'">
                  <el-tag type="danger" size="small">结束</el-tag>
                  <strong>流程结束</strong>
                </template>
                <template v-else>
                  <el-tag :type="item.approved === true ? 'success' : item.approved === false ? 'danger' : 'info'" size="small">
                    {{ item.approved === true ? '通过' : item.approved === false ? '驳回' : '待审批' }}
                  </el-tag>
                  <strong>{{ item.taskName }}</strong> - {{ item.assignee }}
                </template>
                <p v-if="item.comment" style="margin:4px 0 0;color:#666">{{ item.comment }}</p>
              </div>
            </el-timeline-item>
            <el-timeline-item v-if="historyList.length === 0" placement="top">
              <span style="color:#999">暂无审批记录</span>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <template v-if="activeTab === 'todo'">
          <el-button type="success" @click="submitApprove" :loading="submitting">通 过</el-button>
          <el-button type="warning" @click="submitReject" :loading="submitting">驳 回</el-button>
        </template>
        <el-button @click="approveOpen = false">关 闭</el-button>
      </template>
    </el-dialog>

    <!-- 转办对话框 -->
    <el-dialog title="转办任务" v-model="transferOpen" width="400px">
      <el-form ref="transferRef" :model="transferForm" label-width="80px">
        <el-form-item label="转办用户" prop="transferUserId"><el-input v-model="transferForm.transferUserId" placeholder="输入目标用户ID" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitTransfer">确 定</el-button>
        <el-button @click="transferOpen = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="WorkflowTask">
import { todoList, doneList, completeTask, rejectTask, transferTask, getTaskHistory } from '@/api/workflow/task'

const { proxy } = getCurrentInstance()
const activeTab = ref('todo')
const taskList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const currentTask = ref(null)
const approveOpen = ref(false)
const approveTab = ref('business')
const businessData = ref(null)
const historyList = ref([])
const submitting = ref(false)
const transferOpen = ref(false)

const queryParams = ref({ pageNum: 1, pageSize: 10, taskName: undefined })
const approveForm = ref({ comment: '' })
const detailFrame = ref(null)
function onFrameLoad() {
  const f = detailFrame.value
  if (!f) return
  const t = setInterval(() => {
    try {
      const h = f.contentWindow.document.body.scrollHeight
      if (h > 200) { f.style.height = (h + 5) + 'px'; clearInterval(t) }
    } catch(e) { clearInterval(t) }
  }, 80)
  setTimeout(() => clearInterval(t), 1500)
}
const transferForm = ref({ transferUserId: '' })


function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}
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

function handleApprove(row) {
  currentTask.value = row
  approveForm.value.comment = ''
  approveTab.value = 'business'
  approveOpen.value = true
  historyList.value = []
  getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => {})
}

function submitApprove() {
  submitting.value = true
  completeTask({ taskId: currentTask.value.taskId, comment: approveForm.value.comment, variables: { approved: true } })
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

function handleTransfer(row) {
  currentTask.value = row
  transferForm.value.transferUserId = ''
  transferOpen.value = true
}
function submitTransfer() {
  if (!transferForm.value.transferUserId) { proxy.$modal.msgWarning('请输入目标用户ID'); return }
  transferTask({ taskId: currentTask.value.taskId, transferUserId: transferForm.value.transferUserId })
    .then(() => { proxy.$modal.msgSuccess('转办成功'); transferOpen.value = false; getList() }).catch(() => {})
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
</style>
