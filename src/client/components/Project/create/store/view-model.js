/**
 * @file 创建项目页面ViewModel
 */

import {
  namespace,
  AccessDataType,
  AccessDataTableType,
  AccessDataOriginalType,
  DefaultDataAnalysisName
} from '../../constants'
import $resource from '../../../../models/data-analysis/resource'

const Action = {
  update: `${namespace.create}-update`,
  create: `${namespace.create}-create-project`,
  end: `${namespace.create}-create-end`
}

/**
 * @typedef {Object} CreateProjectViewModel
 * @property {String|null} name
 * @property {Number} type
 */
const Def = {
  name: null,
  type: AccessDataType.File
}

const Actions = {

  /**
   * @param {CreateProjectViewModel} model
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async create(model, store, done, ...others){
    const { Project } = store.getState()
    const analysis = {
      type: AccessDataTableType.Main,
      project_id: Project.id
    }

    // 创建维表记录
    // + 如果选择的是文件接入，默认创建一条CSV接入记录
    // + 如果是SDK，默认创建三条SDK记录，分别为Android、Ios、Web
    if (model.type === AccessDataType.File) {
      await $resource.create({
        ...analysis,
        name: DefaultDataAnalysisName,
        access_type: AccessDataOriginalType.Csv
      })
    } else if (model.type === AccessDataType.Log) {
      await $resource.create({
        ...analysis,
        name: DefaultDataAnalysisName,
        access_type: AccessDataOriginalType.Log
      })
    } else if (model.type === AccessDataType.SDK) {
      // TODO 异常处理
      await $resource.create({
        ...analysis,
        name: 'iOS接入',
        access_type: AccessDataOriginalType.Ios
      })

      await $resource.create({
        ...analysis,
        name: 'Android接入',
        access_type: AccessDataOriginalType.Android
      })

      await $resource.create({
        ...analysis,
        name: 'Web接入',
        access_type: AccessDataOriginalType.Web
      })

      await $resource.create({
        ...analysis,
        name: '微信小程序',
        access_type: AccessDataOriginalType.WxMini
      })
    } else if (model.type === AccessDataType.Tag) {
      let data = {
        ...analysis,
        name: DefaultDataAnalysisName,
        access_type: AccessDataOriginalType.Tag
      }
      if (others[0].partitions) data.partitions = others[0].partitions
      await $resource.create(data)
    } else if (model.type === AccessDataType.MySQL) {
      await $resource.create({
        ...analysis,
        name: DefaultDataAnalysisName,
        access_type: AccessDataOriginalType.Mysql
      })
    } else {
      throw new Error('Unknown AccessDataType: ' + model.type)
    }

    done({})
  },

  /**
   * @param {CreateProjectViewModel} model
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async end(model, store, done){
    done({})
  }
}

/**
 * @param {CreateProjectViewModel} state
 * @param {Object} action
 * @param {Function} next
 */
function scheduler (state, action, next) {
  switch (action.type) {
    case Action.update:
      return {
        ...state,
        ...action.payload
      }

    case Action.create:
      return Actions.create(state, this.store, next, action.payload)

    case Action.end:
      return Actions.end(state, this.store, next)

    default:
      return state
  }
}

export default   {
  name: 'ViewModel',
  scheduler,
  state: Def
}

export {
  Action
}
