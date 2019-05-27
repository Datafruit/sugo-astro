//check login
import _ from 'lodash'
import {permissions, apis} from '../models/apis'
import {dictBy} from '../../common/sugo-utils'
import pathToRegexp from 'path-to-regexp'

const pathRegDict = dictBy(apis, a => a.path, a => a.pathReg)

export default async(ctx, next) => {
  const { user = {} } = ctx.session
  const path = ctx.path
  const redirect = '/'
  const method = _.toLower(ctx.method)
  const { permissions: currentPermissions = [] } = user
  const noPermissionBody = {
    error: '您所在用户组无权访问这个接口',
    code: 401
  }
  const inPermisson = _.find(permissions, p => p.pathReg.test(path) && _.toLower(p.method) === method)
  const hasPermisson = _.find(currentPermissions, p => (pathRegDict[p.path] || pathToRegexp(p.path)).test(path) && _.toLower(p.method) === method)

  if (!inPermisson || (inPermisson && hasPermisson)) {
    const currentApi = _.find(apis, p => (pathRegDict[p.path] || pathToRegexp(p.path)).test(path) && _.toLower(p.method) === method)
    if (!currentApi) {
      return await next()
    }
    // 列表接口没有显示权限验证(requirePermission:false)，但可以通过添加依赖权限接口权限访问控制；例如：
    // {
    //   path: '/list', // 实际接口路径 => `/app/businessdbsetting/list`
    //   title: '获取设置列表',
    //   method: 'post',
    //   func: 'getList',
    //   requirePermission: false,
    //   authPermission: 'get:/console/business-db-setting' // 注意 authPermission只能应用于单表，没有其他引用接口验证
    // }
    // 如上配置意思：/app/businessdbsetting/list接口没有显示的权限控制，但依赖/console/business-db-setting权限控制，
    // 也就是如果拥有/console/business-db-setting权限同样拥有权限访问/app/businessdbsetting/list权限
    const hasRefPermisson = _.find(currentPermissions, p => currentApi.authPermission === `${_.toLower(p.method)}:${p.path}`)
    if(currentApi.authPermission && !hasRefPermisson) {
      ctx.status = 401
      return ctx.body = noPermissionBody
      // ctx.throw(401, '您所在用户组无权访问这个接口')
    }
    return await next()
  }

  if (/^\/app\//.test(path)) {
    ctx.status = 401
    return ctx.body = noPermissionBody
  }

  return ctx.redirect(redirect)
}
