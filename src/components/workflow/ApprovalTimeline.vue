<template>
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
</template>

<script setup>
import { Pointer, CircleCheckFilled, Select, CloseBold, Timer, UserFilled, ChatDotSquare } from '@element-plus/icons-vue'
import { formatTime } from '@/utils/workflow'

defineProps({
  historyList: { type: Array, default: () => [] }
})

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
  if (item.approved === 0) return 'tl-dot--ok'
  if (item.approved === 1) return 'tl-dot--no'
  return 'tl-dot--wait'
}

function badgeClass(item) {
  if (item.type === 'start') return 'tl-badge--start'
  if (item.type === 'end') return 'tl-badge--end'
  if (item.approved === 0) return 'tl-badge--ok'
  if (item.approved === 1) return 'tl-badge--no'
  return 'tl-badge--wait'
}
</script>

<style scoped>
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
</style>
