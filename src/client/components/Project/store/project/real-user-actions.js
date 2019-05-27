/**
 * @Author sugo.io<asd>
 * @Date 17-11-25
 */

import Resources from '../../../../models/real-user-table/resource'
import ProjectResources from '../../../../models/project/resource'
import { MessageTypes } from './constants'
import { UIActionTypes } from '../constants'

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `namespace-real-user-table-${mark}`
}

export const Action = {
  Create: creator('create'),
  UpdateName: creator('update'),
  AssociateProject: creator('association-project'),
  FindOne: creator('find-one'),
  FindAll: creator('find-all'),
  Destroy: creator('destroy'),
  VisibleUserTableModal: creator('visible-user-table-modal')
}

const Actions = {

  /**
   * @param {boolean} visible
   * @param {ProjectModel} project
   * @return {{type: string, model: {visible: boolean, project: ProjectModel}}}
   */
  visibleUserTableModal(visible, project) {
    return {
      type: Action.VisibleUserTableModal,
      model: {
        visible,
        project
      }
    }
  },

  /**
   * 创建用户表
   * @param {string} name
   * @param {ProjectModel} project
   * @return {Function}
   */
  createUserTable(name, project){
    return async dispatch => {
      const res = await Resources.create(name)

      if (!res.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: {
              message: res.message
            }
          }
        })
      }

      dispatch({ type: Action.Create, model: res.result })
      dispatch({
        type: UIActionTypes.Message,
        model: {
          type: MessageTypes.Notification,
          content: `用户表[${name}]已创建`
        }
      })

      // 创建完成后,直接关联该项目
      Actions.associateProject(project, res.result)(dispatch)
    }
  },

  /**
   * 更新用户表名称
   * @param {string} id
   * @param {string} name
   * @return {Function}
   */
  updateName(id, name) {
    return async function (dispatch) {
      const res = await Resources.updateName(id, name)

      if (!res.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: {
              message: Object.keys(res.message).map(k => res.message[k]).join(';')
            }
          }
        })
      }

      dispatch({
        type: UIActionTypes.Message,
        model: {
          type: MessageTypes.Notification,
          content: '用户表名更新成功'
        }
      })
      dispatch({ type: Action.UpdateName, model: res.result })
    }
  },

  /**
   * 查找所有用户表
   * @return {Function}
   */
  findAllUseTables() {
    return async function (dispatch) {
      const res = await Resources.findAll()

      if (!res.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: {
              message: res.message
            }
          }
        })
      }

      dispatch({ type: Action.FindAll, model: res.result })
    }
  },

  /**
   * @param {ProjectModel} project
   * @param {RealUserTableModel} userTable
   * @return {Function|object}
   */
  associateProject(project, userTable) {

    if (project.real_user_table === userTable.id) {
      return {
        type: UIActionTypes.Message,
        model: {
          type: MessageTypes.Notification,
          content: '所选用户表与项目已关联用户表相同'
        }
      }
    }

    return async function (dispatch) {
      const res = await ProjectResources.associateRealUserTable(project.id, userTable.id)

      if (!res.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: {
              message: res.message
            }
          }
        })
      }

      dispatch({
        type: Action.AssociateProject,
        model: {
          project_id: project.id,
          real_user_table: userTable.id
        }
      })

      // 提示消息
      dispatch({
        type: UIActionTypes.Message,
        model: {
          type: MessageTypes.Notification,
          content: '关联用户表成功'
        }
      })
    }
  },

  /**
   * 删除用户表
   * @param {RealUserTableModel} mod
   * @return {Function}
   */
  destroy(mod) {
    return async function (dispatch) {
      const res = await Resources.destroy(mod.id)

      if (!res.success) {
        return dispatch({
          type: UIActionTypes.Message,
          model: {
            type: MessageTypes.InterfaceError,
            content: {
              message: res.message
            }
          }
        })
      }

      dispatch({ type: Action.Destroy, model: res.result })
      dispatch({
        type: UIActionTypes.Message,
        model: {
          type: MessageTypes.Notification,
          content: `用户表[${res.result.name}]已删除`
        }
      })
    }
  }
}

export default Actions

export {
  Actions
}
