const ctrl = 'controllers/sugo-custom-orders.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '用户自定义排序'
}

const routes = [
  {
    path: '/get/:dataSourceId',
    title: '根据项目读取排序信息',
    method: 'get',
    func: 'getCustomOrder'
  }, {
    path: '/update/:dataSourceId',
    title: '根据项目更新排序信息',
    method: 'post',
    func: 'updateCustomOrder'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/custom-orders'
}
