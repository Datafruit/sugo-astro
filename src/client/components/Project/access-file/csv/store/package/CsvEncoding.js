/**
 * Created on 21/02/2017.
 */

import {
  ReadLineAsUint8,
  ReadCsvAsUint8,
  UTF8Parser,
  CSVParser,
  CsvCompleteLine,
  BaseObservable,
  dynamic_uint8_array
} from 'next-reader'

import { SEPARATOR as CSV_SEPARATOR, QUOTATION as CSV_QUOTATION } from 'next-reader/dist/parser/csv'

const LINES_MARK = ReadLineAsUint8.Type.lines

/**
 * @typedef {Object} Column
 * @property {Number} index
 * @property {string} type
 */

  // 字段分隔符 |
const FIELD_SEPARATOR = 0x7c
// 维度分隔符 ,
const DIMENSION_SEPARATOR = 0x2c
// 换行符标识
const LF = 0x02
// 数据分隔符
const SEPARATOR = 0x01
const TYPE_MAPS = {
  int: 0x69,         // 'i'
  string: 0x73,      // 's'
  long: 0x6c,        // 'l'
  date: 0x64,        // 'd'
  float: 0x66,       // 'f'
  double: 0x66,      // 'f'
  bigdecimal: 0x66   // 'f'
}
/**
 * @typedef {Object} CsvEncodingOptions
 * @property {File} file
 * @property {Array<Column>} columns
 * @property {Function} [identify_rows]
 * @property {Boolean} [containsColumnsName]
 * @property {string} [separator] - 分隔符
 * @property {string} [quotation] - 引用标识符
 */

const DefOpt = {
  file: null,
  columns: [],
  identify_rows: (v) => v,
  containsColumnsName: true,
  separator: CSV_SEPARATOR.Comma,
  quotation: CSV_QUOTATION.DoubleQuotation
}

/**
 * 将Csv文件转换为维度上报需要的数据格式
 * 不再经过其他encoding
 */
class CsvEncoding extends BaseObservable {
  constructor (options) {
    super()

    /** @type {CsvEncodingOptions} */
    options = Object.assign({}, DefOpt, options)

    let { separator, quotation } = options
    separator = CSV_SEPARATOR[separator]
    quotation = CSV_QUOTATION[quotation]

    this.opt = options
    this.checker = new CsvCompleteLine(separator, quotation)
    this.csv_parser = new CSVParser(separator, quotation)
    this.utf8_parser = new UTF8Parser()
    this.reader = new ReadCsvAsUint8(options.file, { separator, quotation })
    this.titles = null
    this.listen()
  }

  listen () {
    this.reader.subscribe(
      record => {
        const { lines, size } = record
        this.onLines(lines, size)
      },
      (message, already, read_size) => {
        this.subscribeOnError(message, already, read_size)
      },
      () => {
        this.subscribeOnComplete.apply(this, Array.prototype.slice.call(arguments))
      }
    )
  }

  /**
   * 接收到行时，将行编码，传给 subscriber
   * @param lines
   * @param size
   */
  onLines (lines, size) {
    const encode = this.encoding(lines)
    this.subscribeOnNext(encode, size)
    return this
  }

  encoding (lines) {
    const titles = this.titles || (this.titles = lines[0].no === 1 ? this.getTitle(lines[0]) : null)

    if (titles === null) throw new Error('parse title error')

    const buffer = dynamic_uint8_array()
    const length = lines.length
    const { identify_rows, columns } = this.opt
    const map = this._arrayToMap(columns)
    const columnsEnd = map.size - 1
    let point = 0, temp, fields, i, field

    buffer.push(titles)

    // rows
    while (point < length) {
      temp = lines[point]
      fields = identify_rows(temp.fields, temp.no)

      if (fields === null) {
        point++
        continue
      }

      if (point < length) buffer.push([LF])

      // columns
      i = 0
      map.forEach((type) => {
        field = fields[type.index]
        if (fields) buffer.push(field)
        if (i < columnsEnd) buffer.push([SEPARATOR])
        i++
      })

      point++
    }

    return buffer.get()
  }

  getTitle (line) {
    const { fields } = line
    if (fields.length === 0) return null

    const buffer = dynamic_uint8_array()
    const columns = this.opt.columns
    const end = columns.length - 1
    const map = this._arrayToMap(columns)
    let col, total = 0

    fields.forEach((field, index) => {
      col = map.get(index)
      if (col === void 0) return this
      buffer.push(
        [TYPE_MAPS[col.type]],
        [FIELD_SEPARATOR],
        UTF8Parser.stringToUTF8Uint8(col.name)
      )
      if (total < end) buffer.push([DIMENSION_SEPARATOR])
      total++
    })

    return buffer.get()
  }

  _arrayToMap (array) {
    const map = new Map()
    array.forEach((v, i) => map.set(i, v))
    return map
  }

  start () {
    this.reader.read()
    return this
  }

  pause () {
    this.reader.pause()
    return this
  }

  resume () {
    this.reader.resume()
    return this
  }
}

export { CsvEncoding }
