import request from '@/utils/request'

// 查询我的待办任务
export function todoList(query) {
  return request({
    url: '/workflow/task/todoList',
    method: 'get',
    params: query
  })
}

// 查询我的已办任务
export function doneList(query) {
  return request({
    url: '/workflow/task/doneList',
    method: 'get',
    params: query
  })
}

// 审批通过
export function completeTask(data) {
  return request({
    url: '/workflow/task/complete',
    method: 'post',
    data: data
  })
}

// 驳回任务
export function rejectTask(data) {
  return request({
    url: '/workflow/task/reject',
    method: 'post',
    data: data
  })
}

// 转办任务
export function transferTask(data) {
  return request({
    url: '/workflow/task/transfer',
    method: 'post',
    data: data
  })
}

// 获取任务流程图
export function getTaskFlowChart(taskId) {
  return request({
    url: '/workflow/task/flowChart/' + taskId,
    method: 'get'
  })
}

// 获取审批历史
export function getTaskHistory(instanceId) {
  return request({
    url: '/workflow/task/history/' + instanceId,
    method: 'get'
  })
}

// 通用查询业务数据
export function getBusinessData(businessType, businessId) {
  return request({
    url: '/workflow/task/businessData/' + businessType + '/' + businessId,
    method: 'get'
  })
}
