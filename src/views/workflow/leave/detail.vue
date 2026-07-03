<template>
  <div v-loading="loading" style="padding:0;margin:0;min-height:100px">
    <template v-if="data">
      <el-descriptions :column="2" border v-if="!isEdit" style="margin:0">
        <el-descriptions-item label="申请人" :span="2">{{ data.userName }}</el-descriptions-item>
        <el-descriptions-item label="请假类型">{{ data.leaveType }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="{0:'info',1:'warning',2:'success',3:'danger'}[data.status]" size="small">
            {{ {0:'草稿',1:'审批中',2:'通过',3:'驳回'}[data.status] || data.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始时间" :span="2">{{ data.startDate }}</el-descriptions-item>
        <el-descriptions-item label="结束时间" :span="2">{{ data.endDate }}</el-descriptions-item>
        <el-descriptions-item label="原因" :span="2">{{ data.reason }}</el-descriptions-item>
      </el-descriptions>
      <el-form v-else ref="formRef" :model="formData" label-width="80px" style="margin-top:8px">
        <el-form-item label="申请人">
          <el-input v-model="formData.userName" disabled />
        </el-form-item>
        <el-form-item label="请假类型">
          <el-select v-model="formData.leaveType" style="width:100%">
            <el-option label="事假" value="事假" />
            <el-option label="病假" value="病假" />
            <el-option label="年假" value="年假" />
            <el-option label="婚假" value="婚假" />
            <el-option label="产假" value="产假" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="formData.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="formData.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="formData.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </template>
    <el-empty v-else-if="!loading" description="暂无数据" :image-size="60" />
  </div>
</template>

<script setup>
import { getLeave, updateLeave } from '@/api/workflow/leave'
import { completeTask } from '@/api/workflow/task'
import { useRoute } from 'vue-router'
import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const loading = ref(true)
const submitting = ref(false)
const data = ref(null)
const formData = ref({})
const isEdit = ref(route.query.edit === '1')

function notifyHeight() {
  nextTick(() => {
    const h = document.body.scrollHeight
    if (h > 100) {
      window.parent.postMessage({ type: 'ruoyi-iframe-height', height: h }, '*')
    }
  })
}

if (route.params.id) {
  getLeave(route.params.id).then(res => {
    const d = res.data || null
    data.value = d
    if (d && isEdit.value) {
      formData.value = {
        id: d.id,
        userName: d.userName,
        leaveType: d.leaveType,
        startDate: d.startDate,
        endDate: d.endDate,
        reason: d.reason
      }
    }
  }).catch(() => { console.error('获取请假详情失败') }).finally(() => {
    loading.value = false
    notifyHeight()
  })
} else {
  loading.value = false
  notifyHeight()
}

async function submitModify() {
  submitting.value = true
  try {
    await updateLeave(formData.value)
    await completeTask({ taskId: route.query.taskId, variables: {} })
    ElMessage.success('修改提交成功')
    window.parent.postMessage({ type: 'ruoyi-task-completed' }, '*')
  } catch (e) {
    ElMessage.error('提交失败: ' + (e.message || e))
  } finally {
    submitting.value = false
  }
}

// 监听父窗口发来的提交指令
window.addEventListener('message', (e) => {
  if (e.data?.type === 'ruoyi-task-submit') {
    submitModify()
  }
})
</script>
