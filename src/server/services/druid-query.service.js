import db from '../models'
import _ from 'lodash'
import { $, Expression, ply, r, SplitExpression, LiteralExpression, ContainsExpression, TimeRange } from 'sugo-plywood'
import * as plyqlExecutor from '../utils/plyql-executor'
import { err } from '../utils/log'
import druidContext, { requesterWithToArray, uindexRequesterWithToArray } from '../utils/druid-middleware'
import moment from 'moment-timezone/moment-timezone'
import * as chronoshift from 'chronoshift'
import DruidColumnType, {
  DruidColumnTypeInverted, isTimeDimension, isFloatDimension, isStringDimension,
  isNumberDimension, isDesensitizDimension
} from '../../common/druid-column-type'
import cache from './cache'
import CryptoJS from 'crypto-js'
import {
  isRelative, convertDateType as convertDateType0, queryDuridFormat
} from '../../common/param-transform'
import * as d3 from 'd3'
import {mapAwaitAll, immutateUpdate, escape, dictBy} from '../../common/sugo-utils'
import parseFormat from 'moment-parseformat'
import {translateFormula} from '../utils/relative-time-tranform'
import {dbMetricAdapter} from '../../common/temp-metric'
import config from '../config'
import {DimensionParamsTypes} from '../../common/dimension-params-type'
import extractNumberRange from '../../common/number-range'
import assert from 'assert'
import FetchKit from '../utils/fetch-kit'
import {
  QUERY_ENGINE,
  NumberSplitType, DataSourceType, EMPTY_VALUE_OR_NULL
} from '../../common/constants'
import shortid from 'shortid'
import {
  doDesensitizForGroupByQuery,
  doDesensitizForSelectQuery, doExtractSensitiveValueGroup,
  formatUseOriginalPattern, getQueryEngineByProject, progressGroupFilter, recurFindFilter,
  transformBuiltinUserGroups
} from '../../common/druid-query-utils'
import {getExpressionComputeContext} from '../utils/plywood-facade'
import {getProjectsByDataSourceIds} from './sugo-project.service'
import SugoChildProjectsService from './sugo-child-projects.service'
import {convertSubTagToGroup } from '../../common/subTagGroup'

moment.tz.add('Asia/Shanghai|CST CDT|-80 -90|01010101010101010|-1c1I0 LX0 16p0 1jz0 1Myp0 Rb0 1o10 11z0 1o10 11z0 1qN0 11z0 1o10 11z0 1o10 11z0|23e6')

const {relativeTimeType = 'tool'} = config.site || {}
const convertDateType = (_dateType, format = queryDuridFormat()) => convertDateType0(_dateType, format, relativeTimeType)
const { scanQuery : scanQueryFromConfig = false } = config.druid
const TIME_ATTRIBUTE = '__time'

const defaultTimeZone = 'Asia/Shanghai'
const NULL_TIME = moment.tz('1970-01-01 00:00:00.000', defaultTimeZone)
const EnableDesensitiz = true

const dateUnitMap = {
  m: 'minute',
  h: 'hour',
  D: 'day',
  W: 'isoWeek',
  M: 'month',
  Y: 'year'
}

//检测number类型
function isNumberType(type) {
  return DruidColumnTypeInverted[type] === 'number'
}

// 递归读取 filter 的 col
function recurGetFiltersCol(filters) {
  return _.flatMap(filters, flt => {
    let {op} = flt
    if (op === 'or' || op === 'and' || op === 'not') {
      let eq = _.isArray(flt.eq) ? flt.eq : [flt.eq]
      return recurGetFiltersCol(eq.filter(_.identity).map(flt0 => ({...flt, ...flt0})))
    }
    return [flt.col].filter(_.identity)
  })
}

let recurExtractTime = (data0, dbDimNameDict) => {
  if (_.isEmpty(data0)) {
    return data0
  }
  return data0.map(d => {
    if (!_.isObject(d)) {
      return d
    }
    return _.mapValues(d, (val, key) => {
      if (_.isArray(val)) {
        return recurExtractTime(val, dbDimNameDict)
      }
      if (_.isDate(val) && val.valueOf()) { // 新版plywood返回的是date类型
        return val.toISOString()
      }
      if (_.isObject(val) && val.type === 'TIME') { // 旧版plywood 的__time返回是对象
        return val.value
      }
      let dbDim = dbDimNameDict[key]
      if (dbDim && isTimeDimension(dbDim)) {
        let timeStr = val && (val.start || val.value) || val
        try {
          return !timeStr || NULL_TIME.isSame(timeStr) ? null : timeStr
        } catch (error) {
          return timeStr
        }
      }
      return val
    })
  })
}

let recurExtractStringArray = (data) => {
  if (_.isEmpty(data)) {
    return data
  }
  return data.map(d => {
    if (!_.isObject(d)) {
      return d
    }
    return _.mapValues(d, (val) => {
      if (_.isArray(val)) {
        return recurExtractStringArray(val)
      }
      return _.isObject(val) && 'elements' in val ? val.elements : val
    })
  })
}

let recurSuppress = (data0, valsNeedSuppress) => {
  return data0.map(d => {
    let d0 = _.omit(d, valsNeedSuppress)
    return _.mapValues(d0, (val) => _.isArray(val) ? recurSuppress(val, valsNeedSuppress) : val)
  })
}

let recurGetLiteralValue = (data0, valsNeedGetLiteralValue) => {
  return data0.map(d => {
    return _.mapValues(d, (val, key) => {
      if (_.isArray(val)) {
        return recurGetLiteralValue(val, valsNeedGetLiteralValue)
      }
      if (_.isObject(val) && val.op === 'literal' && _.includes(valsNeedGetLiteralValue, key)) {
        return val.value
      }
      return val
    })
  })
}

let genNotExp = flt => {
  let {eq} = flt
  let negFilters = eq.map(subFlt => chainFilters([subFlt]).not())
  return negFilters.reduce((exp, curr) => exp.and(curr))
}

let genOrExp = flt => {
  let {eq, ...rest} = flt
  let orFilters = eq.map(subOpEq => ({...rest, ...subOpEq}))
  return chainFilters(orFilters, (exp, curr) => exp.or(curr))
}

let genAndExp = flt => {
  let {eq, ...rest} = flt
  let orFilters = eq.map(subOpEq => ({...rest, ...subOpEq}))
  return chainFilters(orFilters)
}

let genInRangesExp = flt => {
  let {col, eq, type, containsNull, granularity} = flt
  if (type === 'number') {
    return genOrExp({col,
      op: 'or',
      type,
      containsNull,
      eq: eq.map(subEq => {
        if (!_.isString(subEq)) {
          return ({op: 'equal', eq: [subEq]})
        }
        return ({
          op: 'in',
          eq: extractNumberRange(subEq)
        })
      })
    })
  } else if (type === 'date') {
    return genOrExp({col, op: 'or', type, containsNull, eq: eq.map(val => {
      return {
        op: 'in',
        eq: !val || val === EMPTY_VALUE_OR_NULL
          ? [NULL_TIME.toISOString(), NULL_TIME.toISOString()]
          : [val, formatUseOriginalPattern(moment(val).add(moment.duration(granularity || 'P1D')))],
        containsNull: !val || val === EMPTY_VALUE_OR_NULL
      }
    })})
  } else if (type === 'datestring') {
    return genOrExp({
      col,
      op: 'or',
      type,
      containsNull,
      dateStringComparingFormat: parseFormat(containsNull ? eq[1] : eq[0]),
      eq: eq.map(val => {
        return {
          op: 'in',
          eq: [val, formatUseOriginalPattern(moment(val).add(moment.duration(granularity || 'P1D')))]
        }
      })})
  } else {
    throw new Error(`Unknown range type: ${type}`)
  }
}

