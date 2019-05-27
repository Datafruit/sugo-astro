import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'

const buildUsers = res => {
  return res.map(r => {
    r.roles = r.SugoRoles.slice(0)
    delete r.SugoRoles
    return r
  })
}

const getUsers = (query) => {

  return async dispatch => {

    setLoading(dispatch, true)

    let res = await Fetch.get(remoteUrl.GET_USERS, query)

    setLoading(dispatch, false)

    let action1 = {
      type: 'set_users',
      data: buildUsers(res.result)
    }

    if(res) dispatch(action1)

  }

}

const updateUser = (user, callback) => {

  return async dispatch => {

    let action = {
      type: 'update_users',
      data: user
    }

    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.EDIT_USER, {
      // 移除多余信息，避免日志增长过快
      user: zipUser(user)
    })

    setLoading(dispatch, false)
    delete action.data.password
    if(res) dispatch(action)

    if (_.isFunction(callback)) callback(res)

  }

}

function zipUser(user) {
  return {
    ...user,
    roles: user.roles.map(r => ({ id: r.id, name: r.name, type: r.type }))
  }
}

const addUser = (user, callback) => {

  return async dispatch => {

    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_USER, {
      // 移除多余信息，避免日志增长过快
      user: zipUser(user)
    })
    setLoading(dispatch, false)
    let data = {
      ...res.result,
      roles: user.roles
    }
    let action = {
      type: 'add_users',
      data
    }
    if(res) dispatch(action)
    if (_.isFunction(callback)) callback(res)

  }

}

const delUser = (record, callback) => {

  return async dispatch => {

    let id = record.id
    let action = {
      type: 'del_users',
      data: record
    }

    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_USER, _.pick(record, ['id', 'username'])) // 带上 username 便于解释日志
    setLoading(dispatch, false)

    if(res) dispatch(action)

    if (_.isFunction(callback)) callback(res)

  }

}

//actions maptoprops
export {
  getUsers,
  updateUser,
  addUser,
  delUser
}
