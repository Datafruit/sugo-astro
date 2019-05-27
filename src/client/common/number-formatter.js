import _ from 'lodash'
import * as d3 from 'd3'

const d3f = d3.format('.3s')

export default function (value) {
  if (_.isNumber(value)) {
    // 如果在 －999～999 以内并且精度低于 0.01 则无需格式化
    return -999 < value && value < 999 && (value * 100 % 1 === 0) ? value : d3f(value)
  }
  return value
}