let genComparingExp = flt => {
  let {col, op, eq, type} = flt
  let colExp = $(col)
  if (_.isArray(eq)) {
    eq = eq[0]
  }
  if (col === TIME_ATTRIBUTE || type === 'date') {
    eq = moment(eq).toDate()
  } else {
    eq = +eq
  }
  switch (op) {
    case 'greaterThan':
      return colExp.greaterThan(eq)
    case 'lessThan':
      return colExp.lessThan(eq)
    case 'greaterThanOrEqual':
      return colExp.greaterThanOrEqual(eq)
    case 'lessThanOrEqual':
      return colExp.lessThanOrEqual(eq)
  }
}

let genInExp = (flt) => {
  let {col, eq, type, containsNull, formula} = flt
  let colExp = $(col)
  if (formula) {
    colExp = Expression.parse(formula)
  }
  if (col === TIME_ATTRIBUTE || type === 'date') {
    if (containsNull) { // 时间类型复合维度null值处理
      return colExp.is(r(null))
    }
    let {timezone = defaultTimeZone} = flt
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime, 'iso')

    // 限制不能查超过当前时刻的数据
    let mNow = moment()
    if (relativeTimeType === 'business' && moment(since || 0).isBefore(mNow)) {
      if (!until || moment(until).isAfter(mNow)) {
        until = mNow.toISOString()
      }
    }
    return colExp.overlap(new TimeRange({
      start: since && moment.tz(since, timezone).toDate() || null,
      end: until && moment.tz(until, timezone).toDate() || null,
      // 默认边界为 [), 但是相对时间昨天的 until 为 .999, 所以需要默认为 []
      bounds: flt.bounds || (relativeTime === 'custom' ? '[)' : '[]')
    }))
  }

  if (type === 'number') {
    let {bounds = '[)'} = flt
    let lowerBoundType = _.get(bounds, '[0]') || '['
    let upperBoundType = _.get(bounds, '[1]') || ')'
    let lowerBoundCompMethod = lowerBoundType === '[' ? 'greaterThanOrEqual' : 'greaterThan'
    let upperBoundCompMethod = upperBoundType === ')' ? 'lessThan' : 'lessThanOrEqual'

    if (containsNull) { // 数值复合维度null值处理
      return colExp.is(r(null))
    }
    let [from, to] = eq
    // 如果最大值 等于 最小值，就转换为"等于"
    if (_.isNumber(from) && from === to) {
      return from === 0
        ? colExp.is(r(null)).or(colExp.is(r(0)))
        : colExp.is(r(from))
    }

    let result
    if (_.isNumber(from) || (_.isString(from) && !_.isNaN(from * 1))) {
      result = colExp[lowerBoundCompMethod](from * 1)
    }
    if (_.isNumber(to) || (_.isString(to) && !_.isNaN(to * 1))) {
      result = result
        ? result.and(colExp[upperBoundCompMethod](to * 1))
        : colExp[upperBoundCompMethod](to * 1)
    }
    return result
  }

  if (type === 'datestring') {
    if (containsNull) { // 数值复合维度null值处理
      return colExp.is(r(null))
    }
    let {dateStringComparingFormat} = flt
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime, 'iso')

    if (dateStringComparingFormat) {
      let formattedSince = moment(since).format(dateStringComparingFormat)
      let formattedUntil = moment(until).format(dateStringComparingFormat)
      // console.log('Format before compare: ', since, until, '->', formattedSince, formattedUntil)
      return colExp.greaterThanOrEqual(r(formattedSince)).and(colExp.lessThanOrEqual(r(formattedUntil)))
    }

    return colExp.greaterThanOrEqual(r(since)).and(colExp.lessThanOrEqual(r(until)))
  }

  // string or stringArray
  let arr = _.isString(eq) ? eq.split(/,/) : eq
  // in string
  //NULL空值 的处理
  if (containsNull) {
    // arr = ['空字符串 / NULL', ...]
    arr = _.drop(arr, 1) //删除第一个值（只做判断用）
  }
  
  // 多值列的 in 总是改成使用 is
  let inOp = type === 'stringArray' ? 'is' : 'in'
  
  if (containsNull && !_.isEmpty(arr)) {
    return colExp[inOp](arr).or(colExp.is(r(null)).or(colExp.is(r(''))))
  } else if (containsNull) {
    return colExp.is(r(null)).or(colExp.is(r('')))
  } else {
    return colExp[inOp](arr)
  }
}


/** lookupIn expression:
 {
   "type": "lookup",
   "dimension": "UserID",
   "lookup": "usergroup_7"
 }
 */
let genLookupInExp = flt => {
  let ex = $(flt.col).lookupIn(`usergroup_${flt.eq}`)
  // debug(ex, 'lookupIn ex===')
  return ex
}

const genLookupMapExp = flt => {
  const { allGroups, othersGroupName } = flt
  let exp = $(flt.baseDimName)
  // 分组维度过来添加未分组过滤
  exp = exp.lookupMap(allGroups, flt.eq, othersGroupName)
  if (flt.op === 'not in') {
    exp = exp.not()
  }
  return exp
}

const genLookupJdbcExp = flt => {
  const { col, op } = flt
  let exp = $(flt.baseDimName)
  let isNegative = _.startsWith(op, 'not ')
  let finalOp = isNegative ? op.substr(4) : op
  exp = exp.lookupJdbc(col, flt.missVal)
  switch (finalOp) {
    case 'startsWith':
      exp = exp.match(`^${_.get(flt.eq, '[0]')}.*`)
      break
    case 'endsWith':
      exp = exp.match(`.*${_.get(flt.eq, '[0]')}$`)
      break
    case 'matchRegex':
      exp = exp.match(`${_.get(flt.eq, '[0]')}`)
      break
    case 'in':
      exp = exp.in(flt.eq)
      break
    case 'nullOrEmpty':
      exp = exp.is(r(null)).or(exp.is(r('')))
      break
    case 'equal':
      exp = isNegative ?
        exp.isnt(r(_.get(flt.eq, '[0]')))
        : exp.is(r(_.get(flt.eq, '[0]')))
      break
    case 'contains':
      exp = exp.contains(r(_.get(flt.eq, '[0]')))
      break
  }
  if (isNegative && finalOp !== 'equal') {
    exp = exp.not()
  }
  return exp
}

let filterToExp = flt => {
  let {col, eq, op, formula, type} = flt
  let colExp = col ? $(col) : null // 某些 op 允许不填 col，例如 or, and
  // TODO 这里当type是string类型的时候可以通过，number类型还未测试
  if (formula) {
    colExp = Expression.parse(formula)
  }
  let isNegative = _.startsWith(op, 'not ')
  let finalOp = isNegative ? op.substr(4) : op
  // realOp 目前是自定义的分组过滤(customGroup, lookupMap)
  finalOp = flt.realOp ? flt.realOp : finalOp

  let val = _.isArray(eq) ? eq[0] : eq
  if (val === undefined) {
    val = null
  }
  let resultExp
  switch (finalOp) {
    case 'not':
      return genNotExp(flt)
    case 'or':
      resultExp = genOrExp(flt)
      break
    case 'and':
      resultExp = genAndExp(flt)
      break
    case 'in':
      resultExp = genInExp(flt)
      break
    case 'in-ranges':
      resultExp = genInRangesExp(flt)
      break
    case 'contains':
      resultExp = colExp.contains(r(val), flt.ignoreCase ? ContainsExpression.IGNORE_CASE : ContainsExpression.NORMAL)
      break
    case 'endsWith':
      // 用luceneFilter替换正则 modify by WuQic 2017-06-23
      resultExp = colExp.luceneFilter(`*${escape(val)}`)
      break
    case 'startsWith':
      // 用luceneFilter替换正则 modify by WuQic 2017-06-23
      resultExp = colExp.luceneFilter(`${escape(val)}*`)
      break
    case 'matchRegex':
      resultExp = colExp.match(val)
      break
    case 'equal': {
      if (type === 'number') {
        val = +val
      }
      // 多值列的 is 总是改成使用 precise
      if (type === 'stringArray') {
        return isNegative ? colExp.precise(r(eq)).not() : colExp.precise(r(eq))
      } else {
        return isNegative ? colExp.is(r(val)).not() : colExp.is(r(val))
      }
    }
    case 'nullOrEmpty':
      if (type === 'number' || type === 'date') {
        resultExp = colExp.is(r(null))
      } else {
        resultExp = colExp.is(r(null)).or(colExp.is(r('')))
      }
      break
    case 'lookupin':// 自助分析=>用户分群
      resultExp = genLookupInExp(flt)
      break
    case 'lookupMap':
      return genLookupMapExp(flt)
    case 'lookupJdbc':
      return genLookupJdbcExp(flt)
    case 'greaterThan':
    case 'greaterThanOrEqual':
    case 'lessThanOrEqual':
    case 'lessThan':
      resultExp = genComparingExp(flt)
      break
    default:
      throw `Can not identify flt_op: ${op}`
  }
  return isNegative ? resultExp.not() : resultExp
}

