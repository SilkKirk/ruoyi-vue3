<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 查询区域 -->
      <el-col :span="24">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
          <el-form-item label="模型名称" prop="name">
            <el-input
              v-model="queryParams.name"
              placeholder="请输入模型名称"
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
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['workflow:model:add']"
        >新增</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="modelList">
      <el-table-column label="模型ID" align="center" prop="modelId" width="120" />
      <el-table-column label="模型名称" align="center" prop="name" />
      <el-table-column label="模型Key" align="center" prop="key" width="150" />
      <el-table-column label="分类" align="center" prop="category" width="120" />
      <el-table-column label="版本" align="center" prop="version" width="80" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="160" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="280">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleDesign(scope.row)" v-hasPermi="['workflow:model:edit']">设计</el-button>
          <el-button link type="primary" icon="Upload" @click="handleDeploy(scope.row)" v-hasPermi="['workflow:model:deploy']">部署</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['workflow:model:remove']">删除</el-button>
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

    <!-- 新增模型对话框 -->
    <el-dialog title="新增流程模型" v-model="open" width="500px">
      <el-form ref="modelRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="模型Key" prop="key">
          <el-input v-model="form.key" placeholder="请输入模型Key（唯一标识）" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="form.category" placeholder="请输入分类" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="WorkflowModel">
import { listModel, addModel, delModel, deployModel } from '@/api/workflow/model'

const { proxy } = getCurrentInstance()

const modelList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const open = ref(false)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  name: undefined
})

const form = ref({
  name: undefined,
  key: undefined,
  category: undefined,
  description: undefined
})

const rules = {
  name: [{ required: true, message: '模型名称不能为空', trigger: 'blur' }],
  key: [{ required: true, message: '模型Key不能为空', trigger: 'blur' }]
}

/** 查询模型列表 */
function getList() {
  loading.value = true
  listModel(queryParams.value).then(response => {
    modelList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
}

/** 设计流程图 */
function handleDesign(row) {
  const modelId = row.modelId
  proxy.$router.push({ path: '/workflow/designer/index/' + modelId })
}

/** 部署流程 */
function handleDeploy(row) {
  proxy.$modal.confirm('确认部署流程模型【' + row.name + '】吗？').then(() => {
    return deployModel(row.modelId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('部署成功')
  }).catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm('确认删除模型【' + row.name + '】吗？').then(function() {
    return delModel(row.modelId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs['modelRef'].validate(valid => {
    if (valid) {
      addModel(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    name: undefined,
    key: undefined,
    category: undefined,
    description: undefined
  }
  proxy.resetForm('modelRef')
}

getList()
</script>
