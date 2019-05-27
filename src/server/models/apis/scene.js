/**
 * Created on 14/03/2017.
 */

const ctrl = 'controllers/scene.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '场景数据'
}

const routes = [
  {
    path: '/create',
    method: 'post',
    title: '创建场景数据',
    func: 'create'
  },
  {
    path: '/update',
    method: 'post',
    title: '更新场景数据',
    func: 'update'
  },
  {
    path: '/delete',
    method: 'get',
    title: '删除场景数据',
    func: 'del'
  },
  {
    path: '/query',
    method: 'get',
    title: '查询场景数据',
    func: 'get'
  },
  {
    path: '/collection/projects',
    method: 'get',
    title: '查询项目所有场景数据',
    func: 'getSceneOfProjects'
  }
]

export default {
  routes: routes.map(r => ({ ...base, ...r })),
  prefix: 'app/scene'
}
