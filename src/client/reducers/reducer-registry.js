// Based on https://github.com/rackt/redux/issues/37#issue-85098222
// from https://github.com/insin/react-examples/tree/master/code-splitting-redux-reducers
class ReducerRegistry {
  constructor(initialReducers = {}) {
    this._reducers = {...initialReducers}
    this._emitChange = null
  }
  register(newReducers) {
    this._reducers = {...this.getReducers(), ...newReducers}
    if (this._emitChange != null) {
      this._emitChange(this._reducers)
    }
  }
  getReducers() {
    return {...this._reducers}
  }
  setChangeListener(listener) {
    if (this._emitChange != null) {
      throw new Error('Can only set the listener for a ReducerRegistry once.')
    }
    this._emitChange = listener
  }
}

export default ReducerRegistry
