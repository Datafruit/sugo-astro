/**
 * Created by asd on 17-7-8.
 */
import _ from 'lodash'
import { Store, storeModelCreator, storeViewModelCreator } from 'sugo-store'

import Project, { Action as ProjectAction } from '../../../../../models/project'
import DataAnalysis, { Action as AnalysisAction } from '../../../../../models/data-analysis'
import VM, { Action as VMAction } from './view-model'
import Message from './message'
import createScanner from '../worker/main'
import { getKey, getValue } from './package/parser-conf'
import moment from 'moment'

/**
 * @param {String} type
 * @param [payload = {}]
 * @return {{type: *, payload: *}}
 */
function struct (type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} CsvAccessorState
 * @property {ProjectStoreModel} Project
 * @property {DataAnalysisStoreModel} DataAnalysis
 * @property {CsvAccessorViewModel} vm
 * @property {CsvAccessorMessage} message
 */

export default class CsvAccessor extends Store {
  constructor () {
    super()
    storeModelCreator([Project, DataAnalysis], this)
    storeViewModelCreator([VM, Message], this)
  }

  /**
   * 初始化时，需要接收项目数据、分析表数据以需要上传的文件实例
   * @param project
   * @param analysis
   * @param file
   * @return {CsvAccessor}
   */
  init (project, analysis, file) {
    this.dispatch(struct(ProjectAction.change, project))
    this.dispatch(struct(AnalysisAction.change, analysis))
    this.dispatch([
      struct(VMAction.queryDimensions, { datasource_id: project.datasource_id }),
      struct(VMAction.change, { file }),
      struct(VMAction.parseFile)
    ])
    return this
  }

  /**
   * 重新选择file时
   * @param file
   * @return {CsvAccessor}
   */
  setFile (file) {
    this.dispatch([
      struct(VMAction.change, {
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
      }),
      struct(VMAction.parseFile)
    ])
    return this
  }

  /**
   * 设置维度类型
   * @param {Number} index - 在dimensions中的位置
   * @param {String} type - 类型
   * @see {DIMENSION_TYPES}
   * @return {CsvAccessor}
   */
  setDimensionType (index, type) {
    this.dispatch(struct(VMAction.setDimensionType, { index, type }))
    return this
  }

  /**
   * 设置导入起始化
   * @param startImportAtRow
   * @return {CsvAccessor}
   */
  setStartImportAtRow (startImportAtRow) {
    this.dispatch([
      struct(VMAction.change, { startImportAtRow }),
      struct(VMAction.parseFile)
    ])
    return this
  }

  /**
   * 设置csv分隔符
   * @param separator
   * @return {CsvAccessor}
   */
  setSeparator (separator) {
    this.dispatch([
      struct(VMAction.change, { separator }),
      struct(VMAction.parseFile)
    ])
    return this
  }

  /**
   * 设置csv引用符
   * @param quotation
   * @return {CsvAccessor}
   */
  setQuotation (quotation) {
    this.dispatch([
      struct(VMAction.change, { quotation }),
      struct(VMAction.parseFile)
    ])
    return this
  }

  /**
   * 设置时间列
   * @param timeColumn
   * @return {CsvAccessor}
   */
  setTimeColumn (timeColumn) {
    this.dispatch(struct(VMAction.change, { timeColumn }))
    return this
  }

  /**
   * 扫描文件中的时间列,找出最小与最大时间
   * TODO 分片异常
   */
  scanTimeRange () {
    const vm = this.state.vm
    let index = 0
    vm.dimensions.forEach(function (dim, i) {
      if (dim.name === vm.timeColumn) {
        index = i
      }
    })

    // 同时开启线程数
    const concurrency = 3
    const scanner = createScanner(vm.file, index, vm.dimensions.length, {
      separator: getValue(vm.separator),
      quotation: getValue(vm.quotation)
    }, concurrency)

    scanner.on('process', process => {
      this.dispatch(struct(VMAction.change, { scanProcess: process.toFixed(2) }))
    })

    scanner.on('finish', results => {
      const { minTime, maxTime } = results
      this.dispatch(struct(VMAction.change, { scanning: false }))
      this.setTimeRange(moment(minTime), moment(maxTime))
    })

    scanner.on('error', message => console.log(message))
    scanner.initialize()

    this.dispatch(struct(VMAction.change, { scanning: true }))
  }

  /**
   * 设置时间范围,计算段粒度
   * @param {number} since
   * @param {number} until
   * @return {*<S>}
   */
  setTimeRange (since, until) {
    return this.dispatch(struct(VMAction.timeRange, { since, until }))
  }

  /**
   * 选择维度
   * @param selectDimensions
   * @return {CsvAccessor}
   */
  setSelectDimensions (selectDimensions) {
    this.dispatch(struct(VMAction.change, { selectDimensions }))
    return this
  }

  /**
   * 选择所有的维度
   * @param {Boolean} all
   * @return {CsvAccessor}
   */
  selectAllDimensions (all) {
    const { dimensions } = this.state.vm
    return this.setSelectDimensions(all ? dimensions.map(r => r.name) : [])
  }

  /**
   * 选择单个维度
   * @param {string} dimensionName
   * @return {CsvAccessor}
   */
  selectDimension (dimensionName) {
    const { selectDimensions } = this.state.vm
    let selectDimensionsNew = selectDimensions.includes(dimensionName)
      ? _.without(selectDimensions, dimensionName)
      : [...selectDimensions, dimensionName]

    this.dispatch(struct(VMAction.change, { selectDimensions: selectDimensionsNew }))
    return this
  }

  /**
   * 上报数据
   * @return {CsvAccessor}
   */
  async postData () {
    // 如果项目没有处于运行状态，尝试运行
    // 首先上报维度
    // 然后上报数据
    // 上报前先禁用掉上传按钮
    this.dispatch(struct(VMAction.change, {
      progress: 0.01
      //projectId
    }))
    this.dispatch([
      struct(VMAction.postDimensions),
      struct(VMAction.postData)
    ])
    return this
  }
}
