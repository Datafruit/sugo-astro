/**
 * @Author sugo.io<asd>
 * @Date 17-11-20
 */

import Scan from './scan-csv.worker'
import Manager from 'worker-thread/lib/Manager'
import Emitter from 'worker-thread/lib/Emitter'

class Scanner extends Emitter {
  /**
   * @param {File} file
   * @param {number} index
   * @param {number} fields
   * @param {object} options
   * @param {number} concurrency
   */
  constructor (file, index, fields, options, concurrency = 1) {
    super()
    this.$file = file
    this.$index = index
    this.$fields = fields
    this.$options = options
    this.$concurrency = Math.max(concurrency, 2)  // 至少两个worker处理
    this.$workers = []
    this.$$proccess = []
    this.$results = []
  }

  /**
   * 创建多个Worker,分配每个Worker负责的片段
   * @return {Scanner}
   */
  initialize () {

    // 取file中的某几段来扫描
    const segments = this.segments()
    segments.forEach(file => {
      this.$workers.push({
        file,
        worker: new Manager(new Scan())
      })
    })

    this.$workers.forEach((cache, i) => {
      this.$$proccess[i] = 0

      cache.worker.on('process', process => {
        this.$$proccess[i] = process
        this.emit('process', this.$$proccess.reduce((p, c) => p + c, 0) / this.$concurrency)
      })

      cache.worker.on('finish', data => {
        this.$results.push({
          name: cache.worker.getName(),
          data
        })

        if (this.$results.length === this.$workers.length) {
          this.emit('finish', this.combine())
          this.$workers.forEach(cache => cache.worker.terminate())
        }
      })

      cache.worker.on('error', message => {
        this.emit('error', `${cache.worker.$name}: [${message}]`)
        cache.worker.terminate()
      })

      cache.worker.post('csv', {
        file: cache.file,
        name: cache.worker.getName(),
        fields: this.$fields,
        timeDimensionIndex: this.$index,
        options: this.$options
      })
    })

    return this
  }

  /**
   * 取file中的某几个片段来解析,根据线程数来确定
   * 将文件分为线程的奇数倍片,比如3,5,7
   * 每个线程取其中的一片,保证首尾片被取出
   * @return {Array<File>}
   */
  segments () {
    const file = this.$file
    const concurrency = this.$concurrency
    const fileSize = file.size

    // 分片,保持每个线程跑30MB左右的数据,大约3秒完成
    // 也就是要每片30MB
    const size = 10 * 1024 * 1024                                         // 每片大小

    // 按每片size大小分割整个文件
    let point = 0
    const seg = []

    while (point < fileSize) {
      seg.push(file.slice(point, (point = point + size)))
    }

    // 给每个worker分配解析文件
    // 因为concurrency一定>=2的,所以如果分片小于3段,则直接返回
    const len = seg.length
    if (len < 3) {
      return seg
    }

    const last = seg[seg.length - 1]
    // 如果最后一片太小,将最后一片与倒数第二片合并
    if (last.size < size / 2) {
      const lastSecond = seg[seg.length - 2]
      seg[seg.length - 2] = file.slice(fileSize - last.size - lastSecond.size)
      seg.splice(-1)
    }

    // 首尾两段优先分配给worker
    const segments = [seg[0], seg[seg.length - 1]]
    // 剩下的分配给其他worker
    const remains = seg.slice(1, seg.length - 1)
    const remainLen = remains.length
    const remainConcurrency = concurrency - segments.length
    const step = ~~(remainLen / (remainConcurrency + 1)) || 1

    for (let i = 0; i < remainConcurrency; i = i + step) {
      if (i < remainLen) {
        segments.push(remains[i])
      }
    }

    return segments
  }

  combine () {
    return {
      minTime: Scanner.getMin(this.$results.map(r => r.data.minTime)),
      maxTime: Scanner.getMax(this.$results.map(r => r.data.maxTime))
    }
  }

  static getMin (arr) {
    const length = arr.length

    if (length === 0) {
      return Number.MIN_SAFE_INTEGER
    }

    let result = arr[0]
    let i = 1
    for (; i < length; i++) {
      if (arr[i] < result) {
        result = arr[i]
      }
    }
    return result
  }

  static getMax (arr) {
    const length = arr.length

    if (length === 0) {
      return Number.MAX_SAFE_INTEGER
    }

    let result = arr[0]
    let i = 1
    for (; i < length; i++) {
      if (arr[i] > result) {
        result = arr[i]
      }
    }
    return result
  }
}

/**
 * @param {File} file
 * @param {number} index
 * @param {number} fields
 * @param {object} options
 * @param {number} concurrency
 * @return {Scanner}
 */
export default function (file, index, fields, options, concurrency) {
  return new Scanner(file, index, fields, options, concurrency)
}
