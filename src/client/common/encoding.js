// https://github.com/Datafruit/doc/blob/master/%E6%95%B0%E6%8D%AE%E6%8E%A5%E5%85%A5/%E6%95%B0%E6%8D%AE%E6%8E%A5%E5%85%A5%E6%96%B9%E6%A1%88.md

import _ from 'lodash'
import { UTF8Parser, Base64Parser, dynamic_uint8_array } from 'next-reader'
import { DIMENSION_TYPES_MINI_MAP } from '../../common/constants'
const DIMENSION_TYPES_MINI_MAP_INVERT = _.invert(DIMENSION_TYPES_MINI_MAP)

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
  float: 0x66        // 'f'
}

/**
 * @typedef {Object} EncodeTitle
 * @property {string} name
 * @property {'int'|'string'|'long'|'date'|'float'} type
 */

/**
 * @class
 * @example
 * const parser = new Parser()
 * parser.setTitle([{name: 'a', type: 'int'}, {name: 'b', type: 'string'}])
 * // encode
 * parser.encode([{a:1,b:2},{a:3,b:4}]) // base64
 * // decode
 * parser.decode('ia,sb122334455667788991010111112121313141415151616171718181919202021')
 * // => {title: [], data: []}
 */

export class Parser {
  /**
   * @param [field_separator]
   * @param [separator]
   * @param [line_feed]
   * @param [dimension_separator]
   */
  constructor (field_separator, separator, line_feed, dimension_separator) {
    this.FIELD_SEPARATOR = field_separator || FIELD_SEPARATOR
    this.SEPARATOR = separator || SEPARATOR
    this.LINE_FEED = line_feed || LF
    this.DIMENSION_SEPARATOR = dimension_separator || DIMENSION_SEPARATOR
    // TODO 正则 /\u0002/, /\u0001/ 等
    // 只是数字不太好拼装正则,需要判断长度,麻烦
    this.SPLIT_SEP = {
      FIELD_SEPARATOR: String.fromCharCode(this.FIELD_SEPARATOR),
      SEPARATOR: String.fromCharCode(this.SEPARATOR),
      LINE_FEED: String.fromCharCode(this.LINE_FEED),
      DIMENSION_SEPARATOR: String.fromCharCode(this.DIMENSION_SEPARATOR)
    }
    this.base64Parser = new Base64Parser(this.SEPARATOR)
    this.titles = null
    this.titlesStringList = []
  }

  /**
   * @param {Array<EncodeTitle>} array
   * @return {Parser}
   */
  setTitle (array) {
    const length = array.length - 1
    const FIELD_SEPARATOR = this.FIELD_SEPARATOR
    const list = this.titlesStringList
    let buffer = dynamic_uint8_array()
    let name

    array.forEach((record, i) => {
      name = record.name
      list.push(name)

      buffer.push(
        [TYPE_MAPS[record.type]],
        [FIELD_SEPARATOR],
        UTF8Parser.stringToUTF8Uint8(name)
      )

      if (i < length) {
        buffer.push([DIMENSION_SEPARATOR])
      }
    })

    this.titles = buffer.get()

    return this
  }

  /**
   * @param {Array<Object>} array
   * @return {Uint8Array}
   */
  parse (array) {
    const titles = this.titles

    if (titles === null || titles.length === 0) {
      throw new Error('must have titles before encoding')
    }

    const LF = this.LINE_FEED
    const buffer = dynamic_uint8_array()
    const SEPARATOR = this.SEPARATOR
    const names = this.titlesStringList
    const names_length = names.length
    const length = array.length
    const end = names_length - 1

    let point = 0, obj, cur, line_array, i, name

    buffer.push(titles)

    while (point < length) {
      obj = array[point]

      if (point < length) {
        buffer.push([LF])
      }

      i = 0
      while (i < names_length) {
        name = names[i]
        cur = obj[name]
        cur = cur === void 0 ? '' : ('' + cur)
        line_array = UTF8Parser.stringToUTF8Uint8(cur)
        buffer.push(line_array)
        if (i < end) {
          buffer.push([SEPARATOR])
        }
        i++
      }

      point++
    }

    return buffer.get()
  }

  /**
   * @param {Array<Object>} array
   * @return {string}
   */
  encode (array) {
    return this.base64Parser.encode(this.parse(array))
  }

  /**
   * @param string
   * @return {{title: Array<Object>, data: Array<Object>}}
   */
  decode (string) {
    const result = {}
    const title = result.title = []
    const data = result.data = []
    string = '' + string

    if (string.length === 0) {
      return result
    }

    const { FIELD_SEPARATOR, LINE_FEED, DIMENSION_SEPARATOR } = this.SPLIT_SEP

    // parse title
    const lines = string.split(LINE_FEED)
    const first = lines[0]
    const array = first.split(DIMENSION_SEPARATOR)

    let temp_array
    array.forEach(field => {
      temp_array = field.split(FIELD_SEPARATOR) || []
      title.push({
        name: temp_array[1],
        type: DIMENSION_TYPES_MINI_MAP_INVERT[temp_array[0]]
      })
    })

    // parse data
    const list = lines.splice(1)
    let obj
    list.forEach(line => {
      obj = {}
      temp_array = line.split(FIELD_SEPARATOR)
      temp_array.forEach((value, index) => {
        obj[title[index].name] = value
      })
      data.push(obj)
    })

    return result
  }
}