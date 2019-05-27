/**
 * Created on 10/05/2017.
 */

import Action  from './action'
import Actions from './actions'
import Resource from './resource'

/**
 * @typedef {Object} ProjectStoreModel
 * @description 相对于ProjectModel多了一个message属性
 * @see {ProjectModel}
 *
 * @property {String} id
 * @property {String} name - 项目名称，同一公司下的项目名称唯一
 * @property {String} parent_id - 如果是一个子项目，则parent_id不能为空
 * @property {String} datasource_id - 项目关联数据源表(DataSourceModel)的id
 * @property {String} datasource_name - 数据源名，冗余字段，可删除
 * @property {String} company_id - 项目所属公司名
 * @property {Number} status - 项目显示状态，用于业务判断，只能取ProjectStatus中定义的值
 * @property {Number} state - 项目运行状态，只能取ProjectState中定义的值
 * @property {String} type - 类型，用户创建为`user-created`, 系统创建为`built-in`
 * @property {Number} from_datasource - 是否从数据源导入
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 *
 * @property {?String} message
 */

/** @type {ProjectStoreModel} */
const Def = {
  id: '',
  name: '',
  parent_id: '',
  datasource_id: '',
  datasource_name: '',
  company_id: '',
  status: -1,
  state: -1,
  type: '',
  from_datasource: -1,
  created_at: '',
  updated_at: '',
  created_by: '',
  updated_by: '',
  message: null
}

/**
 *
 * @param {ProjectStoreModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {*}
 */

function scheduler (state, action, done) {
  const { type, payload } = action

  switch (type) {
    case Action.query:
      return Actions.query(action.payload.id, done)

    case Action.create:
      return Actions.create(state, payload.type, done)

    case Action.update:
      return Actions.update(state, done)

    case Action.change:
      return {
        ...state,
        ...action.payload
      }

    default:
      return state
  }
}

export default {
  name: 'Project',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
