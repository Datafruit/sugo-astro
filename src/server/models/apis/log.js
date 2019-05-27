const ctrl = 'controllers/sugo-log.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl
}

const routes = [
  {
    path: '/', // ?pageSize=10&pageIndex=0
    title: '读取日志',
    method: 'get',
    func: 'getLogs'
  },
  {
    path: '/:id/explain',
    title: '查看日志解释',
    method: 'get',
    func: 'explainLog'
  },
  {
    path: '/apiTitles',
    title: '读取日志类型',
    method: 'get',
    func: 'apiTitles'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/logs'
}
