/**
 * Created on 10/05/2017.
 */

import Action from './action'
import Actions from './actions'
import Resource from './resource'

/**
 * @typedef {Object} DimensionStoreModel
 * @property {string} id
 * @property {string} parentId
 * @property {string} name
 * @property {string} title
 * @property {number} type
 * @property {Array<string>} user_ids
 * @property {Array<string>} role_ids
 * @property {string} company_id
 * @property {Array<string>} tags
 * @property {object} params
 * @property {boolean} is_druid_dimension
 * @property {string} updated_by
 * @property {string} created_by
 * @property {string} updated_at
 * @property {string} created_at
 *
 * @property {?String} message
 */

/** @type {DimensionStoreModel} */
const Def = {
  id: '',
  parentId: '',
  name: '',
  title: '',
  type: -1,
  user_ids: [],
  role_ids: [],
  company_id: '',
  tags: [],
  params: {},
  is_druid_dimension: false,
  updated_by: '',
  created_by: '',
  updated_at: '',
  created_at: '',
  message: null
}

/**
 * @param {DimensionStoreModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {
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
  name: 'Dimension',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
