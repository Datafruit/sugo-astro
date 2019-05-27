/**
 * @Author sugo.io<asd>
 * @Date 17-11-25
 */

import { Action } from './real-user-actions'

export default {
  /**
   * @param {{type:string, model: RealUserTableModel}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.Create]: function (action, state) {
    return {
      realUserTables: state.realUserTables.concat(action.model)
    }
  },

  /**
   * @param {{type:string, model: {id:string,name:string,company_id:string}}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.UpdateName]: function (action, state) {
    const { id, name } = action.model
    return {
      realUserTables: state.realUserTables.map(function (r) {
        if (r.id === id) {
          return {
            ...r,
            name
          }
        }
        return r
      })
    }
  },

  /**
   * @param {{type:string, model: RealUserTableModel}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.FindOne]: function (action, state) {
    return {
      realUserTables: state.realUserTables.concat(action.model)
    }
  },

  /**
   * @param {{type:string, model: RealUserTableModel[]}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.FindAll]: function (action, state) {
    return {
      realUserTables: state.realUserTables.concat(action.model)
    }
  },

  /**
   * 用户表与项目关联
   * @param {{type:string, model: {project_id:string, user_table_id:string}}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.AssociateProject]: function (action, state) {
    let userTableAssociateProject = state.userTableAssociateProject
    const { project_id, real_user_table } = action.model
    const project = state.project.map(function (p) {
      if (p.id === project_id) {
        userTableAssociateProject = {
          ...p,
          real_user_table
        }
        return userTableAssociateProject
      }
      return p
    })

    return {
      project,
      userTableAssociateProject
    }
  },

  /**
   * @param {{type: string, model: {visible: boolean, project: ProjectModel}}} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.VisibleUserTableModal]: function (action, state) {
    return {
      userTableAssociateProject: action.model.project,
      visibleUserTableModal: action.model.visible
    }
  },

  /**
   * @param {{type:string, model:RealUserTableModel }} action
   * @param {ProjectState} state
   * @return {object}
   */
  [Action.Destroy]: function (action, state) {
    return {
      realUserTables: state.realUserTables.filter(r => r.id !== action.model.id)
    }
  }
}

