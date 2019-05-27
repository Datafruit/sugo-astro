import fs, { readdirSync } from 'fs'
import { resolve, extname } from 'path'
import _ from 'lodash'
import conf from '../../config'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'
import pathToRegexp from 'path-to-regexp'

// api可以按目录分模块，例如marketing目录为智能营销模块
const OTHER_API_DIRS = readdirSync(resolve(__dirname)).map(f => {
  const path = resolve(__dirname, f)
  const isDirectory = fs.statSync(path).isDirectory()
  if (isDirectory === true && f !== 'console-pages') { // 排除console-page目录配置（因为已经在console.page.js包含了该目录配置的路由）
    return path
  }
}).filter(_.identity) || []

/** api获取的目录;默认读取当前目录所有除index.js以外的js，不包含子目录，如果新增子目录如：marketing */
const API_DIRS = [__dirname].concat(OTHER_API_DIRS)

function readApiFiles(dirname) {
  const files = readdirSync(dirname).filter(f => {
    return !/^index/.test(f) && extname(f) === '.js'
  })
  const routesArr = []
  files.forEach(f => {
    let obj = require(resolve(dirname, f))
    let { prefix, routes } = obj.default
    routesArr.push(...routes.map(r => {
      r.path = prefix ? '/' + prefix + r.path : r.path
      r.id = `${r.method}#${r.path}`
      r.pathReg = pathToRegexp(r.path)
      return r
    }))
  })
  return routesArr
}

function getApis() {
  const routesArr = _.flatMap(API_DIRS.map(dir => readApiFiles(dir)))
  // 404
  /*routesArr.push({
    path: '*',
    requirePermission: false,
    title: '404',
    lib: 'controllers/page.controller',
    requireLogin: false,
    func: 'console',
    method: 'get'
  })*/

  return routesArr
}

//强制退出进程
function exit(err) {
  process.nextTick(function () {
    throw new Error(err)
  })
}

//检查权限列表标题重复情况
function checkDup (permissions) {
  let titles = _.uniq(permissions.map(i => i.title))
  if (permissions.length !== titles.length) {
    let errs = []
    for(let title of titles) {
      let count = permissions.filter(p => p.title === title)
      if (count.length > 1) {
        errs.push(title)
      }
    }
    exit('权限列表有标题重复，请检查:' + errs.join(','))
  }
}

export const apis = getApis()
export const permissions = apis.filter(r => {
  return r.requirePermission === true
})

export const commonPermissions = permissions.filter(r => {
  return r.common
})

//检查routeRole关联表是否存在不正确的关联要处理，这种情况需要写update脚本处理
export async function checkDbRoleRoute(db) {
  if (conf.site.env !== 'development') {
    return
  }
  let relations = await db.SugoRoleRoute.findAll()
  for (let r of relations) {
    let {route_id} = r
    let [method, path] = route_id.split('#')
    // 使用扩展之后的 permissions，否则扩展包里面添加的权限项，会导致 server 启动报错
    let exist = _.find(module.exports.permissions, {
      method,
      path
    })
    if (!exist) {
      // exit(route_id + ' @db.SugoRoleRoute.route_id需要写update脚本处理掉')
      console.error(route_id + ' @db.SugoRoleRoute.route_id需要写update脚本处理掉')
    }
  }
  console.log('db.SugoRoleRoute 验证完毕')
}

moduleExtend(__filename)
checkDup(exports.permissions)
// 补充 pathReg
exports.apis.forEach(p => {
  if (!p.pathReg) {
    p.pathReg = pathToRegexp(p.path)
  }
})
exports.permissions.forEach(p => {
  if (!p.pathReg) {
    p.pathReg = pathToRegexp(p.path)
  }
})

exports.apis.push({
  id: 'get#*',
  path: '*',
  requirePermission: false,
  title: '404',
  lib: 'controllers/page.controller',
  requireLogin: false,
  func: 'console',
  method: 'get',
  pathReg: pathToRegexp('*')
})
