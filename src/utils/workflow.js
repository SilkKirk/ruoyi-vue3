export function statusType(status) {
  const map = { RUNNING: 'primary', SUSPENDED: 'warning', COMPLETED: 'success', TERMINATED: 'danger' }
  return map[status] || 'info'
}

export function statusLabel(status) {
  const map = { RUNNING: '运行中', SUSPENDED: '已挂起', COMPLETED: '已完成', TERMINATED: '已终止' }
  return map[status] || status
}

export function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}
