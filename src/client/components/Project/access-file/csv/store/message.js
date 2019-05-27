/**
 * Created by asd on 17-7-10.
 */

import { namespace } from '../../../constants'

function creator (mark) {
  return `${namespace.access}-file-csv-${mark}`
}

const Action = {
  parser: creator('parse-error'),
  network: creator('network-error'),
  // 非法列名
  faultDimensionName: creator('fault-dimension-name'),
  // 列名重复
  duplicateDimensionName: creator('duplicate-dimension-name'),
  // 维度类型与此前设置的不一致
  diffDimensionType: creator('diff-dimension-type'),
  change: creator('change')
}

/**
 * @typedef {Object} FileParserMessage
 * @property {String} type
 * @property {Number} no
 * @property {Array<String>} titles
 * @property {Array<String>} fields
 */

/**
 * @typedef {Object} CsvAccessorMessage
 * @property {FileParserMessage | null} parser
 * @property {Boolean|null} network
 * @property {Array<String>|null} faultDimensionName
 * @property {Array<String>|null} diffDimensionType
 * @property {Array<String>|null} duplicateDimensionName
 * @property {?String} normal
 */

/** @type {CsvAccessorMessage} */
const Def = {
  parser: null,
  network: null,
  faultDimensionName: null,
  diffDimensionType: null,
  duplicateDimensionName: null,
  normal: null
}

/**
 * @param {CsvAccessorMessage} state
 * @param {Object} action
 * @param {Function} next
 */
function scheduler (state, action, next) {
  const { type, payload } = action

  // 一个错误发生时，清空其他错误
  // 保证每个错误只传递一次到view
  switch (type) {
    case Action.parser:
    case Action.network:
    case Action.faultDimensionName:
    case Action.diffDimensionType:
    case Action.duplicateDimensionName:
    case Action.change:
      return {
        ...Def,
        ...payload
      }
    default:
      return { ...Def }
  }
}

export default {
  name: 'message',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
