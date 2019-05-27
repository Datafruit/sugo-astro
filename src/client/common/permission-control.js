import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import pathToRegexp from 'path-to-regexp'
import {isEqualWithReactObj} from '../../common/sugo-utils'

const {permissions} = window.sugo

let pathSet = new Set(permissions.map(p => p.path))
let pathAndMethodList = permissions.map(p => `${p.method}:${p.path}`)
let pathAndMethodSet = new Set(pathAndMethodList)

export function checkPermission(option, dynamic = false) {
  if (_.isString(option)) {
    // method:path | path
    // o(1) 判断，比较快
    if (pathSet.has(option) || pathAndMethodSet.has(option)) {
      return true
    }
    // o(n) 判断，比较慢，建议改成 o(1) 判断
    return _.some(pathAndMethodList, str => str.indexOf(option) > -1)
  } else if (option instanceof RegExp) {
    return _.some(pathAndMethodList, str => option.test(str))
  } else if (_.isArray(option)) {
    return option.map(opt => checkPermission(opt))
  } else if (dynamic) {
    return _.some(pathAndMethodList, str => pathToRegexp('get:' + option.path).test(str))
  } else if (_.isObject(option)) {
    return _.find(permissions, option)
  } else {
    throw new Error('not a valid permission to check')
  }
}

export class Auth extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    auth: PropTypes.any,
    alt: PropTypes.any
  }

  // shouldComponentUpdate(nextProps) {
  //   return !isEqualWithReactObj(this.props, nextProps)
  // }

  render() {
    let {children, auth, alt} = this.props
    return checkPermission(auth)
      ? children
      : _.isString(alt)
        ? <span>{alt}</span>
        : _.isObject(alt) ? alt : null
  }
}

export class PermissionLink extends React.PureComponent {
  render() {
    let {to, auth, alt, children, ...rest} = this.props
    // 如果使用 <Link /> 则无法用于 message.error，所以用了 <a />
    return (
      <Auth auth={auth || to} alt={alt || (_.isString(children) ? children : undefined)}>
        <a href={to} {...rest}>{children}</a>
      </Auth>
    )
  }
}

//filter user routes
export function routePermissionFilter (routes) {
  let res = []
  _.each(routes, route => {
    let ok = route.pass || checkPermission({ path: route.path, method: 'get' }, route.dynamic)
    if (!ok) return
    let children = (route.childRoutes || []).filter(c => {
      return c.pass || checkPermission({
        path: c.path,
        method: 'get'
      })
    })
    route.childRoutes = children
    res.push(route)
  })
  return res
}

//filter user routes
export function menuFilterTop (menus) {
  let res = []
  _.each(menus, menu => {
    if(checkPermission({ path: menu.name })) {
      res.push(menu)
    }
  })
  return res
}

