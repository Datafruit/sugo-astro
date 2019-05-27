/**
 * Created on 10/05/2017.
 */

import Action  from './action'
import Actions from './actions'
import Resource from './resource'

/**
 * @typedef {Object} DataAnalysisStoreModel
 * @description 相对于DataAnalysisModel多了message属性
 * @see {DataAnalysisModel}
 *
 * @property {String} id
 * @property {String} name - 接入名称
 * @property {Number} type - 接入类型，主表或维表接入。参见下方AccessDataTableType
 * @property {String} package_name - 预留字段
 * @property {Number} access_type - 接入数据类型。参见下方AccessDataOriginalType
 * @property {String} project_id - 该条记录所属的项目
 * @property {Number} status - 接入状态 - sdk接入时默认为 ProjectState.Disable，sdk安装成功后，会更新该值为ProjectState.Activate
 * @property {Object} params - 保存接入参数，JSONB类型
 * @property {String} created_by - 创建人
 * @property {String} updated_by - 最后一次更新人
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 最后一次更新时间
 *
 * @property {?String} message
 */

/** @type {DataAnalysisStoreModel} */
const Def = {
  id: '',
  name: '',
  type: -1,
  package_name: '',
  access_type: -1,
  project_id: '',
  status: -1,
  params: {},
  created_by: '',
  updated_by: '',
  created_at: '',
  updated_at: '',
  message: null
}

/**
 * @param {DataAnalysisStoreModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {

    case Action.create:
      return Actions.create(state, done)

    case Action.update:
      return Actions.update(state, done)

    case Action.del:
      return Actions.del(state, done)

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
  name: 'DataAnalysis',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
