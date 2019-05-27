/**
 * Created on 10/05/2017.
 */

import Action from './action'
import Actions from './actions'
import Resource from './resource'

/**
 * @typedef {Object} DataSourceStoreModel
 * @description 相对于DataSourceModel，多了一个message属性
 * @see {DataSourceModel}
 *
 * @property {String} id
 * @property {String} parent_id
 * @property {String} name
 * @property {String} title
 * @property {String} description
 * @property {Number} status
 * @property {Number} peak
 * @property {String} taskId
 * @property {Object} params
 * @property {Object} filter
 * @property {String} supervisorPath
 * @property {Object} supervisorJson
 * @property {Array<String>} user_ids
 * @property {Array<String>} role_ids
 * @property {String} created_by
 * @property {String} updated_by
 * @property {String} company_id
 * @property {String} access_type
 * @property {String} created_at
 * @property {String} updated_at
 *
 * @property {?String} message
 */

/** @type {DataSourceStoreModel} */
const Def = {
  id: '',
  parent_id: '',
  name: '',
  title: '',
  description: '',
  status: -1,
  peak: -1,
  taskId: '',
  params: {},
  filter: {},
  supervisorPath: '',
  supervisorJson: {},
  user_ids: [],
  role_ids: [],
  created_by: '',
  updated_by: '',
  company_id: '',
  access_type: '',
  created_at: '',
  updated_at: '',
  message: null
}

/**
 * @param {DataSourceStoreModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {
    case Action.update:
      return Actions.update(state, done)
    default:
      return state
  }
}

export default {
  name: 'DataSource',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
