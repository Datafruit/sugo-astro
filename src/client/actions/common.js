
import _ from 'lodash'
const setProp = (obj, data) => {
  return dispatch => {
    if (_.isString(obj)) {
      obj = {
        type: obj,
        data
      }
    }
    dispatch(obj)
  }
}

const customUpdate = (data) => {
  return dispatch => {
    dispatch({
      type: 'custom',
      func: state => {
        return Object.assign(state, data)
      }
    })
  }
}

const setLoading = (dispatch, state, type) => {
  dispatch({
    type: type || 'set_loading',
    data: state
  })
}

export {
  setProp,
  setLoading,
  customUpdate
}