let chainFilters = (filters, reducer = (exp, curr) => exp.and(curr)) => {
  // { state: [ { col: state, op: 'not in', eq: 'other' }, ...], ...}
  let chained = filters.map(filterToExp).reduce(reducer)
  // console.log('合并后的filters:', JSON.stringify(chained, null, 2))
  return chained
}

function recurSetFiltersType(filters, dbDimNameDict) {
  return filters.map(flt => {
    let {op} = flt
    if (op === 'or' || op === 'and' || op === 'not') {
      let eq = _.isArray(flt.eq) ? flt.eq : _.compact([flt.eq])
      return {...flt, eq: recurSetFiltersType(eq.map(flt0 => ({...flt, ...flt0})), dbDimNameDict)}
    }

    // TODO 移除副作用，重用 recurMapFilters
    // 单个 filter 的 type 设置
    if (!(flt.col in dbDimNameDict)) {
      return flt
    }
    const dbDim = dbDimNameDict[flt.col]
    let type = DruidColumnTypeInverted[dbDim.type]
    const originType = _.get(dbDim, 'params.dimension.type')
    const businessType = _.get(dbDim, 'params.type')
    if (originType) { // 除了string类型的复合维度，其他（时间,数值）用原维度类型覆盖复合维度类型
      type = DruidColumnTypeInverted[originType]
      flt = progressGroupFilter(dbDim, flt) // 自定义分组维度和其他维度一起当过滤时, 组装filter，已将前端逻辑移到此处
    }
    if (businessType === 'business') {
      flt.realOp = 'lookupJdbc'
      flt.col = dbDim.id
      flt.missVal =  _.get(dbDim, 'params.table_field_miss_value', 'unknow')
      flt.baseDimName =  _.get(dbDim, 'params.dimension')
    }
    return type ? { ...flt, type } : flt
  })
}

let readFilterConfigForPlywood = (filters = [], expression, dataSource, dbDimNameDict) => {
  filters = filters.filter(flt => !_.isEmpty(flt.eq) || _.isNumber(flt.eq))

  if (filters.length === 0) {
    return expression
  }

  let filtersWithType = recurSetFiltersType(filters, dbDimNameDict)

  let timeRangeFlt = recurFindFilter(filtersWithType, flt => {
    let dbDim = flt.col && dbDimNameDict[flt.col]
    return dbDim && isTimeDimension(dbDim)
  })
  let filtersWithoutBuiltinUserGroups = transformBuiltinUserGroups(filtersWithType, timeRangeFlt, dataSource)

  return expression.filter(chainFilters(filtersWithoutBuiltinUserGroups))
}

export function transformToOldQueryFormat({druid_datasource_id: dataSourceId, datasource_name: datasourceName, params}) {
  let customMetricProperties = ['name', 'formula']
  let {
    filters = [], metrics = [], dimensions = [], dimensionExtraSettingDict = {}, customMetrics, tempMetricDict, vizType,
    ...rest
  } = params

  let granularity = dimensionExtraSettingDict[TIME_ATTRIBUTE] && dimensionExtraSettingDict[TIME_ATTRIBUTE].granularity || 'P1D'

  // {name: '', fomular: ''}
  let finalCustomMetrics = (customMetrics || []).concat(dbMetricAdapter(tempMetricDict).map(obj => _.pick(obj, customMetricProperties)))

  let body = {
    druid_datasource_id: dataSourceId,
    datasource_name: datasourceName,
    dimensions,
    metrics: metrics.filter(m => !_.startsWith(m, '_tempMetric_')),
    granularity: _.startsWith(granularity, 'P') ? granularity : 'P1D',
    filters: filters.map(flt => _.omit(flt, 'isLegendFilter')),
    dimensionExtraSettings: dimensions.map(dim => dimensionExtraSettingDict[dim]),
    customMetrics: finalCustomMetrics,
    splitType: vizType === 'table_flat' ? 'groupBy' : 'tree',
    ...rest
  }
  return _.pickBy(body, (val) => {
    if (val === undefined || val === null) {
      return false
    }
    if (_.isObject(val) && !Object.keys(val).length) {
      return false
    }
    if (_.isArray(val) && !val.length) {
      return false
    }
    return true
  })
}

