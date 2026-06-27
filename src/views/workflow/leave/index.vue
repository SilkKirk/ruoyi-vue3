<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="申请人" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="请输入" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['workflow:leave:add']">新增</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="leaveList">
      <el-table-column label="申请人" align="center" prop="userName" width="120" />
      <el-table-column label="请假类型" align="center" prop="leaveType" width="100" />
      <el-table-column label="开始时间" align="center" prop="startDate" width="160" />
      <el-table-column label="结束时间" align="center" prop="endDate" width="160" />
      <el-table-column label="原因" align="center" prop="reason" min-width="200" />
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag :type="{0:'info',1:'warning',2:'success',3:'danger'}[scope.row.status] || 'info'">
            {{ {'0':'草稿','1':'审批中','2':'通过','3':'驳回'}[scope.row.status] || scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200">
        <template #default="scope">
          <el-button link type="primary" @click="handleEdit(scope.row)" v-if="scope.row.status === '0'" v-hasPermi="['workflow:leave:edit']">编辑</el-button>
          <el-button link type="primary" @click="handleView(scope.row)" v-else>查看</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-if="scope.row.status === '0'" v-hasPermi="['workflow:leave:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/编辑/查看对话框 -->
    <el-dialog :title="title" v-model="open" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="申请人" prop="userName"><el-input v-model="form.userName" :disabled="isView" /></el-form-item>
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="form.leaveType" style="width:100%" :disabled="isView">
            <el-option label="年假" value="年假" />
            <el-option label="事假" value="事假" />
            <el-option label="病假" value="病假" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="startDate"><el-date-picker v-model="form.startDate" type="datetime" style="width:100%" :disabled="isView" /></el-form-item>
        <el-form-item label="结束时间" prop="endDate"><el-date-picker v-model="form.endDate" type="datetime" style="width:100%" :disabled="isView" /></el-form-item>
        <el-form-item label="原因" prop="reason"><el-input v-model="form.reason" type="textarea" :disabled="isView" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open=false">取消</el-button>
        <el-button type="primary" @click="handleFormSubmit" v-if="!isView">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="LeaveTest">
import { listLeave, getLeave, addLeave, updateLeave, delLeave } from '@/api/workflow/leave'

const { proxy } = getCurrentInstance()
const leaveList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')
const isView = ref(false)

const queryParams = ref({ pageNum: 1, pageSize: 10, userName: undefined })
const form = ref({ userName: '', leaveType: '', startDate: '', endDate: '', reason: '' })
const rules = { userName: [{ required: true, message: '请输入申请人', trigger: 'blur' }] }

function getList() {
  loading.value = true
  listLeave(queryParams.value).then(res => {
    leaveList.value = res.rows
    total.value = res.total
    loading.value = false
  })
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }

function handleAdd() {
  form.value = { userName: '', leaveType: '', startDate: '', endDate: '', reason: '' }
  title.value = '新增请假'
  isView.value = false
  open.value = true
}
function handleEdit(row) {
  getLeave(row.id).then(res => {
    form.value = res.data || row
    title.value = '编辑请假'
    isView.value = false
    open.value = true
  })
}
function handleView(row) {
  getLeave(row.id).then(res => {
    form.value = res.data || row
    title.value = '请假详情'
    isView.value = true
    open.value = true
  })
}

function handleFormSubmit() {
  proxy.$refs.formRef.validate(valid => {
    if (!valid) return
    const method = form.value.id ? updateLeave : addLeave
    method(form.value).then(() => {
      proxy.$modal.msgSuccess('操作成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除该记录吗？').then(() => delLeave(row.id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') })
}

// 支持 URL 参数 id=xxx 直接打开详情
import { useRoute } from 'vue-router'
const route = useRoute()
if (route.query.id) {
  getLeave(route.query.id).then(res => {
    form.value = res.data || { id: route.query.id }
    title.value = '请假详情'
    isView.value = true
    open.value = true
  })
}
getList()
</script>
