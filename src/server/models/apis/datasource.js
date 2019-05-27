const ctrl = 'controllers/sugo-datasources.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '数据管理',
  group: '数据源管理'
}

const routes = [{
  path: '/get',
  title: '查看数据源列表',
  method: 'get',
  func: 'getDatasources'
}, {
  path: '/update/:id',
  title: '更新数据源',
  method: 'put',
  func: 'editDatasource'
}, {
  path: '/access/get-gzfile',
  title: '生成数据源接入客户端采集文件',
  method: 'get',
  func: 'generateAccessFile'
}, {
  path: '/access/getToken/:type',
  title: '获取数据源接入的token值',
  method: 'get',
  func: 'getAccessToken'
}, {
  path: '/access/createToken/:type',
  title: '获取数据源接入的token值',
  method: 'get',
  func: 'createAccessToken'
}, {
  path: '/get-all-res',
  title: '获取所有数据源的维度和指标',
  method: 'get',
  func: 'getAllRes'
}, {
  path: '/updateSupervisorJsonTimeColumn',
  title: '更新数据源时间列',
  method: 'post',
  func: 'updateSupervisorJsonTimeColumn'
}, /*{
  // 只是为了前端权限控制而创建的路由，并不会实际调用
  path: '/config-user-type-dims',
  title: '设置用户类型数据',
  method: 'post',
  func: 'getDatasources',
  class: '数据管理',
  group: '场景数据设置',
  requirePermission: true
},*/ {
  // 只是为了前端权限控制而创建的路由，并不会实际调用
  path: '/config-user-action-dims',
  title: '设置用户行为数据',
  method: 'post',
  func: 'getDatasources',
  class: '数据管理',
  group: '场景数据设置',
  requirePermission: true
}, {
  // 只是为了前端权限控制而创建的路由，并不会实际调用
  path: '/config-rfm-dims',
  title: '设置RFM数据',
  method: 'post',
  func: 'getDatasources',
  class: '数据管理',
  group: '场景数据设置',
  requirePermission: true
}]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/datasource'
}
