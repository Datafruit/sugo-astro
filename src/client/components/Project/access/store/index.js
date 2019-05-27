/**
 * Created by asd on 17-7-7.
 */

import { Store, storeViewModelCreator, storeModelCreator } from 'sugo-store'
import ProjectModel, { Action as PAction } from '../../../../models/project'
import ViewModel, { Action as VMAction } from './view-model'
import Loading, { Action as LoadingAction } from './loading'

/**
 * @param {String} type
 * @param {Object} [payload]
 * @return {{type: String, payload: Object}}
 */
function struct (type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} ProjectAccessorState
 * @property {ProjectStoreModel} Project
 * @property {ProjectAccessorViewModel} ViewModel
 * @property {ProjectAccessorLoading} Loading
 */

export default class Accessor extends Store {
  constructor () {
    super()
    storeModelCreator([ProjectModel], this)
    storeViewModelCreator([ViewModel, Loading], this)
    this.initialize()
  }

  init (project_id) {
    const payload = { id: project_id }
    this.dispatch(struct(LoadingAction.loading, { loading: true }))
    this.dispatch(
      [
        struct(PAction.query, payload),
        struct(VMAction.getProject, payload),
        struct(VMAction.analysis, payload)
      ],
      (state) => {
        this.dispatch([
          struct(VMAction.update, { type: state.Project.access_type }),
          struct(LoadingAction.loading, { loading: false })
        ])
      }
    )
    return this
  }
}

