import { namespace } from '../../constants'

const Action = {
  loading: `${namespace.access}-load-loading`
}

/**
 * @typedef {Object} ProjectAccessorLoading
 * @property {Boolean} loading - 接入类型
 */
const Def = {
  loading: true
}

/**
 * @param {ProjectAccessorLoading} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler (state, action, done) {
  switch (action.type) {
    case Action.loading:
      return { loading: action.payload.loading }
    default:
      return state
  }
}

export default {
  name: 'Loading',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
