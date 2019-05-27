const ss = window.sessionStorage
import _ from 'lodash'
import {tryJsonParse} from '../../common/sugo-utils'

export const maxLSLength = 1000 * 50

export function get(key) {
  if (!key) {
    return null
  }
  return tryJsonParse(ss.getItem(key))
}

export function set(key, value) {
  let str = _.isString(value)
      ? value
      : JSON.stringify(value)

  if ((str || '').length > maxLSLength) {
    return console.log(`string size > ${maxLSLength}, choose not save it`, str)
  }

  return ss.setItem(
    key,
    str
  )
}

//get str
export function gets(key) {
  return ss.getItem(key)
}

export function clear(keys) {
  return keys.forEach(key => ss.removeItem(key))
}
