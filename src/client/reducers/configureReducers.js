var { combineReducers } = require('redux')
// Import core third-party reducers here, e.g.:
// var {reducer: formReducer} = require('redux-form')

export default function configureReducers(reducers) {
  return combineReducers({
    ...reducers
    // Combine core third-party reducers here, e.g.:
    // form: formReducer
  })
}
