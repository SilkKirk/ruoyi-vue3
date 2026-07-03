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
      <el-table-column label="业务Key" align="center" prop="businessKey" min-width="120" v-if="false" />
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
          <el-button v-if="scope.row.status === 'Rejected'" link type="primary" @click="handleEdit(scope.row)">
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
          <div class="tl" style="margin-top:12px">
            <div v-for="(item, idx) in historyList" :key="idx" class="tl-item">
              <div class="tl-axis">
                <div :class="['tl-dot', dotClass(item)]"></div>
                <div v-if="idx < historyList.length - 1" class="tl-line"></div>
              </div>
              <div class="tl-body">
                <div class="tl-card">
                  <div class="tl-card__top">
                    <div class="tl-card__left">
                      <span :class="['tl-badge', badgeClass(item)]">
                        <el-icon v-if="item.type === 'start'"><Pointer /></el-icon>
                        <el-icon v-else-if="item.type === 'end'"><CircleCheckFilled /></el-icon>
                        <el-icon v-else-if="item.approved === 0"><Select /></el-icon>
                        <el-icon v-else-if="item.approved === 1"><CloseBold /></el-icon>
                        <el-icon v-else><Timer /></el-icon>
                      </span>
                      <div class="tl-card__info">
                        <div class="tl-card__title">{{ item.taskName }}</div>
                        <div class="tl-card__subtitle" v-if="item.assigneeName || item.assignee">
                          <el-icon><UserFilled /></el-icon>
                          <span :title="item.assignee ? '登录名: ' + item.assignee : ''">{{ item.assigneeName || item.assignee }}</span>
                          <span v-if="item.assigneeDeptName" style="color:#909399;margin-left:2px">({{ item.assigneeDeptName }})</span>
                          <span v-if="item.duration" class="tl-card__dur">
                            · {{ formatDuration(item.duration) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="tl-card__time">{{ formatTime(item.endTime || item.startTime) }}</div>
                  </div>
                  <div v-if="item.comment" class="tl-card__cmt">
                    <el-icon><ChatDotSquare /></el-icon>
                    <span>{{ item.comment }}</span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-if="historyList.length === 0" description="暂无审批记录" :image-size="60" />
          </div>
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
import { Pointer, CircleCheckFilled, Select, CloseBold, Timer, UserFilled, ChatDotSquare } from '@element-plus/icons-vue'
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
const businessData = ref(null)
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

/** iframe 加载完成后通过 postMessage 调整高度 */
function onFrameLoad() {
  const f = detailFrame.value
  if (!f) return
  try {
    f.contentWindow.postMessage({ type: 'ruoyi-iframe-resize' }, '*')
  } catch(e) { /* 跨域静默失败 */ }
}

// 监听 iframe 子页面发来的消息
window.addEventListener('message', (e) => {
  const f = detailFrame.value
  if (!f) return
  if (e.data?.type === 'ruoyi-iframe-height' && e.data.height > 200) {
    f.style.height = e.data.height + 'px'
  }
  if (e.data?.type === 'ruoyi-task-completed') {
    modifySubmitting.value = false
    approveOpen.value = false
    getList()
  }
})


/** 格式化时间（不含秒） */
function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** 时间轴圆点样式 */
function dotClass(item) {
  if (item.type === 'start') return 'tl-dot--start'
  if (item.type === 'end') return 'tl-dot--end'
  if (item.approved === 0) return 'tl-dot--ok'
  if (item.approved === 1) return 'tl-dot--no'
  return 'tl-dot--wait'
}

/** 状态徽标样式 */
function badgeClass(item) {
  if (item.type === 'start') return 'tl-badge--start'
  if (item.type === 'end') return 'tl-badge--end'
  if (item.approved === 0) return 'tl-badge--ok'
  if (item.approved === 1) return 'tl-badge--no'
  return 'tl-badge--wait'
}

/** 处理时长格式化（毫秒 → 可读） */
function formatDuration(ms) {
  if (!ms) return ''
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return sec + '秒'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + '分' + (sec % 60) + '秒'
  const hour = Math.floor(min / 60)
  return hour + '时' + (min % 60) + '分'
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

function getDetailUrl(task) {
  let url = task.detailRoute + task.businessKey
  if (task.status === 'Rejected') {
    url += '?edit=1&taskId=' + task.taskId
  }
  return url
}

function handleApprove(row) {
  currentTask.value = row
  approveForm.value.comment = ''
  approveTab.value = 'business'
  approveOpen.value = true
  historyList.value = []
  getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => { proxy.$modal.msgError('获取审批历史失败') })
}

function handleEdit(row) {
  currentTask.value = row
  approveTab.value = 'business'
  approveOpen.value = true
  historyList.value = []
  getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => {})
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

/* ===== 审批历史时间轴 ===== */
.tl { padding-left: 4px; }
.tl-item { display: flex; gap: 16px; position: relative; }
.tl-axis {
  display: flex; flex-direction: column; align-items: center;
  width: 20px; flex-shrink: 0;
}
.tl-dot {
  width: 16px; height: 16px; border-radius: 50%;
  z-index: 1; flex-shrink: 0;
}
.tl-dot--start { background: #409eff; box-shadow: 0 0 0 3px rgba(64,158,255,.2); }
.tl-dot--ok    { background: #67c23a; box-shadow: 0 0 0 3px rgba(103,194,58,.2); }
.tl-dot--no    { background: #f56c6c; box-shadow: 0 0 0 3px rgba(245,108,108,.2); }
.tl-dot--wait  { background: #c0c4cc; }
.tl-dot--end   { background: #e6a23c; box-shadow: 0 0 0 3px rgba(230,162,60,.2); }
.tl-line {
  width: 2px; flex: 1; min-height: 24px;
  background: #e8e8e8;
}
.tl-body  { flex: 1; min-width: 0; }
.tl-card {
  background: #fff; border: 1px solid #ebeef5;
  border-radius: 8px; padding: 12px 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.tl-card__top {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
}
.tl-card__left { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.tl-badge {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 16px; color: #fff;
}
.tl-badge--start { background: #409eff; }
.tl-badge--ok    { background: #67c23a; }
.tl-badge--no    { background: #f56c6c; }
.tl-badge--wait  { background: #c0c4cc; }
.tl-badge--end   { background: #e6a23c; }
.tl-card__info { min-width: 0; }
.tl-card__title {
  font-size: 14px; font-weight: 600; color: #303133;
  line-height: 1.4; word-break: break-word;
}
.tl-card__subtitle {
  font-size: 12px; color: #909399; margin-top: 2px;
  display: flex; align-items: center; gap: 2px;
}
.tl-card__subtitle .el-icon { vertical-align: -2px; }
.tl-card__dur { color: #c0c4cc; }
.tl-card__time {
  flex-shrink: 0; font-size: 12px; color: #b0b3b8;
  white-space: nowrap; padding-top: 2px;
}
.tl-card__cmt {
  margin-top: 8px; padding: 8px 10px;
  background: #f5f7fa; border-radius: 6px;
  font-size: 13px; color: #606266; line-height: 1.5;
}
.tl-card__cmt .el-icon {
  vertical-align: -2px; margin-right: 4px; color: #909399;
}

/* 暗黑模式 */
html.dark .tl-card {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
}
html.dark .tl-card__cmt {
  background: var(--el-fill-color-lighter);
}
html.dark .tl-line {
  background: var(--el-border-color-light);
}

/* 审批对话框：内容过长时 body 内滚动，不撑页面 */
:deep(.el-dialog__body) {
  max-height: 68vh;
  overflow-y: auto;
}
</style>
