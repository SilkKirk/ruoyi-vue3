import request from '@/utils/request'

export function listLeave(query) {
  return request({ url: '/workflow/leave/list', method: 'get', params: query })
}

export function getLeave(id) {
  return request({ url: '/workflow/leave/' + id, method: 'get' })
}

export function addLeave(data) {
  return request({ url: '/workflow/leave', method: 'post', data: data })
}

export function updateLeave(data) {
  return request({ url: '/workflow/leave/edit', method: 'post', data: data })
}

export function delLeave(id) {
  return request({ url: '/workflow/leave/' + id, method: 'post' })
}
