import { ProjectAccessActionTypes, MessageTypes } from './constants'
import { RightPanelState, UIActionTypes, CommonActionNames } from '../constants'
import { AccessType } from '../../../Project/store/access/constants'
import { Interface } from '../../interface'
import { getDimensions } from '../../../../databus/datasource'
import Fetch from '../../../../common/fetch-final'

const Actions = {
  /**
   * 获取项目描述信息及数据源信息
   * @param project_id
   * @return {function(*)}
   */
  getProfileAndDimensions: (project_id) => {
    return async dispatch => {
      // 更新ui状态为加载状态
      dispatch({
        type: ProjectAccessActionTypes.AccessList,
        model: [],
        isLoading: true
      })
      
      const model = {
        dataAccessList: [],
        dimensions: [],
        associations: [],
        project: {}
      }
      
      // 获取项目描述信息
      response = await Fetch.get(Interface.info, { project_id })
      result = response.result
      
      if (!result.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }
      model.project = result.model
      
      // 获取所有数据表
      let response = await Fetch.get(Interface.tables, { project_id })
      let result = response.result
      if (!result.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: result
          }
        })
      }
      
      model.dataAccessList = result.model
      const analysis_table = result.model.filter(t => t.type === AccessType.Dimension)
      // 获取项目维度信息,包含所有的数据表维度
      const analysis_ids = result.model.map(m => m.id)
      
      if (analysis_ids.length > 0) {
        /** @type {{total: Number, data: Array}} */
        response = await getDimensions(model.project.datasource_id, { noauth: true })
        if (!response) {
          return dispatch({
            type: UIActionTypes.Message,
            model: { type: MessageTypes.InterfaceError, content: response }
          })
        }
        model.dimensions = response.data
        
        // 查询关联信息
        if (analysis_table.length > 0) {
          response = await Fetch.post(Interface.association, {
            analysis_ids: analysis_table.map(t => t.id)
          })
          result = response.result
          
          if (!result.success) {
            return dispatch({
              type: UIActionTypes.Message,
              model: { type: MessageTypes.InterfaceError, content: result }
            })
          }
          model.associations = result.model
        }
      }
      
      dispatch({ type: ProjectAccessActionTypes.ProjectInit, model })
    }
  },
  
  updateDimensions(datasource_id){
    return async dispatch => {
      /** @type {{total: Number, data: Array}} */
      const response = await getDimensions(datasource_id, { noauth: true })
      
      if (!response) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: response }
        })
      }
      
      dispatch({
        type: ProjectAccessActionTypes.DimensionsList,
        model: response.data
      })
    }
  },
  
  /** 显示主表维度 */
  showDimensions: () => {
    return dispatch => {
      dispatch({
        type: UIActionTypes.RightPanelState,
        model: { state: RightPanelState.ShowDimensions }
      })
    }
  },
  
  /** 添加数据接入 */
  addAccess: () => {
    return {
      type: UIActionTypes.RightPanelState,
      model: { state: RightPanelState.AddAccess }
    }
  },
  
  /** 编辑数据接入 */
  editDataAccess: (analysis) => {
    return {
      type: UIActionTypes.RightPanelState,
      model: {
        state: RightPanelState.EditAccess,
        data: analysis
      }
    }
  },
  
  /** 删除数据接入 */
  deleteDataAccess: (analysis) => {
    return async dispatch => {
      const resp = await Fetch.get(`${Interface.deleteAccess}/${analysis.id}`)
      const result = resp.result
      if (result.success) {
        dispatch({
          type: UIActionTypes.RightPanelState,
          model: {
            state: RightPanelState.DeleteAccess,
            data: result.model
          }
        })
      } else {
        dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }
    }
  },
  
  /** 添加维度数据接入 */
  addDimensionAccess: () => {
    return {
      type: UIActionTypes.RightPanelState,
      model: {
        state: RightPanelState.AddDimensionAccess
      }
    }
  },
  
  /** 编辑接入的维度 */
  editAccessDimensions: (analysis) => {
    return {
      type: UIActionTypes.RightPanelState,
      model: {
        state: RightPanelState.EditAccessDimensions,
        data: analysis
      }
    }
  },
  
  /** 删除接入的维度 */
  deletedDimensionAccess: (analysis) => {
    return {
      type: UIActionTypes.RightPanelState,
      model: {
        state: RightPanelState.DeleteDimensionAccess,
        data: analysis
      }
    }
  },
  
  /** 添加关联 */
  addAssociation: (leftTable, rightTable, left, right) => {
    return async dispatch => {
      const response = await Fetch.post(Interface.associate, {
        analysis_id: rightTable.info.id,
        associate: [{
          main_dimension: left,
          associate_dimension: right
        }]
      })
      const result = response.result
      if (!result.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: { type: MessageTypes.InterfaceError, content: result }
        })
      }
      
      dispatch({
        type: ProjectAccessActionTypes.AddAssociation,
        model: result.model
      })
    }
  },
  
  /** 删除关联 */
  removeAssociation: (leftTable, rightTable, left, right) => {
    return {
      type: ProjectAccessActionTypes.RemoveAssociation,
      model: { leftTable, rightTable, left, right }
    }
  },
  
  updateState(model){
    return { type: CommonActionNames.UpdateState, model }
  }
}

export {
  Actions
}
