import request from '@/utils/request'

// 查询流程实例列表
export function listInstance(query) {
  return request({
    url: '/workflow/instance/list',
    method: 'get',
    params: query
  })
}

// 查询我的流程列表
export function listMyInstance(query) {
  return request({
    url: '/workflow/instance/myList',
    method: 'get',
    params: query
  })
}

// 启动流程实例
export function startInstance(data) {
  return request({
    url: '/workflow/instance/start',
    method: 'post',
    data: data
  })
}

// 终止流程实例
export function stopInstance(instanceId, data) {
  return request({
    url: '/workflow/instance/stop/' + instanceId,
    method: 'post',
    data: data
  })
}

// 挂起/激活流程实例
export function updateInstanceState(data) {
  return request({
    url: '/workflow/instance/updateState',
    method: 'post',
    data: data
  })
}
