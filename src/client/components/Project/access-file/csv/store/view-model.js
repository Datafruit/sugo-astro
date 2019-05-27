/**
 * Created by asd on 17-7-8.
 */

import Action from './action'
import Actions from './actions'
import _ from 'lodash'
import { DIMENSION_TYPES } from '../../../constants'
import { separator_keys, quotation_keys } from './package/parser-conf'

/**
 * @typedef {Object} DimensionWithValidate
 * @property {String} name - 维度名
 * @property {String} type - 维度类型
 * @property {Boolean} [fault] - 列名是否非法
 * @property {Boolean} [diff] - 维度类型与之前上报的维度是否不同
 */

/**
 * @typedef {Object} CsvAccessorViewModel
 * @property {?File} file                                        - 需要上传的文件
 * @property {Array<String>} lines                               - 已解析的数据行
 * @property {Array<DimensionWithValidate>} dimensions           - 包含的维度
 * @property {Array<Number>} selectDimensions                    - 选择接入的维度，以index为选择键
 * @property {Array<{name:String,type:Number}>} timeDimensions   - 时间维度
 * @property {?String} timeColumn - 时间列名
 * @property {?String} timeFormat - 时间格式
 * @property {Array<DimensionModel>} existsDimensions - 已在的维度
 * @property {Array<DimensionModel>} postDimensions   - 已上报的维度
 *
 * @property {Number} startImportAtRow      - 开始导入的行号
 * @property {String} separator             - 分隔符
 * @property {Array<String>} separator_keys - 分隔符列表
 * @property {String} quotation             - 引用标识符
 * @property {Array<String>} quotation_keys - 引用标识列表
 *
 * @property {Array<String>} dimensionTypes - 维度类型列表
 * @property {?number} granularity           - 段粒度
 * @property {?moment} since                 - 起始时间
 * @property {?moment} until                 - 结束时间
 * @property {boolean} scanning              - 自动扫描文件
 * @property {boolean} scanProcess           - 自动扫描进度
 *
 * @property {Number} progress              - 数据上报进度
 * @property {CSVPostman|null} postman      - 数据上报实例
 */

/** @type {CsvAccessorViewModel} */
const Def = {
  file: null,
  lines: [],
  dimensions: [],
  selectDimensions: [],
  timeDimensions: [],
  timeColumn: null,
  timeFormat: 'millis',
  existsDimensions: [],
  postDimensions: [],
  //projectId: '',

  // 导入配置
  startImportAtRow: 2,
  separator: separator_keys[0],
  separator_keys,
  quotation: quotation_keys[0],
  quotation_keys: quotation_keys,

  // 维度类型，现在没有dateString类型了
  dimensionTypes: Object.keys(_.omit(DIMENSION_TYPES, 'dateString')),
  granularity: null,
  since: null,
  until: null,

  // 上传数据
  progress: 0,
  postman: null
}

/**
 * @param {CsvAccessorViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  const { type, payload } = action
  switch (type) {

    case Action.parseFile:
      return Actions.csvReader(state, this.store, done)

    case Action.setDimensionType:
      return Actions.setDimensionType(state, payload.index, payload.type)

    case Action.timeRange:
      return Actions.timeRange(state, payload.since, payload.until)

    case Action.queryDimensions:
      return Actions.queryDimensions(payload.datasource_id, this.store, done)

    case Action.postDimensions:
      return Actions.postDimensions(state, this.store, done)

    case Action.postData:
      return Actions.postData(state, this.store, done)

    case Action.selectDimensions:
    case Action.change:
      return { ...payload }

    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
