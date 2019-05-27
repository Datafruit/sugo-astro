/**
 * Created on 10/05/2017.
 */

import Action from './action'
import Actions from './actions'
import Resource from './resource'

/** @type {SceneDataModel} */
const Def = {
  id: '',
  project_id: '',
  type: -1,
  params: {},
  create_by: '',
  updated_by: '',
  create_at: '',
  update_at: ''
}

/**
 * @param {SceneDataModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {

    case Action.query:
      return Actions.query(state, done)

    default:
      return state
  }
}

export default {
  name: 'SceneData',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}

