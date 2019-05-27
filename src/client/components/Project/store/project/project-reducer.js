import _ from 'lodash'
import { ProjectActionTypes } from './constants'
import { ProjectStatus, ProjectState as State } from '../../../../../common/constants'
import RealUserTableReducer from './real-user-reducers'

/**
 * 项目管理State
 * @typedef {Object} ProjectState
 * @property {Array<ProjectModel>} project
 * @property {Boolean} createProjectModalVisible

 * @property {Array} dataSources
 * @property {Array} roles
 * @property {Boolean} updatingDataSources
 * @property {Boolean} authorizationModalVisible
 * @property {Boolean} isLoading
 *
 * @property {Array<RealUserTableModel>} realUserTables
 * @property {boolean} visibleUserTableModal
 * @property {ProjectModel} userTableAssociateProject
 */

/** @type {ProjectState} */
const ProjectState = {
  project: [],
  createProjectModalVisible: false,
  dataSources: [],
  roles: [],
  uindexLoadStatus: {},
  updatingDataSources: false,
  authorizationModalVisible: false,
  authorizeDataSources: null,
  authorizeChildProjectId: null,
  page: 1,
  isLoading: true,

  realUserTables: [],
  visibleUserTableModal: false,
  userTableAssociateProject: null,

  settingModalVisible: false,
  showConfigModalVisible: false,
  settingDataSources: null,
  querySupervisorstatus: false,
  localSupervisorConfig: {}, 
  originSupervisorConfig: {},
  displaySdkReportSet: false,
  sdkReportSetData:{},
  sdkGlobalConfig: {},
  displayTagSet: false,
  userGroups: []
}

/**
 * @param {ProjectState} state
 * @param {object} next
 * @return {ProjectState}
 */
const base_assign = (state, next) => {
  return _.assign({}, state, { isLoading: false }, next)
}

/**
 * 项目管理
 * @param {ProjectState} state
 * @param {Object} action
 * @return {ProjectState}
 * @constructor
 */
const reducer = (state = ProjectState, action) => {
  const { type } = action

  // 用户表相关的reducer在此处处理
  if (RealUserTableReducer[type]) {
    return base_assign(state, RealUserTableReducer[type](action, state))
  }

  switch (type) {
    case ProjectActionTypes.ProfileList:
    case ProjectActionTypes.Profile:
      return base_assign(state, { project: action.model, uindexLoadStatus: action.uindexLoadStatus || {} })

    case ProjectActionTypes.AddProject:
      return base_assign(state, { project: [action.model].concat(state.project) })

    case ProjectActionTypes.UpdateProject:
      return base_assign(state, {
        project: state.project.map(p => {
          let { id, ...props } = action.model
          return p.id === id ? _.assign({}, p, props) : p
        })
      })

    case ProjectActionTypes.ShowProject:
      return base_assign(state, {
        project: state.project
          .map(p => _.assign({}, p, {
            status: action.model === p.id ? ProjectStatus.Show : p.status
          }))
      })

    case ProjectActionTypes.HideProject:
      return base_assign(state, {
        project: state.project
          .map(p => _.assign({}, p, {
            status: action.model === p.id ? ProjectStatus.Hide : p.status
          }))
      })

    case ProjectActionTypes.DisableProject:
      return base_assign(state, {
        project: state.project
          .map(p => _.assign({}, p, {
            state: action.model === p.id ? State.Disable : p.state
          }))
      })

    case ProjectActionTypes.ActivateProject:
      return base_assign(state, {
        project: state.project
          .map(p => _.assign({}, p, {
            state: action.model === p.id ? State.Activate : p.state
          }))
      })

    case ProjectActionTypes.DeleteProject:
      return base_assign(state, {
        project: state.project.filter(p => !(p.id === action.model || p.parent_id === action.model))
      })

    case ProjectActionTypes.CreateProjectModal:
      return base_assign(state, { createProjectModalVisible: action.model })

    case ProjectActionTypes.AddDataSources:
    case ProjectActionTypes.UpdateDataSources:
    {

      const dataSources = state.dataSources
        .filter(ds => action.model.id !== ds.id || (action.model.child_project_id || null) !== (ds.child_project_id || null))
        .concat(action.model)
      return base_assign(state, {
        dataSources: dataSources
      })
    }

    case ProjectActionTypes.AddRoles:
      return base_assign(state, {
        roles: state.roles
          .filter(ro => action.model.every(r => r.id !== ro.id))
          .concat(action.model)
      })

    case ProjectActionTypes.CreateAuthorizationModal:
      return base_assign(state, {
        authorizationModalVisible: action.model.visible,
        authorizeDataSources: action.model.project
          ? action.model.project.datasource_id
          : null,
        authorizeChildProjectId: _.get(action.model.project, 'parent_id') ? action.model.project.id : null
      })
    case ProjectActionTypes.UpdatingDataSources:
      return base_assign(state, { updatingDataSources: action.model })

    case ProjectActionTypes.SetPage:
      return base_assign(state, { page: action.model })

    // 是否显示配置supervisor的弹窗 
    case ProjectActionTypes.projectSettingModal:
      return base_assign(state, {
        settingModalVisible: action.model.visible,
        settingDataSources: action.model.project
          ? action.model.project
          : null
      })
    //是否显示标签项目配置的弹窗
    case ProjectActionTypes.ProjectCheckModal:
    return base_assign(state, {
      showConfigModalVisible: action.model.visible,
      settingDataSources: action.model.project
      ? action.model.project
      : null
    })
    // 改变查询状态,用于控制页面是否显示loading状态
    case ProjectActionTypes.updateSupervisorStatus:
      return base_assign(state, {
        querySupervisorstatus: action.model
      })
    // 保存查询到的supervisor配置
    case ProjectActionTypes.saveSupervisorConfig: 
      return base_assign(state, {
        localSupervisorConfig: action.model.localConfig.supervisorJson,
        originSupervisorConfig: action.model.originConfig.supervisorJson
      })
    case ProjectActionTypes.saveUindexSpecConfig:
    return base_assign(state, {
      localSupervisorConfig: action.model.localConfig.supervisorJson,
    })
    case ProjectActionTypes.setSdkGlobalConfig: 
      return base_assign(state, {
        sdkGlobalConfig: action.model.sdkGlobalConfig
      })
    case ProjectActionTypes.getUserGroups: 
      return base_assign(state, {
        userGroups: action.model
      })
    default:
      return state
  }
}

export { reducer }
