import thunk from 'redux-thunk'
import { createStore, applyMiddleware, combineReducers, bindActionCreators } from 'redux'

import { reducer as MessageReducer } from './message/message-reducer'
import { Actions as MessageActions } from './message/message-actions'

import { Actions as ProjectActions } from './project/project-actions'
import { reducer as ProjectReducer } from './project/project-reducer'

import { Actions as RealUserActions } from './project/real-user-actions'

export default function () {

  const store = createStore(
    combineReducers({
      Project: ProjectReducer,
      Message: MessageReducer
    }),
    applyMiddleware(thunk)
  )

  store.actions = {
    Project: {
      ...bindActionCreators(ProjectActions, store.dispatch),
      ...bindActionCreators(RealUserActions, store.dispatch)
    },
    Message: bindActionCreators(MessageActions, store.dispatch)
  }

  return store
}


