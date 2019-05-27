const ls = window.localStorage
import _ from 'lodash'
import {tryJsonParse} from '../../common/sugo-utils'
import moment from 'moment'

export const maxLSLength = 1000 * 50

export function get(key) {
  if (!key) {
    return null
  }
  return tryJsonParse(ls.getItem(key))
}

export function set(key, value) {
  let str = _.isString(value)
      ? value
      : JSON.stringify(value)

  if ((str || '').length > maxLSLength) {
    return console.log(`string size > ${maxLSLength}, choose not save it`, str)
  }

  return ls.setItem(
    key,
    str
  )
}

//get str
export function gets(key) {
  return ls.getItem(key)
}

export function clear(keys) {
  return keys.forEach(key => ls.removeItem(key))
}

/**
 * 只有当 value 为 object 时才支持
 * @param key
 * @param value
 * @param expire
 */
export function setWithExpire(key, value, expire = 'P3D') {
  if (!_.isObject(value)) {
    throw new Error('Expire: 只有当 value 为 object 时才支持')
  }
  set(key, {...value, __expireAt: moment().add(moment.duration(expire)).valueOf()})
}

// 清除过时的项
let initTime = Date.now()
let expiredCount = 0
for (let k in localStorage) {
  let v = localStorage.getItem(k)
  if (_.includes(v, '__expireAt')) {
    try {
      let objMayExpire = JSON.parse(v)
      if (objMayExpire.__expireAt < initTime) {
        localStorage.removeItem(k)
        expiredCount += 1
      }
    } catch (e) {
      console.err(e)
    }
  }
}
if (expiredCount) {
  console.log(`清除了过时的 localStorage 项 ${expiredCount} 个`)
}
