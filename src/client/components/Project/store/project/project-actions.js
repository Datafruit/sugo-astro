import _ from 'lodash'
import { ProjectActionTypes, MessageTypes } from './constants'
import { UIActionTypes } from '../constants'
import { Interface } from '../../interface'
import { getDatasources, editDatasource, editProjectRoles } from '../../../../databus/datasource'
import { remoteUrl } from '../../../../constants/interface'
import { AccessDataType } from 'common/constants'
import Fetch from '../../../../common/fetch-final'
import { browserHistory } from 'react-router'

async function getDatasource (id, dispatch, newChildProject) {
  const res_dataSources = await getDatasources({
    limit: 1,
    noauth: true,
    includeChild: 1,
    where: { id }
  })

  let ret_dataSources = res_dataSources.result

  if (ret_dataSources && newChildProject && ret_dataSources.length >= 1) {
    ret_dataSources = ret_dataSources.filter( i => _.get(i,'child_project_id') === newChildProject.id)
  }
  
  if (ret_dataSources && ret_dataSources.length === 1) {

    dispatch({ type: ProjectActionTypes.AddDataSources, model: ret_dataSources })
  }
}
const Actions = {
  /** 获取项目列表 */
  getProject(){
    return async dispatch => {
      const res_project = await Fetch.get(Interface.list, {
        includeChild: 1
      })
      const result = res_project.result
      if (!result.success) {
        dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      } else {
        let uindexLoadStatus = {}
        // 获取uindex数据源加载状态（数据是否加载完成）；当有uindex项目时才执行如下逻辑
        if (_.some(result.model || [], m => m.access_type === AccessDataType.Tag)) {
          try {
            const ret = await Fetch.get(`${Interface.uindexLoadStatus}`)
            uindexLoadStatus = ret.result || {}
          } catch (e) {
            console.log('uindex load status error:', e.message)
            uindexLoadStatus = {}
          }
        }
        dispatch({
          type: ProjectActionTypes.ProfileList,
          model: result.model,
          uindexLoadStatus
        })
      }

      // 项目相关的dataSources
      const res_dataSources = await getDatasources({
        limit: result.model.length,
        includeChild: 1,
        noauth: true,
        where: { id: { $in: result.model.map(p => p.datasource_id) } }
      })

      if (!res_dataSources) {
        dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: '请求数据源接口出错'
          }
        })
      } else {
        dispatch({
          type: ProjectActionTypes.AddDataSources, model: res_dataSources.result
        })
      }

      const res_roles = await Fetch.get(remoteUrl.GET_ROLES)
      if (!res_roles) {
        dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: '请求用户权限接口出错'
          }
        })
      } else {
        dispatch({ type: ProjectActionTypes.AddRoles, model: res_roles.result })
      }
    }
  },

  update(props){
    return async dispatch => {
      const res = await Fetch.post(Interface.update, { ...props })
      if (!res) return res
      const message = res ? (res.result.success ? null : res.result.message) : '更新项目信息出错了'
      if (message) {
        dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: res.result
          }
        })
      } else {
        dispatch({ type: ProjectActionTypes.UpdateProject, model: props })
      }

      return res
    }
  },

  hideProject(project_id, datasource_id, datasource_name, from_datasource) {
    return async dispatch => {
      const response = await Fetch.get(`${Interface.hide}/${project_id}`, {
        datasource_id, datasource_name, from_datasource
      })
      const result = response.result

      if (!result.success) {
        dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }

      for (let id of result.model) {
        dispatch({
          type: ProjectActionTypes.HideProject,
          model: id
        })
      }

    }
  },

  showProject(project_id, datasource_id, datasource_name, from_datasource) {
    return async dispatch => {
      const response = await Fetch.get(`${Interface.show}/${project_id}`, {
        datasource_id, datasource_name, from_datasource
      })
      const result = response.result
      if (!result.success) {
        dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }

      for (let id of result.model) {
        dispatch({
          type: ProjectActionTypes.ShowProject,
          model: id
        })
      }
    }
  },

  disableProject(project_id){
    return async dispatch => {
      const res = await Fetch.get(`${Interface.disable}/${project_id}`)
      if (!res) return res
      const ret = res.result

      if (!ret.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: ret }
        })
      }

      for (let id of ret.model) {
        dispatch({
          type: ProjectActionTypes.DisableProject,
          model: id
        })
      }
    }
  },

  activateProject(project_id){
    return async dispatch => {
      const res = await Fetch.get(`${Interface.activate}/${project_id}`)
      if (!res) return res

      const ret = res.result
      if (!ret.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: ret.message }
        })
      }

      for (let id of ret.model) {
        dispatch({
          type: ProjectActionTypes.ActivateProject,
          model: id
        })
      }
    }
  },

  /** 删除项目 */
  deleteProject(project_id){
    return async dispatch => {
      const response = await Fetch.get(`${Interface.delete}/${project_id}`)
      const result = response.result

      if (result.success) {
        for (let id of result.model) {
          dispatch({
            type: ProjectActionTypes.DeleteProject,
            model: id
          })
        }
      } else {
        dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: { message: result.message } }
        })
      }
    }
  },

  createChildProject ({ parentId, name, filter }) {
    return async dispatch => {
      const response = await Fetch.post(Interface.createChild, { name, parentId, filter })
      if (!response) return
      let proj = {
        ...response.result,
        filter
      }
      dispatch({ type: ProjectActionTypes.AddProject, model: proj })
      await getDatasource(proj.datasource_id, dispatch, proj)
      return response
    }
  },

  create(name){
    return async dispatch => {
      const response = await Fetch.post(Interface.create, { name })
      if (!response) return
      const result = response.result
      if (!result.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }
      dispatch({ type: ProjectActionTypes.AddProject, model: result.model })

      await getDatasource(result.model.datasource_id, dispatch)
      browserHistory.push(`/console/project/${result.model.id}?act=create`)
    }
  },
  openCreateProjectModal(){
    return { type: ProjectActionTypes.CreateProjectModal, model: true }
  },
  closeCreateProjectModal(){
    return { type: ProjectActionTypes.CreateProjectModal, model: false }
  },

  editDataSources(dataSources){
    return async dispatch => {
      dispatch({ type: ProjectActionTypes.UpdatingDataSources, model: true })
      const res = await editDatasource(dataSources.id, dataSources)
      if (!res) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: '更新项目信息失败'
          }
        })
      }
      dispatch({ type: ProjectActionTypes.UpdatingDataSources, model: false })
      dispatch({ type: ProjectActionTypes.UpdateDataSources, model: res.result })
      dispatch({
        type: UIActionTypes.Message, model: {
          type: MessageTypes.Notification,
          content: '更新项目信息成功'
        }
      })
    }
  },
  updateStoreDataSources(role, dataSources){
    const { role_ids } = dataSources
    const { id } = role
    const update = _.cloneDeep(dataSources)
    if (role_ids.includes(id)) {
      update.role_ids = role_ids.filter(rid => rid !== id)
    } else {
      update.role_ids = role_ids.concat(id)
    }
    return { type: ProjectActionTypes.AddDataSources, model: update }
  },

  openAuthorizationModal(project){
    return {
      type: ProjectActionTypes.CreateAuthorizationModal,
      model: {
        visible: true,
        project
      }
    }
  },

  closeAuthorizationModal(){
    return {
      type: ProjectActionTypes.CreateAuthorizationModal,
      model: {
        visible: false,
        project: null
      }
    }
  },

  setPage(page){
    return { type: ProjectActionTypes.SetPage, model: page }
  },

  editProjectRoles(dataSources) {
    return async dispatch => {
      dispatch({ type: ProjectActionTypes.UpdatingDataSources, model: true })
      const res = await editProjectRoles(dataSources.id, dataSources)
      if (!res) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: '更新项目信息失败'
          }
        })
      }
      dispatch({ type: ProjectActionTypes.UpdatingDataSources, model: false })
      dispatch({ type: ProjectActionTypes.UpdateDataSources, model: res.result })
      dispatch({
        type: UIActionTypes.Message, model: {
          type: MessageTypes.Notification,
          content: '更新项目信息成功'
        }
      })
    }
  },

  // 打开supervisor配置弹窗
  openProjectSettingModal(project) {
    return {
      type: ProjectActionTypes.projectSettingModal,
      model: {
        visible: true,
        project
      }
    }
  },

  openProjectCheckModal(project) {
    return {
      type: ProjectActionTypes.ProjectCheckModal,
      model: {
        visible: true,
        project
      }
    }
  },

  closeProjectCheckModal() {
    return {
      type: ProjectActionTypes.ProjectCheckModal,
      model: {
        visible: false,
        project: null
      }
    }
  },

  // 关闭supervisor配置弹窗
  closeProjectSettingModal() {
    return {
      type: ProjectActionTypes.projectSettingModal,
      model: {
        visible: false,
        project: null
      }
    }
  },

  isquerying(payload) {
    return {
      type: ProjectActionTypes.updateSupervisorStatus,
      model: payload
    }
  },

  // 获取supervisor配置
  getSuperVisorConfig(param) {
    return async dispatch => {
      // 查询需要使用id&name
      const { datasource_id , datasource_name  } = param
      // 查询前,将状态调整至loading状态
      dispatch({
        type: ProjectActionTypes.updateSupervisorStatus,
        model: true
      })
      const resp = await Fetch.post(Interface.querySupervisor, { id: datasource_id, name: datasource_name })
      dispatch({
        type: ProjectActionTypes.updateSupervisorStatus,
        model: false
      })
      // dispatch action & save data
      if(resp.success && resp.result) {
        dispatch({
          type: ProjectActionTypes.saveSupervisorConfig,
          model: resp.result
        })
      }else{
        dispatch({
          type: ProjectActionTypes.saveSupervisorConfig,
          model: {
            localConfig:{},
            originConfig:{}
          }
        })
      }
    }
  },

  getUindexConfig(param) {
    return async dispatch => {
      const { datasource_id } = param
      const resp = await Fetch.post(Interface.queryUindexSpec,{ id: datasource_id })
      if(resp.success && resp.result) {
        dispatch({
          type: ProjectActionTypes.saveSupervisorConfig,
          model: {
            localConfig: resp.result.localConfig,
            originConfig:{}
          }
        })
      }else{
        dispatch({
          type: ProjectActionTypes.saveSupervisorConfig,
          model: {
            localConfig:{},
            originConfig:{}
          }
        })
      }
    }
  },

  updateSupervisor(param) {
    return async (dispatch, state) => {
      const project = state()
      const { datasource_id } = project.Project.settingDataSources
      const resp = await Fetch.post(Interface.upDateSupervisor, { id: datasource_id, config: param })
      
      if(resp) {
        dispatch({
          type: ProjectActionTypes.projectSettingModal,
          model: {
            visible: false,
            project: null
          }
        })
      }
    }
  },

  setSdkGlobalConfig(param) {
    return async (dispatch, state) => {
      const res = await Fetch.post(Interface.setSdkGlobalConfig, param)
      if (res) {
        const sdkGlobalConfig = _.reduce(param.config, (r,v,k) => {
          r[v.key]  = v.val
          return r
        }, {})
        dispatch({
          type: ProjectActionTypes.setSdkGlobalConfig,
          model: {
            sdkGlobalConfig
          }
        })
        dispatch({
          type: UIActionTypes.Message,
          model: {
            type: res.success ? MessageTypes.Notification : MessageTypes.InterfaceError,
            content: res.success ? res.result : res.message
          }
        })
      }
    }
  },

  getSdkGlobalConfig() {
    return async dispatch => {
      const res = await Fetch.get(Interface.getSdkGlobalConfig)
      if (res.success) {
        const sdkGlobalConfig = _.reduce(res.result, (r, v, k) => {
          r[v.key] = v.value
          return r
        }, {})
        dispatch({
          type: ProjectActionTypes.setSdkGlobalConfig,
          model: {
            sdkGlobalConfig
          }
        })
      }
    }
  },

  getUserGroups(){
    return async dispatch => {
      const res = await Fetch.get(Interface.getUserGroups)
      const result = res.result
      dispatch({ type: ProjectActionTypes.getUserGroups, model: result })
    }
  }
}

export {
  Actions
}
