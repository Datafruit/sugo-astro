/**
 * @file 接入数据类型路由
 */
import {
  namespace,
  SDKAccessType
} from '../../constants'
import AnalyticsResource from '../../../../models/data-analysis/resource'
import ProjectResource from '../../../../models/project/resource'

const Action = {
  update: `${namespace.access}-set-access-type`,
  analysis: `${namespace.access}-query-project-analysis`,
  getProject: `${namespace.access}-query-project`
}

/**
 * @typedef {Object} ProjectAccessorViewModel
 * @property {Number} type - 接入类型
 * @property {Array<DataAnalysisModel>} analysis
 */

const Def = {
  type: null,
  analysis: [],
  projects: []
}

/**
 * 检测类型是否是SDK接入
 * 为了兼容原有数据，凡是有SDK数据的项目
 * 数据接入时一律进入SDK接入界面
 * 否则进入文件接入
 * @param {Array<DataAnalysisModel>} analysis
 * @return {boolean}
 */
function isSDKAccessor (analysis) {
  return analysis.some(r => SDKAccessType.includes(r.access_type))
}

const Actions = {
  /**
   * 查询项目中的所有分析表
   * @param project_id
   * @param done
   * @return {Promise.<void>}
   */
  async analysis(project_id, done){
    const res = await AnalyticsResource.list(project_id)
    const analysis = res.success ? res.result : []

    done({
      analysis
    })
  },
  async getProject(done) {
    const res = await ProjectResource.list() 
    const projects  = res.success ? res.result : []
    done({
      projects
    })
  }
}

/**
 * @param {ProjectAccessorViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler (state, action, done) {

  switch (action.type) {

    case Action.update:
      return {
        ...action.payload
      }

    case Action.analysis:
      return Actions.analysis(action.payload.id, done)
    
    case Action.getProject:
      return Actions.getProject(done)

    default:
      return state
  }
}

export default {
  name: 'ViewModel',
  scheduler,
  state: { ...Def }
}

export {
  Action
}

