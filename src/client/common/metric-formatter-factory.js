import * as d3 from 'd3'
import moment from 'moment'
import _ from 'lodash'

let commaFormatter = d3.format(',')
let decimalFormatter = d3.format(',.2f')
let int02Formatter = _.flow(val => parseInt(val), d3.format('02,d'))

export const ISOTimeFormatStr = 'YYYY-MM-DDTHH:mm:ss.sss[Z]'
export const isISODateStr = str => {
  return moment(str, ISOTimeFormatStr, true).isValid()
}

function _metricValueFormatterFactory(format) {
  if (!format || format === 'none') {
    // 默认格式化规则，整数使用逗号，小数取两位
    return val => {
      return isISODateStr(val)
        ? moment(val).format('YYYY-MM-DD HH:mm:ss')
        : Number.isInteger(val) ? commaFormatter(val) : decimalFormatter(val)
    }
  }
  if (format === 'duration') {
    return val => {
      let d = moment.duration(val, 'seconds')
      let mmss = moment(0).add(d).utc().format('mm:ss')
      return `${int02Formatter(d.asHours())}:${mmss}`
    }
  }
  if (format === 'duration-complete') {
    return val => {
      let d = moment.duration(val, 'seconds')
      let hhmmss = moment(0).add(d).utc().format('HH 小时 mm 分 ss 秒')
      if (1 <= d.asYears()) {
        return `${d.years()} 年 ${d.months()} 月 ${d.days()} 天 ${hhmmss}`
      }
      if (1 <= d.asMonths()) {
        return `${d.months()} 月${d.days()} 天 ${hhmmss}`
      }
      if (1 <= d.asDays()) {
        return `${d.days()} 天 ${hhmmss}`
      }
      return hhmmss
    }
  }
  return d3.format(format)
}

const metricValueFormatterFactory = format => val => {
  if (val === '--' || _.isEmpty(val) && !_.isNumber(val)) {
    return '--'
  }
  let numFormatter = _metricValueFormatterFactory(format)
  return numFormatter(val)
}

export default metricValueFormatterFactory

export const axisFormatterFactory = format => {
  if (!format || format === 'none') {
    return metricValueFormatterFactory()
  }
  return d3.format(format)
}
