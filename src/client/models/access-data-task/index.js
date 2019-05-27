/**
 * Created by asd on 17-7-17.
 */

import Actions from './actions'
import Resource from './resource'

/**
 * @param action
 * @return {string}
 */
function creator (action) {
  return `model-access-data-task-${action}`
}

const Action = {
  create: creator('create'),
  update: creator('update'),
  list: creator('list'),
  query: creator('query'),

  createAndRun: creator('create-and-run'),
  stop: creator('stop'),
  run: creator('run'),

  change: creator('change')
}

/**
 * @typedef {Object} AccessDataTaskStoreModel
 * @description 与AccessDataTaskModel不同在于增加了message属性
 * @see {AccessDataTaskModel}
 *
 * @property {String} id
 * @property {String} project_id
 * @property {String} datasource_name
 * @property {Number} status
 * @property {Object} params
 * @property {String} created_at
 * @property {String} updated_at
 *
 * @property {?String} message
 */

/** @type {AccessDataTaskStoreModel} */
const Def = {
  id: '',
  project_id: '',
  datasource_name: '',
  status: -1,
  params: {},
  created_at: '',
  updated_at: '',
  message: null
}

/**
 * @param {AccessDataTaskStoreModel} state
 * @param {Object} action
 * @param next
 */
function scheduler (state, action, next) {
  const { type, payload } = action

  switch (type) {
    case Action.create:
      return Actions.create(state, next)
    case Action.update:
      return Actions.update(state, next)
    case Action.query:
      return Actions.query(state, next)

    case Action.createAndRun:
      return Actions.createAndRun(state, next)
    case Action.stop:
      return Actions.stop(state, next)
    case Action.run:
      return Actions.run(state, next)

    case Action.change:
      return { ...payload }

    default:
      return state
  }
}

export default {
  name: 'AccessDataTask',
  scheduler,
  state: { ...Def }
}

export {
  Action,
  Resource,
  Def
}
