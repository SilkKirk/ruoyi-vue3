import request from '@/utils/request'

// 查询模型列表
export function listModel(query) {
  return request({
    url: '/workflow/model/list',
    method: 'get',
    params: query
  })
}

// 获取模型详情
export function getModel(modelId) {
  return request({
    url: '/workflow/model/' + modelId,
    method: 'get'
  })
}

// 获取模型BPMN XML
export function getModelBpmnXml(modelId) {
  return request({
    url: '/workflow/model/bpmnXml/' + modelId,
    method: 'get'
  })
}

// 新增模型
export function addModel(data) {
  return request({
    url: '/workflow/model',
    method: 'post',
    data: data
  })
}

// 保存模型BPMN XML
export function saveModel(data) {
  return request({
    url: '/workflow/model/edit',
    method: 'post',
    data: data
  })
}

// 删除模型
export function delModel(modelId) {
  return request({
    url: '/workflow/model/' + modelId,
    method: 'post'
  })
}

// 部署模型
export function deployModel(modelId) {
  return request({
    url: '/workflow/model/deploy/' + modelId,
    method: 'post'
  })
}
