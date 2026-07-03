<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="业务名称" prop="businessName">
        <el-input v-model="queryParams.businessName" placeholder="请输入" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['workflow:businessConfig:add']">新增</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="configList">
      <el-table-column label="流程定义Key" align="center" prop="processDefinitionKey" width="140" />
      <el-table-column label="业务名称" align="center" prop="businessName" width="140" />
      <el-table-column label="详情路由" align="center" prop="detailRoute" min-width="200" />
      <el-table-column label="Service Bean" align="center" prop="serviceBeanName" width="180" />
      <el-table-column label="状态" align="center" width="80">
        <template #default="scope">
          <el-switch v-model="scope.row.status" :active-value="'1'" :inactive-value="'0'" @change="handleStatusChange(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="170" />
      <el-table-column label="操作" align="center" width="160">
        <template #default="scope">
          <el-button link type="primary" @click="handleEdit(scope.row)" v-hasPermi="['workflow:businessConfig:edit']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['workflow:businessConfig:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="流程定义Key" prop="processDefinitionKey">
          <el-select v-model="form.processDefinitionKey" style="width:100%" placeholder="请选择已部署的流程定义">
            <el-option v-for="item in processDefinitionKeys" :key="item.key" :label="item.name + ' (' + item.key + ')'" :value="item.key" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务名称" prop="businessName">
          <el-input v-model="form.businessName" placeholder="如：请假申请" />
        </el-form-item>
        <el-form-item label="详情路由" prop="detailRoute">
          <el-input v-model="form.detailRoute" placeholder="如：/workflow/leave/detail/" />
        </el-form-item>
        <el-form-item label="Service Bean" prop="serviceBeanName">
          <el-select v-model="form.serviceBeanName" style="width:100%" placeholder="请选择实现了WorkflowBusinessHandler的Bean">
            <el-option v-for="name in handlerBeanNames" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open=false">取消</el-button>
        <el-button type="primary" @click="handleFormSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="BusinessConfig">
import { listConfig, getConfig, addConfig, updateConfig, delConfig, getHandlerBeanNames, getProcessDefinitionKeys } from '@/api/workflow/businessConfig'

const { proxy } = getCurrentInstance()
const configList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref('')
const processDefinitionKeys = ref([])
const handlerBeanNames = ref([])

const queryParams = ref({ pageNum: 1, pageSize: 10, businessName: undefined })
const form = ref({ processDefinitionKey: '', businessName: '', detailRoute: '', serviceBeanName: '', status: '1', remark: '' })
const rules = {
  processDefinitionKey: [{ required: true, message: '请选择流程定义Key', trigger: 'change' }],
  businessName: [{ required: true, message: '请输入业务名称', trigger: 'blur' }],
  serviceBeanName: [{ required: true, message: '请选择Service Bean', trigger: 'change' }]
}

function getList() {
  loading.value = true
  listConfig(queryParams.value).then(res => {
    configList.value = res.rows
    total.value = res.total
    loading.value = false
  })
}
function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); handleQuery() }

function loadDropdownData() {
  getProcessDefinitionKeys().then(res => { processDefinitionKeys.value = res.data || [] })
  getHandlerBeanNames().then(res => { handlerBeanNames.value = res.data || [] })
}

function handleAdd() {
  form.value = { processDefinitionKey: '', businessName: '', detailRoute: '', serviceBeanName: '', status: '1', remark: '' }
  title.value = '新增业务配置'
  loadDropdownData()
  open.value = true
}

function handleEdit(row) {
  getConfig(row.id).then(res => {
    form.value = res.data || row
    title.value = '编辑业务配置'
    loadDropdownData()
    open.value = true
  })
}

function handleFormSubmit() {
  proxy.$refs.formRef.validate(valid => {
    if (!valid) return
    const method = form.value.id ? updateConfig : addConfig
    method(form.value).then(() => {
      proxy.$modal.msgSuccess('操作成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除该配置吗？').then(() => delConfig(row.id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') })
}

function handleStatusChange(row) {
  updateConfig({ id: row.id, status: row.status, processDefinitionKey: row.processDefinitionKey }).catch(() => {
    row.status = row.status === '1' ? '0' : '1'
  })
}

getList()
</script>
