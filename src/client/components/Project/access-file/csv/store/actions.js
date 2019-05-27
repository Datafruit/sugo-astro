/**
 * Created by asd on 17-7-8.
 */

import _ from 'lodash'
import { ReadCsvWithLines } from 'next-reader'
import {
  DIMENSION_TYPES,
  DIMENSION_MAP,
  PLATFORM,
  AccessTypes,
  AccessDataTableType
} from '../../../constants'

import DimensionResource from '../../../../../models/dimension/resource'
import DataSourceResource from '../../../../../models/data-source/resource'
import ProjectResource from '../../../../../models/project/resource'
import DimUtils from '../../../../../../common/dimensions-utils'

import { CSVPostman, STATUS, PARSE_ERROR_MAP } from './package/postman'
import { getKey, getValue } from './package/parser-conf'
import Action from './action'
import { Action as MessageAction } from './message'

const DIMENSION_TYPES_INVERT = _.invert(DIMENSION_TYPES)

/**
 * 检测维度名是否非法，维度类型是否重复
 * @param {Array<DimensionWithValidate>} cur
 * @param {Array<DimensionStoreModel>} prev
 * @return {Array<DimensionWithValidate>}
 */
function dimensionChecker (cur, prev) {
  const map = DimUtils.nameMap(prev)
  return cur.map(d => {
    const exits = map.get(d.name)
    const diff = exits
      ? !DimUtils.sameType(exits, {
        ...d,
        type: DIMENSION_TYPES[d.type]
      })
      : false

    const fault = d.name === '__time' || !DimUtils.checkName(d.name)
    return {
      ...d,
      diff,
      fault
    }
  })
}

/**
 * 构造table组件数组结构
 * @param {Array<{fields: Array<String>, size:Number, no:Number}>} lines
 * @param {Array<DimensionWithValidate>} titles
 * @param {Store} store
 * @return {Array<D>}
 */
function tableDataSourceCreator (lines, titles, store) {

  return lines.map((line) => {
    const obj = { __size: line.size, key: line.no }
    const fields = line.fields

    if (fields.length !== titles.length) {
      store.dispatch({
        type: MessageAction.column,
        payload: {
          titles,
          no: line.no,
          fields
        }
      })
      return obj
    }

    fields.forEach((value, i) => {
      obj[titles[i].name] = value
    })

    return obj
  })
}

/**
 * 维度名称检测，通过检测，反回true，否则返回false
 * @param {Array<String>} names
 * @param {Store} store
 */
function dimensionNameChecker (names, store) {
  // 列名非法
  const faultDimensionName = names.filter(name => name === '__time' || !DimUtils.checkName(name))
  if (faultDimensionName.length > 0) {
    store.dispatch({
      type: MessageAction.faultDimensionName,
      payload: {
        faultDimensionName
      }
    })
    return false
  }

  // 列名重复检测
  const duplicateDimensionName = DimUtils.duplicateName(names)
  if (duplicateDimensionName.length > 0) {
    store.dispatch({
      type: MessageAction.duplicateDimensionName,
      payload: {
        duplicateDimensionName
      }
    })
    return false
  }

  return true
}

