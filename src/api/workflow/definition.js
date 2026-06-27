import request from '@/utils/request'

// 查询流程定义列表
export function listDefinition(query) {
  return request({
    url: '/workflow/definition/list',
    method: 'get',
    params: query
  })
}

// 获取流程定义BPMN XML
export function getDefinitionBpmnXml(definitionId) {
  return request({
    url: '/workflow/definition/bpmnXml/' + definitionId,
    method: 'get'
  })
}

// 挂起/激活流程定义
export function updateDefinitionState(data) {
  return request({
    url: '/workflow/definition/updateState',
    method: 'put',
    data: data
  })
}

// 删除流程定义
export function delDefinition(definitionId) {
  return request({
    url: '/workflow/definition/' + definitionId,
    method: 'delete'
  })
}
