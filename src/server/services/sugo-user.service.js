/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   16/01/2018
 * @description 用户相关服务
 */

import db from '../models'
import { permissions } from '../models/apis'
import { BaseService } from './base.service'
import _ from 'lodash'

const permissionTree = permissions.reduce((prev, p) => {
  prev[p.id] = p
  return prev
}, {})

export default class SugoUserService extends BaseService {
  constructor() {
    super('SugoUser')
  }

  static _instance = null

  static getInstance() {
    if (SugoUserService._instance === null) {
      SugoUserService._instance = new SugoUserService()
    }
    return SugoUserService._instance
  }

  /**
   * 获取用户权限列表
   * @param {string} username
   * @return {Array<Object>} 
   */
  async getUserPermissions(username) {
    let user = await db.SugoUser.findOne({
      where: {
        username: username
      },
      include: [{
        model: db.SugoRole
      }]
    })
    if (!user) {
      return []
    }

    user = user.get({ plain: true })
    const roles = user.SugoRoles || []
    let permissionsList = []
    let isAdmin = roles.filter(r => r.type === 'built-in').length
    let roleIds = roles
      .filter(r => r.type !== 'built-in')
      .map(r => r.id)

    if (isAdmin) {
      permissionsList = permissions.slice(0)
    } else {
      permissionsList = await db.SugoRoleRoute.findAll({
        where: {
          role_id: {
            $in: roleIds
          }
        }
      })
      permissionsList = permissionsList
        .map(p => p.route_id)
      permissionsList = _.uniq(permissionsList)
      permissionsList = permissionsList.map(p => {
        return permissionTree[p]
      }).filter(_.identity)
      permissionsList = permissionsList.concat(permissions.filter(p => p.common))
      permissionsList = _.uniqBy(permissionsList, p => p.method + ':' + p.path)
    }

    return permissionsList
  }
}
