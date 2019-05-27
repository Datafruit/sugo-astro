const ctrl = 'controllers/sugo-pivot-marks.controller'

const base = {
  requireLogin: true,
  lib: ctrl,
  group: '自助分析书签'
}

const routes = [
  {
    path: '/get',
    title: '查看书签',
    method: 'get',
    func: 'list',
    common: true
  }, {
    path: '/update/:id',
    title: '更新书签',
    method: 'put',
    func: 'update'
  }, {
    path: '/delete/:id',
    title: '删除书签',
    method: 'delete',
    func: 'delete'
  }, {
    path: '/create',
    title: '增加书签',
    method: 'post',
    func: 'create'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/analytic'
}
