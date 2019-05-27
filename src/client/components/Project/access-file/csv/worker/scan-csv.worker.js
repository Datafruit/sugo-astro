/**
 * @Author sugo.io<asd>
 * @Date 17-11-20
 * @desc 扫描一个csv文件的内容,确定文件的粒度
 * 1. 设每个段最优的存量为500MB
 * 2. 确定csv文件的时间范围
 *   2.1: 若用户指定了时间列,则扫描文件的每一行的时间列,确定时间范围
 *   2.2: 若用户没有指定时间列,则时间范围为服务端接入时间为准,前端假设为1h(即1h内接入完成)
 * 3. 根据文件大小与时间范围,确定段粒度
 */

/**
 * 使用web worker多个线程同时计算提升扫描速度
 */

import Injector from 'worker-thread/lib/Injector'
import Emitter from 'worker-thread/lib/Emitter'
import moment from 'moment'
import { ReadCsvAsUint8, UTF8Parser } from 'next-reader'

/**
 * 扫描csv文件中的时间列
 * @constructor
 */
class ScanTimeColumn extends Emitter {
  /**
   * ScanTimeColumn运行在多个worker中
   * 所有worker共享一个File对象
   * 每个worker负责处理file中的一个分段
   *
   * @param {File} file
   * @param {number} index   - 时间列索引
   * @param {number} fields  - 总共多少列
   * @param {number} name
   * @param {object} options - reader 配置
   */
  constructor (file, index, fields, name, options) {
    super()
    this.$file = file
    this.$index = index
    this.$options = options
    this.$fields = fields
    this.$name = name

    this.$utf8 = null
    this.$reader = null
    this.$maxTime = null
    this.$minTime = null
    this.$total = null
    this.$ready = 0
  }

  initialize () {

    this.$total = this.$file.size
    const { separator, quotation } = this.$options
    this.$utf8 = new UTF8Parser()
    this.$reader = new ReadCsvAsUint8(this.$file, { separator, quotation })
    this.$reader.subscribe(
      ({ lines, size }) => this._parse(lines, size),
      (message, already, read_size) => this._error(message, already, read_size),
      () => this._completed()
    )
    return this
  }

  /**
   *
   * @param {Array<{no:number,fields:Array<Uint8Array>}>} lines
   * @param {number} size
   * @private
   */
  _parse (lines, size) {

    let min = this.$minTime
    let max = this.$maxTime
    const utf8 = this.$utf8
    const index = this.$index
    const fields = this.$fields
    const S = String
    const fromCodePoint = S.fromCodePoint
    const length = lines.length
    const step = 6
    const millisecond = /^\d+$/

    let i = 0, line, timeStr, format

    for (; i < length; i = i + step) {
      line = lines[i]

      if (line.fields.length !== fields) continue

      timeStr = fromCodePoint.apply(S, utf8.parse(line.fields[index]).character)
      format = moment(millisecond.test(timeStr) ? parseInt(timeStr, 10) : timeStr)

      if (!format.isValid()) continue

      const value = format.valueOf()

      if (min === null) {
        min = value
      }

      if (max === null) {
        max = value
      }

      if (value < min) {
        min = value
      }

      if (value > max) {
        max = value
      }
    }

    this.$maxTime = max
    this.$minTime = min
    this.$ready = this.$ready + size
    this.emit('process', this.$ready / this.$total * 100)
  }

  _error (message) {
    this.emit('error', message)
  }

  _completed () {
    this.emit('finish', { minTime: this.$minTime, maxTime: this.$maxTime })
  }

  read () {
    this.$reader.read()
  }
}

const injector = new Injector(self)

injector.on('csv', function (arg) {
  const { file, options, fields, timeDimensionIndex, name } = arg
  console.log('%s -> %dMB', name, file.size / 1024 / 1024)

  if (typeof timeDimensionIndex !== 'number' || timeDimensionIndex < 0) {
    injector.send('error', '时间列必为正整数')
    return injector.terminate()
  }

  const scan = new ScanTimeColumn(file, timeDimensionIndex, fields, name, options)
  scan.initialize()

  scan.on('process', function (process) {
    injector.post('process', process)
  })

  scan.on('error', function (message) {
    injector.post('error', message)
  })

  scan.on('finish', function (data) {
    injector.post('finish', data)
  })

  scan.read()
})
