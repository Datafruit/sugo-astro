import { Store, storeViewModelCreator, storeModelCreator } from 'sugo-store'
import ViewModel, { Actions as VMAction } from './view-model'
import _ from 'lodash'

export default class AccessCollectorStore extends Store {
  constructor () {
    super()
    storeViewModelCreator([ViewModel], this)
    this.initialize()
  }

  projectId = null

  init(project_id) {
    this.projectId = project_id
    this.sync()
  }

  async sync() {
    let {logApp} = _.get(this.getState(), 'ViewModel') || {}
    if (_.isEmpty(logApp)) {
      this.dispatch({type: VMAction.updateState, payload: {isLoadingApp: true}})
      this.dispatch({type: VMAction.query, payload: {projectId: this.projectId}})
    } else {
      this.dispatch({type: VMAction.updateState, payload: {isUpdatingApp: true}})
      await new Promise(resolve => {
        this.dispatch({type: VMAction.update}, resolve)
      })
    }
  }

  async syncDims(project) {
    this.dispatch({type: VMAction.updateState, payload: {isUpdatingApp: true}})
    return await new Promise((resolve, reject) => {
      this.dispatch({type: VMAction.syncDimsAndLaunch, payload: {resolve, reject, project}})
    })
  }
}
