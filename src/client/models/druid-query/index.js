/**
 * Created on 10/05/2017.
 */

import Action from './action'
import Actions from './actions'
import Resource from './resource'

/**
 * @typedef {object} DruidQueryFilter
 * @property {string} col - 筛选维度
 * @property {string} type - 维度类型，可选项 string, number, datestring, date
 * @property {string} op -  筛选选项，可选 in, in-ranges, contains, endsWith, startsWith, matchRegex, equal, nullOrEmpty, lookupin。
 *                          前面加 'not ' 代表否定
 * @property {*} eq - 比较值
 */

/**
 * @typedef {object} DruidQueryMetrics
 * @property {string} name
 * @property {string} formula
 */

/**
 * 维度额外设置
 * @typedef {object} DruidQueryDimensionExtraSettings
 * @property {string} sortCol - 排序列，可选维度本身或任意预设指标
 * @property {string} sortDirect - 排序方向，可选 desc/asc
 * @property {number} limit
 * @property {string} granularity - 时间粒度／数值粒度，之后上一级的 granularity 可能会去掉，以这个为准
 */

/**
 * Druid查询参数
 * @link https://github.com/Datafruit/sugo-analytics/wiki/%E6%9F%A5%E8%AF%A2%E5%8D%95%E5%9B%BE%E6%95%B0%E6%8D%AE%E6%8E%A5%E5%8F%A3%E5%8F%82%E6%95%B0%E8%AF%B4%E6%98%8E
 * @typedef {Object} DruidQueryParams
 * @property {?QUERY_ENGINE} queryEngine 数据源存储引擎, 默认是'tindex'
 * @property {?string} [druid_datasource_id=null]
 * @property {?string} [child_project_id=null]
 * @property {?string} [since=null] - 起始时间，如果没有时间筛选，传入null
 * @property {?string} [until=null] - 起始时间，如果没有时间筛选，传入null
 * @property {Array<DruidQueryFilter>} [filters=[]]
 * @property {string} [timezone='Asia/Shanghai']
 * @property {string} [metrics=[]] - 指标名
 * @property {Array<string>} [dimensions=[]] - 维度名
 * @property {string} [granularity='P1D'] - 时间粒度
 * @property {Array<DruidQueryDimensionExtraSettings>} [dimensionExtraSettings=[]] - 维度额外设置，index 与维度对应
 * @property {Array<DruidQueryMetrics>} [customMetrics=[]] - 临时指标，无需为数据源创建指标，直接根据公式查询
 * @property {Array<string>} [select=[]] - 查询列名，查询所有的话填 ['*']，注意：不需要填写 metrics, dimensions
 * @property {number} [selectLimit=100]
 * @property {string} [selectOrderBy='__time'] - 查询排序列
 * @property {string} [selectOrderDirection='desc'] - 查询排序方向
 * @property {string} [groupByAlgorithm='groupBy'] - groupBy 算法，可选项 groupBy, topN; topN 查出来的指标数据不准确，仅限于下拉框等数值不重要的场景下使用
 */

/** @type {DruidQueryParams} */
const DefDruidQuery = {
  druid_datasource_id: null,
  since: null,
  until: null,
  filters: [],
  timezone: 'Asia/Shanghai',
  metrics: [],
  dimensions: [],
  granularity: 'P1D',
  dimensionExtraSettings: [],
  customMetrics: [],
  select: [],
  selectLimit: 100,
  selectOrderBy: '__time',
  selectOrderDirection: 'desc',
  groupByAlgorithm: 'groupBy'
}

/**
 * @typedef {object} DruidQueryState
 * @property {DruidQueryParams} params
 * @property {*} result
 */

/** @type {DruidQueryState} */
const Def = {
  params: { ...DefDruidQuery },
  result: []
}

/**
 * @param {DruidQueryState} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {

    case Action.overrideParam:
      return { params: action.data }

    case Action.resetParam:
      return { params: { ...DefDruidQuery } }

    case Action.query:
      return Actions.query(state.params, done)

    case Action.setParam:
      return {
        params: {
          ...state.params,
          ...action.data || {}
        }
      }

    default:
      return state
  }
}

export default {
  name: 'DruidQuery',
  state: Def,
  scheduler
}

export {
  Action,
  Resource,
  Def
}
