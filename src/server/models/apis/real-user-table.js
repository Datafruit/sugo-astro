/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 */

const ctrl = 'controllers/real-user-table.controller'
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '用户表',
  group: '项目管理'
}

const routes = [
  {
    path: '/create',
    title: '新建用户表',
    method: 'post',
    func: 'create'
  },
  {
    path: '/update-name',
    title: '更新用户表名称',
    method: 'post',
    func: 'updateName'
  },
  {
    path: '/find-one',
    title: '查找用户表记录',
    method: 'get',
    func: 'findOne'
  },
  {
    path: '/find-all',
    title: '查找所有用户表记录',
    method: 'get',
    func: 'findAll'
  },
  {
    path: '/destroy',
    title: '查找所有用户表记录',
    method: 'post',
    func: 'destroy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/real-user'
}
