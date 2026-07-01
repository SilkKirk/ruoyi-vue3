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
                        <el-icon v-else-if="item.approved === true"><Select /></el-icon>
                        <el-icon v-else-if="item.approved === false"><CloseBold /></el-icon>
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
    </el-dialog>

    <!-- 流程图跟踪弹窗 -->
    <el-dialog title="流程图跟踪" v-model="diagramOpen" width="700px" top="5vh" align-center>
      <div v-loading="diagramLoading" style="text-align:center">
        <img v-if="diagramImg" :src="'data:image/png;base64,' + diagramImg" style="max-width:100%;display:inline-block" />
        <el-empty v-else description="暂无流程图" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="MyTask">
import { listMyInstance, getInstanceDiagram } from '@/api/workflow/instance'
import { getTaskHistory } from '@/api/workflow/task'
import { Pointer, CircleCheckFilled, Select, CloseBold, Timer, UserFilled, ChatDotSquare } from '@element-plus/icons-vue'

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
const diagramLoading = ref(false)
const diagramImg = ref('')
const detailFrame = ref(null)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  processName: undefined,
  status: undefined
})

function onFrameLoad() {
  const f = detailFrame.value
  if (!f) return
  try {
    f.contentWindow.postMessage({ type: 'ruoyi-iframe-resize' }, '*')
  } catch(e) { /* 跨域静默失败 */ }
}

window.addEventListener('message', (e) => {
  const f = detailFrame.value
  if (!f) return
  if (e.data?.type === 'ruoyi-iframe-height' && e.data.height > 200) {
    f.style.height = e.data.height + 'px'
  }
})

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function formatDuration(ms) {
  if (!ms) return ''
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return sec + '秒'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + '分' + (sec % 60) + '秒'
  const hour = Math.floor(min / 60)
  return hour + '时' + (min % 60) + '分'
}

function dotClass(item) {
  if (item.type === 'start') return 'tl-dot--start'
  if (item.type === 'end') return 'tl-dot--end'
  if (item.approved === true) return 'tl-dot--ok'
  if (item.approved === false) return 'tl-dot--no'
  return 'tl-dot--wait'
}

function badgeClass(item) {
  if (item.type === 'start') return 'tl-badge--start'
  if (item.type === 'end') return 'tl-badge--end'
  if (item.approved === true) return 'tl-badge--ok'
  if (item.approved === false) return 'tl-badge--no'
  return 'tl-badge--wait'
}

function statusType(status) {
  const map = { RUNNING: 'primary', SUSPENDED: 'warning', COMPLETED: 'success', TERMINATED: 'danger' }
  return map[status] || 'info'
}

function statusLabel(status) {
  const map = { RUNNING: '运行中', SUSPENDED: '已挂起', COMPLETED: '已完成', TERMINATED: '已终止' }
  return map[status] || status
}

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
    getTaskHistory(row.instanceId).then(res => { historyList.value = res.data || [] }).catch(() => {})
  }
}

function handleDiagram(row) {
  diagramOpen.value = true
  diagramLoading.value = true
  getInstanceDiagram(row.instanceId).then(res => {
    diagramImg.value = res.data
  }).finally(() => {
    diagramLoading.value = false
  })
}

getList()
</script>

<style scoped>
.app-container { width: 100%; }
.el-table { width: 100% !important; }
:deep(.el-table__body-wrapper),
:deep(.el-table__header-wrapper) { width: 100%; }

/* 审批历史时间轴 */
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
:deep(.el-dialog__body) {
  max-height: 68vh;
  overflow-y: auto;
}
</style>
