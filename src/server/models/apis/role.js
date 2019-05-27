import {addRoleLogExplain, editRoleLogExplain} from '../../controllers/role.controller'

const ctrl = 'controllers/role.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '管理中心',
  group: '用户组管理'
}

const routes = [
  {
    path: '/get',
    title: '获取用户组列表',
    method: 'get',
    requirePermission: false,
    func: 'getRoles'
  }, {
    path: '/get/permissions',
    title: '获取权限列表',
    method: 'get',
    func: 'getPermissions',
    requirePermission: false
  }, {
    path: '/delete',
    title: '删除用户组',
    method: 'post',
    func: 'deleteRole',
    logExplain: `<%= username %> 删除了用户组 <%= body.name %>`,
    logKeywordExtractor: 'body.name'
  }, {
    path: '/create',
    title: '创建用户组',
    method: 'post',
    requirePermission: false,
    func: 'addRole',
    logExplain: addRoleLogExplain,
    logKeywordExtractor: 'body.role.name'
  }, {
    path: '/update',
    title: '更新用户组',
    requirePermission: false,
    method: 'post',
    func: 'editRole',
    logExplain: editRoleLogExplain,
    logKeywordExtractor: 'body.update.name'
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/function-permission-management',
    title: '更新用户组功能权限',
    method: 'post',
    func: 'getRoles'
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/data-permission-management',
    title: '更新用户组数据权限',
    method: 'post',
    func: 'getRoles'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/role'
}
