import moment from 'moment'
import _ from 'lodash'

moment.locale('zh-cn')

export const dateFormatterGenerator = targetFormat => dateVal => {
  if (!dateVal) {
    return dateVal
  }
  let m = moment(dateVal)
  if (m.isValid()) {
    return m.format(targetFormat)
  }
  return dateVal
}

export const granularityToFormat = (granularity = 'P1D') => {
  if (/P\d+Y/ig.test(granularity)) {
    return 'YYYY年'
  } else if (/P\d+M/ig.test(granularity)) {
    return 'YYYY年MM月'
  } else if (/(P\d+W|P\d+D)/ig.test(granularity)) {
    return 'YYYY年MM月DD日 ddd'
  } else if (/PT\d+H/ig.test(granularity)) {
    return 'YYYY年MM月DD日 ddd HH时'
  } else if (/PT\d+M/ig.test(granularity)) {
    return 'YYYY年MM月DD日 ddd HH:mm'
  }
  return 'YYYY/MM/DD ddd HH:mm:ss'
}

export const granularityToShorterFormat = (granularity = 'P1D') => {
  if (/P\d+Y/ig.test(granularity)) {
    return 'YYYY'
  } else if (/P\d+M/ig.test(granularity)) {
    return 'MMMM'
  } else if (/(P\d+W|P\d+D)/ig.test(granularity)) {
    return 'MM/DD ddd'
  } else if (/PT\d+H/ig.test(granularity)) {
    return 'YYYY/MM/DD HH时'
  } else if (/PT\d+M/ig.test(granularity)) {
    return 'YYYY/MM/DD HH:mm'
  }
  return 'YYYY/MM/DD HH:mm:ss'
}

const leanFormatStrConfig = {
  '^P\\d+Y$': {
    defaultFormat: 'YYYY'
  },
  '^P\\d+M$': {
    startOf: {
      year: 'YYYY年MM月'
    },
    defaultFormat: 'MM月'
  },
  '^P\\d+W$': {
    startOf: {
      year: 'YYYY-MM-DD'
    },
    defaultFormat: 'MM-DD ddd'
  },
  '^P\\d+D$': {
    startOf: {
      year: 'YYYY-MM-DD'
    },
    defaultFormat: 'MM-DD'
  },
  '^PT\\d+H$': {
    startOf: {
      year: 'YYYY-MM-DD HH时',
      day: 'MM-DD HH时'
    },
    defaultFormat: 'HH时'
  },
  '^PT\\d+M$': {
    startOf: {
      year: 'YYYY-MM-DD HH:mm',
      day: 'MM-DD HH:mm'
    },
    defaultFormat: 'HH:mm'
  },
  '^PT\\d+S$': {
    startOf: {
      year: 'YYYY-MM-DD HH:mm:ss',
      hour: 'MM-DD HH:mm:ss'
    },
    defaultFormat: 'HH:mm:ss'
  }
}

export const leanDateFormatterGenerator = (granularity = 'P1D', showComplete = false) => {
  if (showComplete === true) {
    let pattern = granularityToFormat(granularity)
    return dateFormatterGenerator(pattern)
  }
  let key = _.findKey(leanFormatStrConfig, (_, key) => new RegExp(key).test(granularity || 'P1D'))
  let {defaultFormat, startOf} = leanFormatStrConfig[key]
  return dateVal => {
    if (!dateVal) {
      return dateVal
    }
    let m = moment(dateVal)
    if (m.isValid()) {
      let sameAsMomentUnit = _.findKey(startOf, (_, unit) => m.isSame(m.clone().startOf(unit)))
      let targetFormat = sameAsMomentUnit && startOf[sameAsMomentUnit] || defaultFormat
      return m.format(targetFormat)
    }
    return dateVal
  }
}