export default {

  /**
   * @param {DruidQueryParams} queryParams
   * @param extra
   * @returns {Promise.<*>}
   */
  async queryByExpression (queryParams, extra = undefined) {
    let {ctx} = extra || {}
    
    let markProgress = ctx ? ctx.markProgress.bind(ctx) : _.noop
    let raceWithAbort = ctx ? ctx.raceWithAbort.bind(ctx) : _.identity
    let isAborted = ctx ? ctx.isAborted.bind(ctx) : _.noop

    let {
      select = [],
      dimensions = [],
      dimensionExtraSettings = [],
      splitType,
      druidQueryId = `${shortid.generate()}_${new Date().toISOString()}`,
      druid_datasource_id
      // queryEngine =  QUERY_ENGINE.TINDEX // 查询引擎。默认是TINDEX
    } = queryParams

    try {
      let {
        ex,
        druidProps,
        dbDimNameDict
      } = await this.createExpression(queryParams, extra)

      markProgress('Druid query')
      if (isAborted()) {
        debug('abort before compute expression')
        throw new Error('Druid query have been aborted by user')
      }
      let computed = await raceWithAbort(plyqlExecutor.executePlywood(ex, druidProps.context, druidProps.timezone), async (resolve, reject) => {
        // 用户取消 druid 请求时，如果正在查询 druid，则发送取消查询的请求
        reject(new Error('Druid query have been aborted by user')) // 报错，避免缓存
        try {
          const engineKey = queryParams.queryEngine === QUERY_ENGINE.UINDEX ? 'uindex' : 'druid'
          let beforeKillProm = FetchKit.get(`http://${config[engineKey].host}/druid/v2/queue`)
          let killAt = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
          let url = `http://${config[engineKey].host}/druid/v2/${druidQueryId}`
          debug('calling kill query api: ', url)
          let killDruidQueryRes = await FetchKit.delete(url, undefined, {handleResponse: res => res.text()})
          debug('Before kill: ', await beforeKillProm)
          debug(`kill druid query(${druidQueryId}) success: `, killDruidQueryRes || '(Empty result)', ', kill at: ', killAt)
          let afterKill = await FetchKit.get(`http://${config[engineKey].host}/druid/v2/queue`)
          debug('After kill: ', afterKill)
        } catch (e) {
          debug('kill druid query err: ', e)
        }
      })

      // let query = await ex.toDruidQuery(druidProps.context, { timezone: druidProps.timezone })
      // debug(query, 'ffff')
      let data = computed.toJS()
      
      // 多值列 select 的值转数组
      if (!_.isEmpty(select)) {
        data = recurExtractStringArray(data)
      }

      // 查询后的脱敏操作，对于 select，用脱敏后的字段覆盖敏感字段；对于 groupBy，先查一次脱敏后数据，再覆盖
      const isQueryingReplacement = _.some(dimensions, dim => _.endsWith(dim, '__encode'))
      if (EnableDesensitiz && !isQueryingReplacement
        && _(dbDimNameDict).values().some(dbDim => isDesensitizDimension(dbDim))) {
        let desensitizDimDict = _(dbDimNameDict).pickBy(v => isDesensitizDimension(v)).value()
        if (!_.isEmpty(select)) {
          data = doDesensitizForSelectQuery(data, desensitizDimDict)
        } else {
          // groupBy 查询，先提取全部敏感值
          let sensitiveValueGroup = doExtractSensitiveValueGroup(data, desensitizDimDict)
          // 查询替代数据
          const sensitiveDims = _.keys(sensitiveValueGroup)
          let replacementDicts = await mapAwaitAll(sensitiveDims, async sDim => {
            const replacementCol = `${sDim}__encode`
            let res = await this.queryByExpression({
              druid_datasource_id,
              // 空值会当成 0，要先排除掉数值维度的空值，否次会查出 0~N 其实可能是 x~N
              filters: [{col: sDim, op: 'in', eq: sensitiveValueGroup[sDim]}],
              dimensions: [sDim, replacementCol],
              dimensionExtraSettings: [{ limit: _.size(sensitiveValueGroup[sDim]) }],
              metrics: [],
              withGlobalMetrics: false,
              splitType: 'groupBy',
              customMetrics: [
                {name: 'fakeCount', formula: '1'}
              ]
            })
            const arr = (_.get(res, [0, 'resultSet']) || [])
            return dictBy(arr, d => d[sDim], d => d[replacementCol])
          })
          // 替换查询结果
          data = doDesensitizForGroupByQuery(data, _.zipObject(sensitiveDims, replacementDicts))
        }
      }
      // 移除不需要的指标的值
      if (_.some(queryParams.customMetrics, m => m.suppress)) {
        data = recurSuppress(data, queryParams.customMetrics.filter(m => m.suppress).map(m => m.name))
      }
      // 如果 data 中有 LiteralExpression，则取出最终的值
      if (_.some(_.values(_.get(computed, 'data[0]')), val => val instanceof LiteralExpression)) {
        let dat = computed.data[0]
        data = recurGetLiteralValue(data, _.keys(dat).filter(key => dat[key] instanceof LiteralExpression))
      }

      // __time: {start: "2016-10-26T16:00:00.000Z", end: "2016-10-27T16:00:00.000Z", type: "TIME_RANGE"}
      // => __time: "2016-10-26T16:00:00.000Z"
      data = recurExtractTime(data, dbDimNameDict)

      //数值类型分组druid返回的排序有问题，需做封装
      data = this.convertData(data, dbDimNameDict, dimensionExtraSettings, dimensions, splitType || 'tree')
      return data
    } catch (e) {
      console.log('druid query error: ', e)
      if (/could not resolve \$.+/.test(e.message)) {
        err('未上报此维度数据: ', e.message)
      } else if (/Grouping resources exhausted.+/.test(e.message)){
        throw new Error('该GroupBy查询失败，所需资源不足，请联系管理员增加或调整配置')
      } else {
        if (e.query) { // 打印出错误的druid原生query 方便调试
          console.error('exception query => ', JSON.stringify(e.query, null, 2))
        }
        console.error('查询Druid错误 => ', e.stack)
      }
      if (ctx) {
        ctx.set('X-Druid-Query-Error', e.message ? encodeURIComponent(e.message) : e)
        // 标记为不缓存
        ctx.set('Cache-Control', 'private,max-stale=0,max-age=0')
      }
      return []
    }
  },

  async genNumberGroupSplit(dbDim, dimExSetting, requestBody) {
    let {name: currDimName} = dbDim
    let {granularity, sortCol, sortDirect} = dimExSetting

    let minFormula = `$main.min($\{${currDimName}\})`
    let maxFormula = `$main.max($\{${currDimName}\})`
    let interval = granularity || 10
    let min = 0, max = 0
    //执行max,min查询
    try {
      let data = await this.queryByExpression({
        ...requestBody,
        // 空值会当成 0，要先排除掉数值维度的空值，否次会查出 0~N 其实可能是 x~N
        filters: [...(requestBody.filters || []), {col: currDimName, op: 'not nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]}],
        dimensions: [],
        dimensionExtraSettings: [],
        metrics: [],
        withGlobalMetrics: true,
        customMetrics: [
          {name: 'min', formula: minFormula},
          {name: 'max', formula: maxFormula}
        ]
      })

      //"1000-01-01T00:00:00.000Z" "3000-01-01T00:00:00.000Z" 当没数据存在时后端会传入这种值，需做过滤
      min = _.get(data, '[0].min', 0)
      max = _.get(data, '[0].max', min + 10)
    } catch (e) {
      console.log(`获取${currDimName}的最大最小值失败:`)
      console.error(e)
    }

    min = _.isNumber(min) ? Math.floor(min) : min
    max = _.isNumber(max) ? Math.ceil(max) : min
    // 后端有限制，数值分段不能超过1000，界面分段为: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, ..., 10000, 20000, 50000]
    if (1000 <= (max - min) / interval) {
      // 如果此数值维度按其自身排序，则可以直接修改 min/max；例如按照自身升序，则范围可调整为 [min, interval * 1000)
      if (sortCol === currDimName) {
        if (sortDirect === 'asc') {
          max = min + interval * 1000
        } else {
          min = max - interval * 1000
        }
      } else {
        // 自动调整为最接近用户输入的粒度，但是不超过限制
        const gap = max - min, costFn = v => 1000 - gap / v
        interval = _(_.range(-1, Math.ceil(Math.log10(gap))))
          .chain()
          .map(v => Math.pow(10, v))
          .flatMap(v => [v, v * 2, v * 5])
          .map(v => ({v, cost: costFn(v)}))
          .filter(o => 0 < o.cost)
          .minBy(o => o.cost)
          .get('v')
          .value()
      }
    }
    return $(currDimName).numericGroup({
      minValue: min === null ? 0 : min,
      maxValue: max === null ? 10 : max,
      intervalValue: interval,
      outOfBound: true
    })
  },

  async genSplits(dbDim, dimExSetting, requestBody) {
    let {name: currDimName, id: currDimId} = dbDim
    let {granularity, timezone, numberSplitType} = dimExSetting
    let paramType = _.get(dbDim, 'params.type')

    // 自定义维度
    if (_.some(requestBody.customDimensions, ({name, isSubTag}) => name === dbDim.name && !isSubTag)) {
      return $(currDimName)
    }
    if (currDimName === requestBody.mainTimeDimName || isTimeDimension(dbDim)) {
      let timezoneObj = chronoshift.Timezone.fromJS(timezone || defaultTimeZone)
      return $(currDimName).timeBucket(granularity || 'P1D', timezoneObj.toString())
    } else if (paramType === DimensionParamsTypes.cast) {
      return Expression.parse(translateFormula(dbDim.params.formula))
    } else if (paramType === DimensionParamsTypes.calc) {
      if (isStringDimension(dbDim) || requestBody.dataSourceType === DataSourceType.MySQL) {
        return $(currDimName)
        // return Expression.parse(translateFormula(dbDim.params.formula))
      }
      return await this.genNumberGroupSplit(dbDim, dimExSetting, requestBody)
    } else if (paramType === DimensionParamsTypes.group) {
      // 自定义分组
      const { dimension: { name: baseDimName }, groupFilters, othersGroupName } = dbDim.params
      const groupDimension = dbDim.params.dimension
      const isTimeDim = isTimeDimension(groupDimension)
      // const isNumberDim = isNumberDimension(groupDimension)
      const isStringDim = groupDimension.type === DruidColumnType.String || groupDimension.type === DruidColumnType.StringArray
      const mapValue = {}
      const groups = groupFilters.map((filter) => {
        // 字符串类型的分组
        if (isStringDim) {
          const rule = filter.rule // 这里type也只支持in 和 eq，其他不支持
          const groupName = filter.groupName
          // const relation = filter.relation // 并且|或者 druid限制目前只取第一个rule
          const allInValues = rule.map(row => row.value).reduce((acc, val) => _.concat(acc, val), [])
          const groupMap = _.reduce(_.uniq(allInValues), (map, value) => {
            map[value] = groupName
            return map
          }, {})
          _.assign(mapValue, groupMap)
        }
        // 时间类型的分组
        else if (isTimeDim) {
          const rule = filter.rule
          if (_.size(rule) === 2) {
            return {
              name: filter.groupName,
              lower: rule.lower,
              upper: rule.upper
            }
          }
        }
        // 非时间类的分组
        else if (!isTimeDim) {
          const rule = filter.rule[0] // druid限制，现在每组只能有一个rule并且只有最大最小
          if (rule) {
            const {value} = rule
            if (value.length !== 2) {
              throw new Error('暂时只支持数值范围类型的分组')
            }
            return {
              name: filter.groupName,
              lower: value[0],
              upper: value[1]
            }
          }
        }
      })
      if (isStringDim) {
        // 自定义分组维度groupBy设置未匹配名称
        return $(baseDimName).lookupMap(mapValue, null, othersGroupName)
      } else {
        return $(baseDimName).customGroup({
          groups,
          outOfBound: true
        })
      }
    } else if(paramType === DimensionParamsTypes.business) {
      let missVal = _.get(dbDim, 'params.table_field_miss_value', 'unknow')
      return $(dbDim.params.dimension).lookupJdbc(currDimId, missVal)
    } else if (dbDim.type === DruidColumnType.String || dbDim.type === DruidColumnType.StringArray || (isNumberDimension(dbDim) && numberSplitType === NumberSplitType.value)) {
      return $(currDimName)
    } else if (dbDim.type === DruidColumnType.DateString) {
      let finalGranularity = granularity || 'P1D'
      switch (finalGranularity) {
        case 'P1Y':
          return $(currDimName).extract('^(\\d{4})\\D\\d{1,2}\\D\\d{1,2}')
        case 'P1M':
          return $(currDimName).extract('^(\\d{4}\\D\\d{1,2})\\D\\d{1,2}')
        case 'P1D':
          return $(currDimName).extract('^(\\d{4}\\D\\d{1,2}\\D\\d{1,2})')
        case 'PT1H':
          // .concat(r(':00')) 是为了让前端能识别时间格式
          return $(currDimName).extract('^(\\d{4}\\D\\d{1,2}\\D\\d{1,2}\\D\\d{1,2}):\\d{2}').concat(r(':00'))
        case 'PT1M':
          return $(currDimName).extract('^(\\d{4}\\D\\d{1,2}\\D\\d{1,2}\\D\\d{1,2}:\\d{2})')
        case 'P1W':
          throw new Error('文本时间列不支持按周分组')
        default:
          throw new Error('文本时间列只支持 1 个单位的分组')
      }
    } else if (isNumberDimension(dbDim)) {
      return requestBody.dataSourceType === DataSourceType.MySQL
        ? $(currDimName)
        : await this.genNumberGroupSplit(dbDim, dimExSetting, requestBody)
    } else {
      // 未知类型
      return $(currDimName)
    }
  },

  treeSplitterGen(requestBody, dbDimNameDict, dbMetricNameDict, havingFilters) {
    let {
      metrics = [],
      customMetrics = [],
      dimensions = [],
      granularity,
      timezone,
      dimensionExtraSettings = [],
      groupByAlgorithm = 'groupBy', // or topN
      mainTimeDimName
    } = requestBody

    let isTopN = groupByAlgorithm === 'topN'

    let sliceOrderedMeasures = metrics.map(m => dbMetricNameDict[m]).concat(customMetrics)

    let applyMetricsAndSorting = (exp, dimName) => {
      // 某维度的排序
      let dimExSetting = dimensionExtraSettings[_.findIndex(dimensions, d => d === dimName)]

      // 每个维度的都加上指标
      sliceOrderedMeasures.forEach(m => {
        // 应用指标统计
        exp = exp.apply(m.name, Expression.parse(translateFormula(m.formula)))
        // 应用 havingFilters
        let havingFiltersOfCurrMetric = _.filter(havingFilters, hFlt => hFlt.col === m.name)
        if (!_.isEmpty(havingFiltersOfCurrMetric)) {
          exp = exp.filter(chainFilters(havingFiltersOfCurrMetric))
        }
      })

      let sortCol = dimExSetting && dimExSetting.sortCol || _.get(sliceOrderedMeasures, '[0].name')
      let sortDirect = dimExSetting && dimExSetting.sortDirect

      let sortCols = _.isArray(sortCol) ? sortCol : [sortCol].filter(_.identity)
      sortCols.forEach((sortCol0) => {
        if (sortCol0 && sortCol0 !== dimName && !_.includes(sliceOrderedMeasures.map(m => m.name), sortCol0)) {
          // 选择了不查询数据的指标进行了排序
          let m = dbMetricNameDict[sortCol0]
          if (!m) {
            let dbDim = dbDimNameDict[dimName]
            throw new Error(`指标已被删除，无法作为维度「${dbDim && dbDim.title || dimName}」的排序列: ${sortCol0}`)
          }
          exp = exp.apply(m.name, Expression.parse(m.formula))
        }
      })

      if (!_.isEmpty(sortCols)) {
        let sortDirects = _.isArray(sortDirect) ? sortDirect : [sortDirect].filter(_.identity)
        exp = exp.sort($(sortCols[0]), sortDirects[0] === 'asc' ? 'ascending' : 'descending',
          sortCols.map((col, idx) => ({dimension: col, direction: sortDirects[idx] === 'asc' ? 'ascending' : 'descending'})))
      }

      let dimLimit = dimExSetting && dimExSetting.limit || 10
      return exp.limit(dimLimit * 1)
    }

    // 递归逐层设置表达式（以维度分层）
    let recurSplit = async (rootExpression, currentDims) => {
      if (currentDims.length === 0) {
        return rootExpression
      }

      let currDimName = currentDims[0]
      let dbDim = dbDimNameDict[currDimName] || {name: currDimName}
      let dimExSetting = dimensionExtraSettings[_.findIndex(dimensions, d => d === currDimName)] || {}

      if (currDimName === mainTimeDimName) {
        dimExSetting = { granularity, ...dimExSetting, timezone: timezone || defaultTimeZone}
      }

      // 需要测试字符串和数值的计算维度
      let splits = await this.genSplits(dbDim, dimExSetting, requestBody)

      // let ex = Expression.fromJSLoose(splits)
      // console.log('splits: ', JSON.stringify(splits, null, 2))

      let splitedExp = rootExpression.split(splits, currDimName, 'main', isTopN)

      let finalExp = applyMetricsAndSorting(splitedExp, currDimName)

      if (1 < currentDims.length) {
        let tempRecurSplit = await recurSplit($('main'), _.drop(currentDims, 1))
        return finalExp.apply(`${currentDims[1]}_GROUP`, tempRecurSplit)
      }
      return finalExp
    }
    return recurSplit
  },

  groupBySplitterGen(requestBody, dbDimNameDict, dbMetricNameDict, havingFilters) {
    let {
      metrics = [],
      customMetrics = [],
      dimensions = [],
      granularity,
      timezone,
      dimensionExtraSettings = [],
      groupByAlgorithm = 'groupBy', // or topN
      mainTimeDimName
    } = requestBody

    let isTopN = groupByAlgorithm === 'topN'
    let sliceOrderedMeasures = metrics.map(m => dbMetricNameDict[m]).concat(customMetrics)

    let applyMetricsAndSorting = (exp, dimName) => {
      // 某维度的排序
      let dimExSetting = dimensionExtraSettings[_.findIndex(dimensions, d => d === dimName)]

      // 每个维度的都加上指标
      sliceOrderedMeasures.forEach(m => {
        // 应用指标统计
        exp = exp.apply(m.name, Expression.parse(translateFormula(m.formula)))
        // 应用 havingFilters
        let havingFiltersOfCurrMetric = _.filter(havingFilters, hFlt => hFlt.col === m.name)
        if (!_.isEmpty(havingFiltersOfCurrMetric)) {
          exp = exp.filter(chainFilters(havingFiltersOfCurrMetric))
        }
      })

      let sortCol = dimExSetting && dimExSetting.sortCol || _.get(sliceOrderedMeasures, '[0].name')
      let sortDirect = dimExSetting && dimExSetting.sortDirect
  
      let sortCols = _.isArray(sortCol) ? sortCol : [sortCol].filter(_.identity)
      sortCols.forEach(sortCol0 => {
        if (sortCol0 && !_.includes(dimensions, sortCol0) && !_.includes(sliceOrderedMeasures.map(m => m.name), sortCol0)) {
          // 选择了不查询数据的指标进行了排序
          let m = dbMetricNameDict[sortCol0]
          if (!m) {
            let dbDim = dbDimNameDict[dimName]
            throw new Error(`指标已被删除，无法作为维度「${dbDim && dbDim.title || dimName}」的排序列: ${sortCol0}`)
          }
          exp = exp.apply(m.name, Expression.parse(m.formula))
        }
      })
  
      if (!_.isEmpty(sortCols)) {
        let sortDirects = _.isArray(sortDirect) ? sortDirect : [sortDirect].filter(_.identity)
        exp = exp.sort($(sortCols[0]), sortDirects[0] === 'asc' ? 'ascending' : 'descending',
          sortCols.map((col, idx) => ({dimension: col, direction: sortDirects[idx] === 'asc' ? 'ascending' : 'descending'})))
      }

      let dimLimit = dimExSetting && dimExSetting.limit || 10
      return exp.limit(dimLimit * 1)
    }

    return async (rootExpression, currentDims) => {
      if (currentDims.length === 0) {
        return rootExpression
      }

      let splits = await mapAwaitAll(dimensions, async (currDimName, idx) => {
        let dbDim = dbDimNameDict[currDimName] || {name: currDimName}
        let dimExSetting = dimensionExtraSettings[idx] || {}

        if (currDimName === mainTimeDimName) {
          dimExSetting = { granularity, ...dimExSetting, timezone: timezone || defaultTimeZone}
        }

        // 需要测试字符串和数值的计算维度
        return await this.genSplits(dbDim, dimExSetting, requestBody)
      })
      let splitsObj = _.zipObject(dimensions, splits)
      let splitedExp = new SplitExpression({ operand: rootExpression, splits: splitsObj, dataName: 'main', isTopN: isTopN })

      // group by 的排序和 limit 取第一个维度的额外设置
      let finalExp = applyMetricsAndSorting(splitedExp, dimensions[0])

      return finalExp
    }
  },

  async expressionGenerator(requestBody, dataSource, dbDimNameDict, dbMetricNameDict) {
    const mainTimeDimName = requestBody.queryEngine === QUERY_ENGINE.MYSQL
      ? _.get(dataSource.params, 'dbConnectionInfo.db_time_dim_name') // 有可能无时间列，不需要默认值
      : requestBody.queryEngine === QUERY_ENGINE.UINDEX
        ? null
        : '__time'

    // 需要传给 number groupBy，mySQL 不需要使用 numberGroup
    requestBody = {...requestBody, dataSourceType: dataSource.type, mainTimeDimName}
    let {
      datasource_name,
      since,
      until,
      dimensions = [],
      timezone,
      metrics = [],
      filters = [],
      customMetrics = [],
      dimensionExtraSettings = [],
      select = [],
      selectOffset = 0,
      selectLimit = 100,
      selectOrderBy = mainTimeDimName,
      selectOrderDirection = 'desc',
      splitType = 'tree', // or groupBy
      groupByAlgorithm = 'groupBy', // or topN
      withGlobalMetrics = groupByAlgorithm !== 'topN',
      scanQuery = scanQueryFromConfig,
      customDimensions
    } = requestBody

    assert(splitType === 'tree' || splitType === 'groupBy', 'splitType should be "tree" or "groupBy"')
    assert(groupByAlgorithm === 'topN' || groupByAlgorithm === 'groupBy', 'groupByAlgorithm should be "topN" or "groupBy"')

    timezone = timezone || defaultTimeZone

    // console.log('Query body:', JSON.stringify(requestBody))

    let filterExp = $(datasource_name)

    // 创建计算维度（仅仅是 filters 和 dimension 的）
    _.values(dbDimNameDict)
      .filter(dbDim => {
        let type = _.get(dbDim, 'params.type')
        return type === DimensionParamsTypes.calc || type === DimensionParamsTypes.cast
      })
      .forEach(calcDbDim => {
        // const dimParamsExpression = Expression.parse(dbDim.params.formula)
        // const refDimNames = dimParamsExpression.getFreeReferences()
        // 如果是多维，这里提取公式里的所有基本维度来作为sum计算因子;目前sugo-plywood暂时只支持一个维度
        // const sumString= refDimNames.map(name => `$${name}`).reduce((acc, val) => `${acc}+${val}`)
        debug('创建计算维度', calcDbDim.name, calcDbDim.params.formula)
        let exp = Expression.parse(translateFormula(calcDbDim.params.formula))
        // if (isNumberDimension(calcDbDim)) {
        //   exp = exp.cast('NUMBER')
        // }
        filterExp = filterExp.apply(calcDbDim.name, exp)
      })

    // 创建临时自定义维度
    if (_.isArray(customDimensions)) {
      customDimensions.forEach(customDim => {
        let {name, formula} = customDim
        debug(`创建临时自定义维度: ${name} : ${formula}`)
        if(formula) {
          let exp = Expression.parse(translateFormula(formula))
          filterExp = filterExp.apply(name, exp)
        }
      })
    }

    if (/:59$/.test(until)) {
      until = moment(until).toISOString().replace('.000', '.999')
    } else if (/:59\.000/.test(until)) {
      until = until.replace('.000', '.999')
    }
    
    // relativeTimeType 为 business 时，druid 查询时间范围最大始终为当前时间
    if ((since || until || relativeTimeType === 'business') && mainTimeDimName) {
      // 限制不能查超过当前时刻的数据
      let mNow = moment()
      if (relativeTimeType === 'business' && moment(since || 0).isBefore(mNow)) {
        if (!until || moment(until).isAfter(mNow)) {
          until = mNow.toISOString()
        }
      }
      filterExp = filterExp.filter($(mainTimeDimName).overlap(new TimeRange({
        start: since && moment.tz(since, timezone).toDate() || null,
        end: until && moment.tz(until, timezone).toDate() || null,
        // 默认边界为 [), 但是相对时间昨天的 until 为 .999, 所以需要默认为 []
        // 这里不支持相对时间, 所以默认为 [)
        bounds: '[)'
      })))
    }

    // 应用全局 lucene filter
    let globalLuceneFilter = _.find(filters, flt => flt.col === '*' && flt.op === 'luceneFilter')
    if (globalLuceneFilter) {
      let filterContent = _.isArray(globalLuceneFilter.eq) ? globalLuceneFilter.eq[0] : globalLuceneFilter.eq
      filterExp = filterExp.filter($(mainTimeDimName).luceneFilter(filterContent, 'true'))
    }

    let [havingFilters, dimFilters] = _.partition(filters, flt => _.includes(metrics, flt.col) || _.some(customMetrics, m => m.name === flt.col))

    filterExp = readFilterConfigForPlywood(dimFilters.filter(flt => flt !== globalLuceneFilter), filterExp, dataSource, dbDimNameDict)

    let sliceOrderedMeasures = metrics.map(m => dbMetricNameDict[m]).concat(customMetrics)

    if (!_.every(sliceOrderedMeasures)) {
      let errorSources = metrics.filter(m => !dbMetricNameDict[m])
      throw new Error('选择了数据库中不存在的指标: ' + errorSources.join(', '))
    }

    // select 暂时不支持 metric, dimension
    if (select && select.length) {
      if (!_.isEqual(select, ['*'])) {
        // 自动加入 orderBy 的列
        if (selectOrderBy && !_.includes(select, selectOrderBy)) {
          select = [...select, selectOrderBy]
        }
        // filterExp = filterExp.select(...select)

        filterExp = scanQuery ? filterExp.scan(...select) : filterExp.select(...select)
      }
      if (selectOrderBy) {
        const sortDir = selectOrderDirection === 'asc' ? 'ascending' : 'descending'
        filterExp = filterExp.sort($(selectOrderBy), sortDir)
      }
      return 0 < selectOffset
        ? filterExp.limit(selectOffset, selectLimit)
        : filterExp.limit(selectLimit)
    }

    let query = ply()
    let e2 = query.apply('main', filterExp)

    // 每个维度的都加上指标
    if (withGlobalMetrics) {
      sliceOrderedMeasures.forEach(m => {
        e2 = e2.apply(m.name, Expression.parse(translateFormula(m.formula)))
      })
    }

    const splitHandler = splitType === 'tree'
      ? this.treeSplitterGen(requestBody, dbDimNameDict, dbMetricNameDict, havingFilters)
      : this.groupBySplitterGen(requestBody, dbDimNameDict, dbMetricNameDict, havingFilters)

    let e3 = await splitHandler($('main'), dimensions)

    return e2.apply('resultSet', e3)
  },

  /**
   * 根据sql api查询druid数据
   */
  async queryBySQL(query, queryEngine = QUERY_ENGINE.TINDEX, childProjectId = null) {
    if (!_.startsWith(query, 'DESCRIBE')) {
      if (query.toLocaleLowerCase().indexOf('limit') === -1 && /select/ig.test(query)) {
        query += ' limit 999' // 没有分页默认补999 避免查询数据过大问题
      } else if (/select|limit/ig.test(query)) { // 如果存在分页也限定最大页数
        let limit = query.replace(/.+limit\s+/g, '')
        if (parseInt(limit) > 1000) {
          query = query.replace(/limit.+$/, '') + ' limit 999'
        }
        //ctx.throw(400, '查询记录数过大')
      }
    }

    let sqlParse = Expression.parseSQL(query)
    
    // 加入子项目的过滤条件
    if (childProjectId) {
      let childProjectQueryRes = await SugoChildProjectsService.getInstance().findById(childProjectId)
      let datasourcesFilters = (_.get(childProjectQueryRes, 'result.params.filters') || [])
        .filter(flt => !_.isEmpty(flt.eq) || _.isNumber(flt.eq))
      sqlParse = immutateUpdate(sqlParse, 'expression', exp => {
        function recurModExp(ex, moder) {
          if (!(ex instanceof Expression)) {
            return ex
          }
          let {operand, expression} = ex || {}
          if (operand instanceof Expression) {
            ex = immutateUpdate(ex, 'operand', operand => moder(recurModExp(operand, moder)))
          }
          if (expression instanceof Expression) {
            ex = immutateUpdate(ex, 'expression', exp => moder(recurModExp(exp, moder)))
          }
          return ex
        }
        return recurModExp(exp, ex => {
          let {op, name} = ex
          if (op === 'ref' && name === sqlParse.table) {
            return ex.filter(chainFilters(datasourcesFilters))
          }
          return ex
        })
      })
    }

    if (sqlParse.verb && sqlParse.verb !== 'SELECT') {
      throw new Error('Unsupported SQL verb ' + sqlParse.verb + ' must be SELECT, DESCRIBE, SHOW, or a raw expression')
    }
  
    const defaultParams = {queryEngine, context: {isScan: false}}
    let druidProps = await getExpressionComputeContext(undefined, sqlParse.table || undefined, defaultParams)
    // console.log(JSON.stringify(sqlParse))
    let result = await plyqlExecutor.executeSQLParse(sqlParse, druidProps.context, druidProps.timezone)
    result = result.toJS()
    // 多值列 select 的值转数组
    if (_.toLower(sqlParse.verb) === 'select') {
      result = recurExtractStringArray(result)
    }
    return result
  },

  /**
   * 数据转换，转换的内容包括
   * 替换自定义分组中的OUT_OF_BOUND 和 null
   * 数值转换
   *   格式化和排序数值分组 15.00000~16.00000 => 15~16
   *   druid 返回 -100~100 1~100 这样的数据无法正确排序，所以需要自定义排序
   * Date类型转换(参照time类型的显示)
   * 2017-03-01T12:54:20.139Z~2017-03-01T12:54:41.078Z ===> 2017-03-01T12:54:20.139Z
   */
  convertData(druidData, dbDimNameDict, dimensionExtraSettings, dimensions, splitType) {
    // 替换自定义分组中的OUT_OF_BOUND 和 null
    if (_.some(dimensions, dimName => _.get(dbDimNameDict, [dimName, 'params', 'type']) === DimensionParamsTypes.group)) {
      let nullConter = 0
      const recurOutOfBoundFormatter = arr => {
        let resultSets = arr.map(d => _.mapValues(d, (val, key) => {
          if (_.isArray(val)) {
            return recurOutOfBoundFormatter(val)
          }
          if (!val || val === 'OUT_OF_BOUND') {
            let dbDim = dbDimNameDict[key]
            if (dbDim && dbDim.params && dbDim.params.type === DimensionParamsTypes.group) {
              nullConter++
              return dbDim.params.othersGroupName
            }
          }
          return val
        }))
        if (nullConter > 0) { // 存在null值时才合并
          // 分组维度合并null值和未分组数据计数
          const keys = _.keys(resultSets[0])
          resultSets = _(resultSets).groupBy(keys[0])
            .map((v, k) => {
              return keys.slice(1).reduce((res, key) => {
                res[key] = _.sumBy(v, key)
                return res
              }, { [keys[0]]: k })
            }).value()
        }
        return resultSets
      }

      druidData = immutateUpdate(druidData, '[0].resultSet', dArr => recurOutOfBoundFormatter(dArr || []))
    }

    let floatFormatter = d3.format('.2f')
    let intFormatter = d3.format('.0f')

    let numberFormatDimNameSet = new Set(dimensions.filter(dimName => {
      return isNumberType(_.get(dbDimNameDict, [dimName, 'type']))
    }))
    if (numberFormatDimNameSet.size) {
      // 数值类型的维度的格式化
      // 10000.0000 => 10000
      // 1.0554545 => 1.05
      let recurNumberFormatter = (arr) => {
        return arr.map(d => _.mapValues(d, (val, key) => {
          if (numberFormatDimNameSet.has(key)) {
            if (!_.isString(val)) {
              return val
            }
            let [from, to] = (val || '').split('~').map(v => +v)
            if( _.isNaN(from) || _.isNaN(to)) {
              return val === 'OUT_OF_BOUND' ? '其他' : val
            }
            return isFloatDimension(dbDimNameDict[key])
              ? `[${floatFormatter(from)}, ${floatFormatter(to)})`
              : `[${intFormatter(from)}, ${intFormatter(to)})`
          } else if (_.isArray(val)) {
            return recurNumberFormatter(val)
          }
          return val
        }))
      }
      druidData = immutateUpdate(druidData, '[0].resultSet', dArr => recurNumberFormatter(dArr || []))
      
      const convertOutOfBound = arr => {
        let resultSets = arr.map(d => _.mapValues(d, (val, key) => {
          if (_.isArray(val)) {
            return convertOutOfBound(val)
          }
          return val === 'OUT_OF_BOUND' ? '其他' : val
        }))
        return resultSets
      }
  
      druidData = immutateUpdate(druidData, '[0].resultSet', dArr => convertOutOfBound(dArr || []))
    }
  
    return druidData
  },

  //lucene 原始query查询
  async queryByLucene(query, queryEngine = QUERY_ENGINE.TINDEX) {
    let druidProps = await druidContext(undefined, query.dataSource)
    const executeFunc = queryEngine === QUERY_ENGINE.TINDEX ? requesterWithToArray : uindexRequesterWithToArray

    const result = await executeFunc({
      query: query,
      context: druidProps.context
    })
    return result
  },

  //单图查询参数转为表达式
  async createExpression(queryParams, extra) {
    let {ctx} = extra || {}
    let markProgress = ctx ? ctx.markProgress.bind(ctx) : _.noop

    let {
      druid_datasource_id,
      child_project_id,
      dimensions = [],
      metrics = [],
      dimensionExtraSettings = [],
      filters = [],
      customMetrics = [],
      select = [],
      druidQueryId,
      customDimensions,
      queryEngine = QUERY_ENGINE.TINDEX,
      timeout
    } = queryParams
    // 如果不是 tIndex 的项目，则直接根据数据源取得查询引擎
    const project = _.get(await getProjectsByDataSourceIds([druid_datasource_id]), [0])
    const guessQueryEngine = getQueryEngineByProject(project)
    if (guessQueryEngine !== QUERY_ENGINE.TINDEX) {
      queryEngine = guessQueryEngine
      queryParams.queryEngine = queryEngine
    }
    
    markProgress('Query dataSource')
    let dataSource = await db.SugoDatasources.findOne({
      where: queryEngine === QUERY_ENGINE.UINDEX && _.get(project, 'tag_datasource_name')
        ? { name: _.get(project, 'tag_datasource_name') }
        : { id: druid_datasource_id },
      raw: true
    })
  
    if (!dataSource) {
      throw new Error('查询的数据源不存在')
    }
  
    markProgress('Query dbDimensions')

    let cols = recurGetFiltersCol(filters || [])
    let dbDimensions = await db.SugoDimensions.findAll({
      where: {
        parentId: dataSource.id,
        $or: [
          {
            name: {
              $in: _.uniq([
                ...(dimensions || []),
                ...cols,
                // 包含临时指标中的自定义维度
                ...(customMetrics || []).map(cm => cm.dimName).filter(_.identity)
              ])
            }
          },
          {
            name: {$in: select || []},
            tag_extra: { is_Desensitiz: '1' }
          }
        ]
      },
      raw: true
    })

    //子标签转分组维度 查询
    dbDimensions = dbDimensions.map(p => convertSubTagToGroup(customDimensions, p))
    
    markProgress('Query dbMetrics')
    let dbMeasures = await db.SugoMeasures.findAll({
      where: {
        parentId: dataSource.id,
        name: {
          // 只从数据库查询需要的指标和排序的指标
          $in: _.uniq(metrics.concat(_.flatMap(dimensionExtraSettings, des => des && des.sortCol)).filter(_.identity))
        }
      },
      raw: true
    })

    let dbDimNameDict = _.keyBy(dbDimensions, dbDim => dbDim.name)
    let dbMetricNameDict = _.keyBy(dbMeasures, 'name')

    
    // 查询前的脱敏处理，这里只对 select 的查询做处理，groupBy 的处理逻辑在查询结束之后
    if (EnableDesensitiz && !_.isEmpty(select)
      && _.some(select, dimName => isDesensitizDimension(dbDimNameDict[dimName]))) {
      let preDesensitizDims = select.filter(dimName => isDesensitizDimension(dbDimNameDict[dimName]))
      // 脱敏时，select 敏感维度的话，增加查询脱敏后的维度
      select = [...select, ...preDesensitizDims.map(dimName => `${dimName}__encode`)]
      queryParams.select = select
    }

    // 查询必须指定查询类型
    // queryEngine =  DataSourceTypeMap[dataSource.type] || QUERY_ENGINE.TINDEX
    markProgress('queryEngine:' + queryEngine)

    queryParams.datasource_name = dataSource.name

    // 对于子项目，加入子项目设置的过滤条件
    if (child_project_id) {
      let childProjectQueryRes = await SugoChildProjectsService.getInstance().findById(child_project_id)
      let datasourcesFilters = _.get(childProjectQueryRes, 'result.params.filters') || []
      queryParams.filters = [...filters, ...datasourcesFilters].filter(flt => !_.isEmpty(flt.eq) || _.isNumber(flt.eq))
    }

    markProgress('Expression generate')
    let expression = await this.expressionGenerator(queryParams, dataSource, dbDimNameDict, dbMetricNameDict)
    let ex = Expression.fromJSLoose(expression)
    // console.log(JSON.stringify(ex, null, 2), '======ex')
    markProgress('DruidContext generate')
    let context = {
      queryId: druidQueryId,
      isScan: queryParams.select
        ? (_.isUndefined(queryParams.scanQuery) ? scanQueryFromConfig : queryParams.scanQuery)
        : false
    }
    // 可通过queryParams.scanQuery=true, 可通过queryParams.scanBatchSize=2000开启scanQuery，并设置scanQuery的每批数量
    if (queryParams.scanQuery === true) { // select查看原始数据替换为scanQuery查询
      // scanQuery每批的数据量，默认100
      let { scanBatchSize = 100 } = queryParams
      context.isScan = true
      context.scanBatchSize = scanBatchSize
    }
    // 设置默认timeout
    if (queryEngine === QUERY_ENGINE.TINDEX) {
      context.timeout = config.druid.timeout
    } else if (queryEngine === QUERY_ENGINE.UINDEX) {
      context.timeout = config.uindex.timeout
    }
    // query自定义timeout参数
    if (timeout) {
      context.timeout = timeout
    }
    // 通过配置控制scanQuery
    let druidProps = await getExpressionComputeContext(
      ctx,
      dataSource.name,
      { context, queryEngine }
    )

    return {
      ex,
      druidProps,
      dbDimNameDict
    }
  },

  //单图参数转为druid查询json
  async createQuery (queryParams) {
    let q = transformToOldQueryFormat({
      druid_datasource_id: queryParams.druid_datasource_id,
      datasource_name: queryParams.datasource_name,
      params: queryParams
    })
    //强制不得使用树形结构
    q.splitType = 'groupBy'
    //强制不查询全局数量
    q.withGlobalMetrics = false
    return await this.toDruidQuery(q)
  },

  /**
   *通过transformToOldQueryFormat这个方法打平后的单图查询参数
   * @param {any} q
   * @returns
   */
  async toDruidQuery (q) {
    let {
      ex,
      druidProps
    } = await this.createExpression(q)
    //let computed = await plyqlExecutor.executePlywood(ex, druidProps.context, druidProps.timezone)
    return await ex.toDruidQuery(
      druidProps.context,
      { timezone: druidProps.timezone }
    )
  },

  /**
   * 单图的params转为druidQuery的json
   * @param {any} queryParams
   * @returns
   */
  async expressionToDruidQuery (queryParams) {
    let params = transformToOldQueryFormat(queryParams)
    //强制不得使用树形结构
    params.splitType = 'groupBy'
    //强制不查询全局数量
    params.withGlobalMetrics = false
    return await this.toDruidQuery(params)
  }
}
