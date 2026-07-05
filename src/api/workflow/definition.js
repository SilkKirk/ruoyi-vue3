import request from '@/utils/request'

// 查询流程定义列表
export function listDefinition(query) {
  return request({
    url: '/workflow/definition/list',
    method: 'get',
    params: query
  })
}

// 获取流程图数据（BPMN XML + 可选活动状态）
export function getDiagramInfo(definitionId, instanceId) {
  return request({
    url: '/workflow/definition/diagramInfo',
    method: 'get',
    params: { definitionId, instanceId }
  })
}

// 挂起/激活流程定义
export function updateDefinitionState(data) {
  return request({
    url: '/workflow/definition/updateState',
    method: 'post',
    data: data
  })
}

// 删除流程定义
export function delDefinition(definitionId) {
  return request({
    url: '/workflow/definition/' + definitionId,
    method: 'post'
  })
}
