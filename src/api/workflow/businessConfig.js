import request from '@/utils/request'

export function listConfig(query) {
  return request({
    url: '/workflow/business/config/list',
    method: 'get',
    params: query
  })
}

export function getConfig(id) {
  return request({
    url: '/workflow/business/config/' + id,
    method: 'get'
  })
}

export function addConfig(data) {
  return request({
    url: '/workflow/business/config',
    method: 'post',
    data: data
  })
}

export function updateConfig(data) {
  return request({
    url: '/workflow/business/config/edit',
    method: 'post',
    data: data
  })
}

export function delConfig(id) {
  return request({
    url: '/workflow/business/config/' + id,
    method: 'post'
  })
}

export function getHandlerBeanNames() {
  return request({
    url: '/workflow/business/config/handlerBeanNames',
    method: 'get'
  })
}

export function getProcessDefinitionKeys() {
  return request({
    url: '/workflow/definition/processDefinitionKeys',
    method: 'get'
  })
}
