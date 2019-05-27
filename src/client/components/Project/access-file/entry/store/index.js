/**
 * Created by asd on 17-7-7.
 */

import { Store, storeModelCreator, storeViewModelCreator } from 'sugo-store'
import Project, { Action as ProjectAction } from '../../../../../models/project/index'
import ViewModel, { Action as VMAction } from './view-model'

/**
 * @param {String} type
 * @param {Object} [payload]
 * @return {{type: String, payload: Object}}
 */
function struct (type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} ProjectFileAccessorState
 * @property {ProjectStoreModel} Project
 * @property {ProjectFileAccessorViewModel} ViewModel
 */
export default class FileAccessor extends Store {
  constructor () {
    super()
    storeModelCreator([Project], this)
    storeViewModelCreator([ViewModel], this)
    this.initialize()
  }

  /**
   * @param {ProjectModel} project
   * @param {Array<DataAnalysisModel>} analysis
   */
  init (project, analysis) {
    this.dispatch(struct(ProjectAction.change, project))
    this.dispatch(struct(VMAction.change, {
      analysisTables: analysis,
      analysis: analysis[0] || null
    }))
    return this
  }

  setFile (file) {
    this.dispatch(struct(VMAction.setFile, { file }))
    return this
  }
}

