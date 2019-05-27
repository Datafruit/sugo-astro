import { ProjectAccessActionTypes } from './constants'
import { CsvActionsName, MySQLActionsName, SDKActoinName } from '../access/constants'
import { UIActionTypes, RightPanelState } from '../constants'
import _ from 'lodash'

/**
 * @typedef {Object} RightPanelProps
 * @property {String} state
 * @property {*} data
 */

/**
 * @typedef {Object} AccessState
 * @property {Project | null} project
 * @property {RightPanelProps | null} rightPanelProps - 右侧面板状态
 * @property {Array<DataAnalysis>} dataAccessList - 数据接入信息
 * @property {Object<{{id:{DimensionsHBase}}>} dimensions - 项目维度信息
 * @property {Array<DimensionAssociation>} associations - 关联关系
 * @property {Array<Object>} overviewData - 主表数据预览
 * @property {Boolean} isLoading
 */

/** @type {AccessState} */
const AccessState = {
  project: null,
  rightPanelProps: null,
  dataAccessList: [],
  dimensions: [],
  associations: [],
  overviewData: [],
  currentAccess: null,
  isLoading: true
}

const base_assign = (state, next) => {
  return _.assign({}, state, { isLoading: false }, next)
}

/**
 * 右侧数据统格式统一定义：
 * {
 *   state,  // string, 标识右侧具体状态
 *   data    // any, 传递给右侧状态组件数据
 * }
 * @param original
 * @param action
 */
const right_panel_assign = (original, action) => {
  const { state, data = null }  = action.model
  const next = base_assign(original, {
    rightPanelProps: {
      state: state,
      data
    },
    currentAccess: data
  })
  
  if (data === null) {
    return next
  }
  
  switch (state) {
    case RightPanelState.DeleteAccess:
      next.dataAccessList = original.dataAccessList.filter(ana => ana.id !== data.id)
      return next
    case RightPanelState.AddAccess:
      next.dataAccessList = original.dataAccessList.filter(ana => ana.id !== data.id)
        .concat([data])
      return next
    case RightPanelState.EditAccess:
    default:
      return next
  }
}

/**
 * @param state
 * @param action
 * @return {AccessState}
 */
const reducer = (state = AccessState, action) => {
  let temp = null
  
  switch (action.type) {
    // 初始化时,同时更新`dataAccessList`,`dimensions`,`associations`,`project`
    case ProjectAccessActionTypes.ProjectInit:
      return base_assign(state, action.model)
    
    case ProjectAccessActionTypes.AccessList:
      return base_assign(
        state,
        { dataAccessList: action.model, isLoading: action.isLoading }
      )
    
    case ProjectAccessActionTypes.Profile:
      return base_assign(
        state,
        { project: action.model, isLoading: action.isLoading }
      )
    
    case ProjectAccessActionTypes.OverviewData:
      return base_assign(state, { overviewData: action.model })
    
    case ProjectAccessActionTypes.DimensionsList:
      return base_assign(state, { dimensions: action.model })
    
    case ProjectAccessActionTypes.AddAssociation:
      return base_assign(state, { associations: state.associations.concat(action.model) })
    
    // 右侧面板状态变动
    case UIActionTypes.RightPanelState:
      return right_panel_assign(state, action)
    
    // 接入数据状态，转入到: RightPanelState
    case CsvActionsName.Access:
    case MySQLActionsName.Access:
    case SDKActoinName.Access:
      temp = {
        type: action.type,
        model: {
          state: RightPanelState.AddAccess,
          data: action.model
        }
      }
      return right_panel_assign(state, temp)
    
    //sdk更新分析表记录状态和name
    case SDKActoinName.UpdateAccess:
      return base_assign(state, {
        dataAccessList: state.dataAccessList.map((obj) => {
          return obj.id === action.model.id ? _.assign({}, obj, action.model)
            : obj
        })
      })
    
    // 更新维度
    case CsvActionsName.SubmitDimensions:
    case MySQLActionsName.SubmitDimensions:
      return base_assign(state, {
        dimensions: _.uniq(state.dimensions.concat(action.model.dimensions), 'name')
        //        dimensions: _.assign(
        //          {}, state.dimensions,
        //          {
        //            [action.model.analysis.id]: action.model.dimensions
        //          })
      })
    default:
      return state
  }
}

export { reducer }
