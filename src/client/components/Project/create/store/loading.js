import { namespace } from '../../constants'

const Action = {
  project: `${namespace.access}-loading-project`
}

/**
 * @typedef {Object} CreateProjectLoading
 * @property {Boolean} project
 */
const Def = {
  project: false
}

/**
 * @param {CreateProjectPageState} state
 * @param {Object} action
 * @param {Function} next
 */
function scheduler (state, action, next) {
  switch (action.type) {

    case Action.project:
      return {
        ...state,
        ...{ project: action.payload.loading }
      }

    default:
      return state
  }
}

export default {
  name: 'loading',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
