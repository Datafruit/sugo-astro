import { Store, storeModelCreator, storeViewModelCreator } from 'sugo-store'

// models
import ProjectModel, { Action as ProjectAction } from '../../../../models/project'

// ViewModel
import ViewModel, { Action as VMAction } from './view-model'
import Loading, { Action as LoadingAction } from './loading'
import Validate from './validate'

import { browserHistory } from 'react-router'

import { AccessDataType } from '../../constants'

/**
 * @typedef {Object} CreateProjectPageState
 * @property {ProjectStoreModel} Project
 * @property {CreateProjectViewModel} ViewModel
 * @property {CreateProjectValidate} validate
 * @property {CreateProjectLoading} loading
 */

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function creator (type, payload = {}) {
  return { type, payload }
}

export default class Creator extends Store {
  constructor () {
    super()
    storeModelCreator([ProjectModel], this)
    storeViewModelCreator([ViewModel, Validate, Loading], this)
    this.initialize()
  }

  init () {

  }

  /**
   * @param {Object|Array<Object>} actionOrActions
   * @return {Promise<CreateProjectPageState>}
   */
  async dispatchAsync (actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, state => resolve(state)))
  }

  setName (name) {
    return this.dispatch(creator(VMAction.update, { name }))
  }

  setDiyParams (DiyParams) {
    return this.dispatch(creator(VMAction.update, { ...DiyParams }))
  }

  setAccessType (type) {
    return this.dispatch(creator(VMAction.update, { type }))
  }

  /**
   * 下一步
   * @return {Creator}
   */
  async nextStep (params = {}) {
    const { ViewModel, loading } = this.state
    if (loading.project) {
      return this
    }
    this.dispatch(creator(LoadingAction.project, { loading: true }))
    const state = await this.dispatchAsync([
      creator(ProjectAction.change, { name: ViewModel.name }),
      creator(ProjectAction.create, { type: ViewModel.type })
    ])
    this.dispatch(creator(LoadingAction.project, { loading: false }))
    
    // 如果有消息，清空消息
    if (state.Project.message) {
      this.dispatch(creator(ProjectAction.change, { message: null }))
      return this
    }

    // 创建失败，不跳转
    if (!state.Project.id) {
      this.dispatch(creator(LoadingAction.project, { loading: false }))
      return this
    }
    // 创建分析表
    // 成功后跳转数据接入页
    this.dispatch(creator(LoadingAction.project, { loading: true }))
    if (ViewModel.type === AccessDataType.Tag && params.hasOwnProperty('partitions')) await this.dispatchAsync(creator(VMAction.create, params))
    else await this.dispatchAsync(creator(VMAction.create))
    this.dispatch(creator(LoadingAction.project, { loading: false }))
    browserHistory.push(`/console/project/${this.state.Project.id}`)

    return this
  }
}