export default {
  /**
   * 解析Csv格式文件，读前10条数据
   * @param {CsvAccessorViewModel} state
   * @param {Store} store - 需要传入store，因为可能需要dispatch错误消息
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async csvReader(state, store, done){

    const { file, startImportAtRow, separator, quotation } = state

    const total = startImportAtRow + 10
    const lines = []
    const reader = new ReadCsvWithLines(file, total, {
      separator: getValue(separator),
      quotation: getValue(quotation)
    })
    let exec = false
    let has_err = false

    reader.subscribe(onNext, onError, onComplete)
    reader.read()

    function onNext (record) {
      record.lines.forEach(line => lines.push(line))
    }

    function onError (error, already, read_size) {
      const { no, message, content } = error
      if (has_err || no > total) return
      has_err = true
      reader.pause()
      store.dispatch({
        type: MessageAction.parser,
        payload: {
          parser: {
            no,
            title: 'CSV解析错误',
            message: `错误位置: ${message.replace('Parse error index:', '')}`,
            content
          }
        }
      })

    }

    function onComplete () {
      // 取第一行数据为维度名
      // 默认选中所有的维度
      // 取第二行之后的数据为有效数据

      // ReadCsvWithLines会调用两次onComplete
      // 此处判断一下
      // 该Bug修复之后再删除
      if (exec) {
        return
      }

      exec = true
      const fields = (lines[0] || {}).fields || []
      const state = store.getState()

      // 维度名非法，忽略此次操作
      if (!dimensionNameChecker(fields, store)) {
        return done({
          file,
          lines: [],
          dimensions: [],
          selectedDimensions: [],
          timeDimensions: [],
          timeColumn: null,
          timeFormat: 'millis',
          postDimensions: [],

          progress: 0,
          postman: null
        })
      }

      const map = DimUtils.nameMap(state.vm.existsDimensions)

      // 如果之前已经上报过该维度，则使用之前的类型
      const dimensions = fields.map(name => {
        const prev = map.get(name)
        return {
          name,
          type: prev ? DIMENSION_TYPES_INVERT[prev.type] : DIMENSION_MAP.string
        }
      })

      // 添加第一行为列名称
      const source = tableDataSourceCreator(
        [lines[0]].concat(lines.slice(startImportAtRow - 1)),
        dimensions,
        store
      )
      source[0].key = '行号/列标题'

      done({
        file,
        dimensions,
        timeDimensions: dimensions.filter(d => d.type === DIMENSION_MAP.date),
        selectDimensions: dimensions.map(v => v.name),
        lines: source
      })
    }
  },

  /** 段粒度对应的时间表 */
  Granularity: {
    SECOND: 1000,
    MINUTE: 1000 * 60,
    FIVE_MINUTE: 1000 * 60 * 5,
    TEN_MINUTE: 1000 * 60 * 10,
    FIFTEEN_MINUTE: 1000 * 60 * 15,
    HOUR: 1000 * 60 * 60,
    SIX_HOUR: 1000 * 60 * 60 * 6,
    DAY: 1000 * 60 * 60 * 24,
    MONTH: 1000 * 60 * 60 * 24 * 30,
    YEAR: 1000 * 60 * 60 * 24 * 365
  },

  /**
   * @param {CsvAccessorViewModel} state
   * @param {number} since
   * @param {number} until
   * @return {object}
   */
  timeRange(state, since, until){
    const fileSize = state.file.size
    // 设每个分片为500MB
    const base = 500 * 1024 * 1024
    // 总共应分多少个片,四舍五入取值,最小为1
    const segments = fileSize > base ? Math.round(fileSize / base) : 1

    // 每片的时间大小
    const seconds = (until - since) / segments
    const Granularity = this.Granularity
    let granularity

    for (granularity in Granularity) {
      if (Granularity.hasOwnProperty(granularity) && Granularity[granularity] >= seconds) {
        break
      }
    }

    return {
      granularity,
      since,
      until
    }
  },

  /**
   * @param {String} datasource_id
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async queryDimensions(datasource_id, store, done){
    const res = await DimensionResource.list(datasource_id)
    done({
      existsDimensions: res.result,
      timeDimensions: res.result.filter(d => d.type === DIMENSION_TYPES.date)
    })
  },

  /**
   * 上报维度
   * @param {CsvAccessorViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  async postDimensions(state, store, done){
    const { dimensions, existsDimensions, selectDimensions } = state
    const { DataAnalysis } = store.getState()
    const _dimensions = dimensions
      .filter(d => selectDimensions.find(n => n === d.name))
      .map(d => ({ type: DIMENSION_TYPES[d.type], name: d.name }))

    // 维度名非法，不通过
    if (!dimensionNameChecker(_dimensions.map(d => d.name), store)) {
      return
    }

    // 添加druid中的__time维度
    _dimensions.push({ type: DIMENSION_TYPES.date, name: '__time' })

    // 维度类型不同，提示后继续上报
    const diff = DimUtils
      .getTypeDiff(_dimensions, existsDimensions)
      .map(d => d.name)

    if (diff.length > 0) {
      store.dispatch({
        type: MessageAction.diffDimensionType,
        payload: {
          diffDimensionType: diff
        }
      })
      return done({})
    }

    // 上报维度
    const res = await ProjectResource.postDimensions(
      _dimensions,
      DataAnalysis.id,
      PLATFORM.SINGLE,
      true
    )

    const ret = res.success ? res.result : {}
    done({ postDimensions: ret.dimensions || [] })
  },

  /**
   * @param {CsvAccessorViewModel} state
   * @param {Number} index
   * @param {String} type
   */
  setDimensionType(state, index, type){
    const { dimensions, existsDimensions, timeColumn } = state
    const next = dimensions.slice()
    next[index].type = type
    const nextDimensions = dimensionChecker(next, existsDimensions)
    const timeDimensions = nextDimensions.filter(d => d.type === DIMENSION_MAP.date)

    return {
      dimensions: nextDimensions,
      timeDimensions: timeDimensions,
      timeColumn: timeColumn
        ? timeColumn
        : (timeDimensions[0] ? timeDimensions[0].name : void 0)
    }
  },

  /**
   * 开始上报数据
   * @param {CsvAccessorViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  async postData(state, store, done){
    // 如果指定了time字段，需要使用指定参数重启task
    const { timeColumn, dimensions, granularity, since, until } = state
    /** @type {CsvAccessorState} */
    const storeState = store.getState()
    const { Project, DataAnalysis } = storeState

    // 如果有时间列，将会重新配置时间列去激活项目
    if (timeColumn) {
      // 无论什么格式的时间列，都会被转成millis
      const FORMAT = 'YYYY-MM-DD'
      const res = await DataSourceResource.updateSupervisorJsonTimeColumn(
        Project.datasource_id,
        timeColumn,
        {
          intervals: [since.format(FORMAT).concat('/').concat(until.format(FORMAT))],
          segmentGranularity: granularity,
          type: 'uniform'
        },
        'millis'
      )
      if (!res.success) {
        done({})
        return store.dispatch({
          type: MessageAction.change,
          payload: {
            normal: res.message
          }
        })
      }
    }

    // 如果没有时间列，则需要保证在上传数据之前项目为激活状态
    if (!timeColumn) {
      const res = await ProjectResource.activate(Project.id)
      if (!res.success) {
        done({})
        return store.dispatch({
          type: MessageAction.change,
          payload: {
            normal: `激活项目失败：${res.message}`
          }
        })
      }
    }

    // 数据上传之前,需要生成 token
    // 获得 token, 如果没有就生成一个
    // 该 token 是与后端数据采集接口交互凭证,所以一次生成后就不用再更新了
    let res = await DataSourceResource.getToken(AccessTypes.Csv)
    if (!res.result) {
      res = await DataSourceResource.createToken(AccessTypes.Csv)
    }

    const token = res.result
    const { collectGateway } = window.sugo

    const url = `${collectGateway}/`
      + `${DataAnalysis.type === AccessDataTableType.Main ? 'post' : 'postdim'}?`
      + `locate=${Project.datasource_name}&token=${token}`
      + `&table=${Project.id}`

    const {
      file,
      selectDimensions,
      separator,
      quotation,
      startImportAtRow
    } = state

    const indexMap = new Map()
    const nameMap = new Map()
    const _dimensions = dimensions.map((d, i) => {
      const name = d.name
      indexMap.set(name, i)
      nameMap.set(d.name, name)
      return {
        ...d,
        name
      }
    })

    const postman = new CSVPostman({
      url,
      file,
      deleted: new Array(startImportAtRow - 1).fill(1).map((v, i) => i + 1),
      // 传入需要上报维度的index
      dimensions: selectDimensions.map(name => indexMap.get(nameMap.get(name))),
      // 维度名，与dimension index对应
      titles: _dimensions.map(d => d.name),
      // 维度类型与dimension index对应
      titleTypes: _dimensions.map(d => ({ type: d.type, name: d.name })),
      csvParseConf: {
        separator: getKey(separator),
        quotation: getKey(quotation)
      }
    })

    postman.subscribe(action => {
      const { type, payload } = action
      switch (type) {

        case STATUS.PROGRESS:
          store.dispatch({
            type: Action.change,
            payload: {
              progress: payload.progress
            }
          })
          break

        case STATUS.NETWORK_ERROR:
          store.dispatch({
            type: MessageAction.network
          })
          break

        case STATUS.ERROR:
          // TODO 缓存错误信息，生成可下载错误日志
          // 如果错误日志太多，则不能放在本地内存里

          if (payload.type === PARSE_ERROR_MAP.FIELD_LENGTH_NOT_EQUAL) {
            store.dispatch({
              type: MessageAction.column,
              payload: {
                column: payload
              }
            })
          } else {
            store.dispatch({
              type: MessageAction.parser,
              payload: {
                parser: payload.message
              }
            })
          }
          break
        default:
          break
      }
    })

    postman.start()

    done({ postman })
  }
}

