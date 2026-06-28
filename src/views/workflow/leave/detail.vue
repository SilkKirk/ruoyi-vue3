<template>
  <div v-loading="loading" style="padding:0;margin:0;min-height:100px">
    <el-descriptions :column="2" border v-if="data" style="margin:0">
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
    <el-empty v-else-if="!loading" description="暂无数据" :image-size="60" />
  </div>
</template>

<script setup>
import { getLeave } from '@/api/workflow/leave'
import { useRoute } from 'vue-router'
import { nextTick } from 'vue'

const route = useRoute()
const loading = ref(true)
const data = ref(null)

/** 通知父级窗口调整 iframe 高度 */
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
    data.value = res.data || null
  }).catch(() => { console.error('获取请假详情失败') }).finally(() => {
    loading.value = false
    notifyHeight()
  })
} else {
  loading.value = false
  notifyHeight()
}
</script>
