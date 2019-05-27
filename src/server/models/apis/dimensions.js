import _ from 'lodash'
import {getProjectsByDataSourceIds, getProjectsByDataSourceNames} from '../../services/sugo-project.service'
const ctrl = 'controllers/sugo-dimensions.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '数据管理',
  group: '维度管理'
}

async function createDimLogExplain(log) {
  let dsId = _.last(log.path.split('/'))
  let {name, title} = log.body || {}
  const projs = await getProjectsByDataSourceIds([dsId])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 创建了维度 ${name}${title && `（${title}）` || ''}`
}

async function editDimLogExplain(log) {
  let {name, title, sourceName} = log.body || {}
  const projs = await getProjectsByDataSourceNames([sourceName])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 编辑了维度 ${name}${title && `（${title}）` || ''}`
}

async function deleteDimLogExplain(log) {
  let {names, parentId} = log.body || {}
  const projs = await getProjectsByDataSourceIds([parentId])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除了维度 ${names.join(', ')}`
}

const createOrUpdateLogKeywordExtractor = log => {
  let {name, title} = log.body
  return title || name
}

const deleteLogKeywordExtractor = log => {
  let {names, titles} = log.body
  return _.isEmpty(_.compact(titles)) ? (names || []).join(', ') : (titles || []).join(', ')
}

const routes = [
  {
    path: '/get/:id',
    title: '查看维度列表',
    method: 'get',
    func: 'getDimensions',
    requirePermission: false
  }, {
    path: '/create/:id',
    title: '创建维度',
    method: 'post',
    func: 'addDimension',
    newRoleDefaultPermission: true,
    logExplain: createDimLogExplain,
    logKeywordExtractor: createOrUpdateLogKeywordExtractor
  }, {
    path: '/update/:id',
    title: '更新维度',
    method: 'put',
    func: 'editDimension',
    newRoleDefaultPermission: true,
    logExplain: editDimLogExplain,
    logKeywordExtractor: createOrUpdateLogKeywordExtractor
  }, {
    path: '/delete',
    title: '删除维度',
    method: 'post',
    func: 'deleteDimension',
    newRoleDefaultPermission: true,
    logExplain: deleteDimLogExplain,
    logKeywordExtractor: deleteLogKeywordExtractor
  }, {
    path: '/authorize/:id',
    title: '维度授权',
    method: 'put',
    func: 'editDimension',
    newRoleDefaultPermission: true
  }, {
    path: '/sync/:id',
    title: '同步维度',
    method: 'post',
    func: 'sync',
    newRoleDefaultPermission: true
  }, {
    path: '/getDruidDims/:name',
    title: '获取druid维度',
    method: 'get',
    requirePermission: false,
    func: 'getDruidDimensions'
  }, {
    path: '/get/valid/formula',
    title: '验证复合维度表达式是否合法',
    method: 'post',
    func: 'validFormula',
    requirePermission: false
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/order-management',
    title: '维度排序与隐藏',
    method: 'post',
    func: 'getDimensions',
    newRoleDefaultPermission: true
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/tags-management',
    title: '维度分组管理',
    method: 'post',
    func: 'getDimensions',
    newRoleDefaultPermission: true
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/dimension'
}
