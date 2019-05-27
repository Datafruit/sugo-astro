/**
 * Created by asd on 17-7-10.
 */

import { SEPARATOR, QUOTATION } from 'next-reader/dist/parser/csv'

const separator_keys = ['逗号', '分号', '空格', 'Tab键']
const separator_map_keys = ['Comma', 'Semicolon', 'Space', 'Tab']
const quotation_keys = ['"', '\'']
const quotation_map_keys = ['DoubleQuotation', 'SingleQuotation']

const ConfMap = new Map()
separator_keys.forEach((name, index) => ConfMap.set(name, separator_map_keys[index]))
quotation_keys.forEach((name, index) => ConfMap.set(name, quotation_map_keys[index]))

/**
 * @param {String} name
 * @return {String}
 */
function getKey (name) {
  return ConfMap.get(name)
}

/**
 * 使用UI上显示的值获取到CSVParser实际配置
 * @param {String} name
 * @return {*}
 */
function getValue (name) {
  const MAP_KEY = getKey(name)
  return SEPARATOR.hasOwnProperty(MAP_KEY) ? SEPARATOR[MAP_KEY] : QUOTATION[MAP_KEY]
}

export {
  separator_keys,
  quotation_keys,
  separator_map_keys,
  quotation_map_keys,
  getKey,
  getValue
}
