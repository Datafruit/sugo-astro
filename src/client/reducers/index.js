import {combineReducers} from 'redux'
import commonInitState from './common'
import factory from './factory'

const common = factory(commonInitState)

export default combineReducers({
  common
})

export const rootReducers = {
  common
}
