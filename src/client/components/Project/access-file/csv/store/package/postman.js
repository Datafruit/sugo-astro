/**
 * @typedef {Object} CsvPostOptions
 * @property {String} url
 * @property {File} file
 * @property {Array} titles
 * @property {Array} dimensions
 * @property {Object} changed
 * @property {Array} deleted
 * @property {Object} titleTypes
 */

import _ from 'lodash'
import Fetch from '../../../../../../common/fetch-final'
import { UTF8Parser, CSVParser, Base64Parser, Scheduler, utils } from 'next-reader'
import { DIMENSION_MAP, DIMENSION_TYPES } from '../../../../constants'
import moment from 'moment'
import React from 'react'
import { CsvEncoding } from './CsvEncoding'

const short_id = utils.short_id
const DIMENSION_TYPES_INVERT = _.invert(DIMENSION_TYPES)

const STATUS = {
  PROGRESS: short_id(),
  NETWORK_ERROR: short_id(),
  ERROR: short_id()
}

const State = {
  Normal: short_id(),
  ReadStart: short_id(),
  ReadEnd: short_id()
}

const DefConf = {
  titles: [],
  dimensions: [],
  file: null,
  url: '',
  changed: {},
  deleted: [],
  titleTypes: {}
}

// 解析错误类型
const PARSE_ERROR_MAP = {
  // 解析出的列数与csv文件第一行定义的列数不相同
  FIELD_LENGTH_NOT_EQUAL: short_id(),
  // 列名字段为空
  EMPTY_TITLE: short_id()
}

class CSVPostman {
  /**
   * @param {CsvPostOptions} options
   */
  constructor (options) {
    options = Object.assign({}, DefConf, options)

    const { dimensions, titleTypes, csvParseConf: { separator, quotation } } = options
    const columns = dimensions.map(index => ({
      index,
      type: DIMENSION_MAP[titleTypes[index].type],
      name: titleTypes[index].name
    }))
    this.opt = options
    this.subscriber = _.noop
    this.identify_rows = this._createIdentify()
    this.encoder = new CsvEncoding({
      file: options.file,
      columns,
      identify_rows: this.identify_rows,
      separator,
      quotation
    })
    this.utf8_parser = new UTF8Parser()
    this.base64_parser = new Base64Parser()
    this.csv_parser = new CSVParser()
    this.scheduler = this._createScheduler()
    this._readable = true
    this.listen()
  }

  listen () {
    this.encoder.subscribe(
      (buf, size) => this.receive(buf, size),
      (message) => this.dispose(STATUS.ERROR, { message }),
      () => {this.state = State.ReadEnd}
    )
  }

  receive (buf, size) {
    const base64 = this.base64_parser.encode(buf)
    this.scheduler.entry({ base64, size })

    if (this.scheduler.overflowed()) {
      this.encoder.pause()
    }

    return this
  }

  _createIdentify () {
    const { changed, deleted, titles, titleTypes } = this.opt
    let changed_total = Object.keys(changed).length
    let deleted_total = deleted.length

    const dateColumns = []
    const DateConst = DIMENSION_TYPES_INVERT[4]

    titles.forEach((t, i) => {
      const type = (titleTypes[i] || {}).type
      if (type === DateConst) {
        dateColumns.push(i)
      }
    })

    const hasDateColumns = dateColumns.length > 0
    const columns = titles.length

    const identify_changed_rows = (fields, no) => {
      // line 为Uint8Array
      // 过滤删除的行和改变的行
      if (changed_total || deleted_total) {
        let in_deleted = deleted.includes(no)
        let in_changed = changed[no]

        if (in_deleted) {
          deleted_total--
          return null
        } else if (in_changed) {
          changed_total--
          return in_changed.fields.map(f => UTF8Parser.stringToUTF8Uint8(f))
        } else {
          return fields
        }
      }
      return fields
    }

    const millisecond = /^\d+$/

    return (fields, no) => {
      const identify_fields = identify_changed_rows(fields, no)
      if (!identify_fields) return null

      // 解析失败后需要用户手动点击按钮上传
      if (columns !== identify_fields.length) {
        this.pause()
        this.dispose(STATUS.ERROR, {
          type: PARSE_ERROR_MAP.FIELD_LENGTH_NOT_EQUAL,
          no,
          titles,
          fields: identify_fields.map(field => {
            return String.fromCharCode.apply(String, this.utf8_parser.parse(field).character)
          })
        })
        return null
      }

      let field, tmp, time, str

      if (hasDateColumns) {
        dateColumns.forEach(index => {
          field = identify_fields[index]
          if (field) {
            str = String.fromCodePoint.apply(String, this.utf8_parser.parse(field).character)
            tmp = moment(millisecond.test(str) ? parseInt(str, 10) : str)
            time = tmp.isValid() ? tmp.valueOf().toString() : ''
            if (!time) {
              console.warn('time format error:[%s] => [%s]', no, str)
            }
            identify_fields[index] = UTF8Parser.stringToUTF8Uint8(time)
          }
        })
      }

      return identify_fields
    }

  }

  _createScheduler () {
    const { file } = this.opt
    const file_size = file.size
    const scheduler = new Scheduler(5)

    let uploaded_size = 0
    let upload_error_count = 0
    let next_progress = 0

    scheduler.subscribe(async (record) => {
      const { base64, size } = record
      const success = await this._post(base64)

      if (success) {
        uploaded_size += size
        next_progress = parseFloat((uploaded_size / file_size * 100).toFixed(2))
        // 更新UI进度条
        this.dispose(STATUS.PROGRESS, { progress: next_progress })

        // 如果没有读完, `scheduler` 中又没有缓存了,继续读取
        if (this._readable && this.state !== State.ReadEnd && scheduler.drain())
          this.encoder.resume()

        // 更新完成后释放该记录
        scheduler.release(record)

        // 读完了并且任务完成,表示上传完成
        if (this.state === State.ReadEnd && scheduler.accomplish()) {
          this.dispose(STATUS.PROGRESS, { progress: 100 })
        }
      }
      // 上传失败,重新上传
      else {
        upload_error_count++
        this.pause()
        if (upload_error_count && upload_error_count > 1) {
          upload_error_count = null
          return this.dispose(STATUS.NETWORK_ERROR)
        }
        scheduler.reEntry(record)
      }
    })

    return scheduler
  }

  async _post (body) {
    const { url } = this.opt
    return await Fetch.post(url, null, {
      headers: { 'Accept': 'application/json' },
      credentials: 'omit', // 忽略cookie的发送
      timeout: 50000,
      body,
      handleResponse: res => res.status === 200
    })
  }

  subscribe (fn) {
    this.subscriber = fn
  }

  start () {
    this.encoder.start()
    return this
  }

  pause () {
    // this._readable 由用户行为控制
    // 在 scheduler 中需要判断该属性才能决定是否可以自动 resume
    this._readable = false
    this.encoder.pause()
    return this
  }

  resume () {
    this._readable = true
    this.encoder.resume()
    return this
  }

  dispose (type, payload = {}) {
    this.subscriber({ type, payload })
  }
}

export { CSVPostman, STATUS, PARSE_ERROR_MAP }
