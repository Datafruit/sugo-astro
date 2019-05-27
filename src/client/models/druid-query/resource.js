/**
 * Created on 10/05/2017.
 */

import Resource from '../resource'
import { QUERY_ENGINE } from '../../../common/constants'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from '../../common/fetch-utils'

const $resource = {
  query: Resource.create(withExtraQuery('/app/slices/query-druid', DefaultDruidQueryCacheOpts)),
  lucene: Resource.create(withExtraQuery('/app/plyql/lucene', DefaultDruidQueryCacheOpts)),
  sql: Resource.create(withExtraQuery('/app/plyql/sql', DefaultDruidQueryCacheOpts))
}

/**
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct (success, result, message) {
  return {
    success,
    result,
    message,
    type: 'json',
    code: 200
  }
}

export default {
  /**
   * @description 通用表达式查询druid数据
   * slices.controller.queryDruidData
   * @param {DruidQueryParams} params
   * @return {Promise.<ResponseStruct>}
   */
  async query(params) {
    const res = await $resource.query.post({}, params).json()
    return struct(true, res, null)
  },

  /**
   * @description 原生JSON查询druid数据
   * @param {Object} params
   * @return {Promise.<ResponseStruct>}
   */
  async lucene(params) {
    // TODO ResponseStruct
    return await $resource.lucene.post(
      void 0,
      void 0,
      { body: JSON.stringify(params) }
    ).json()
  },

  /**
   * @description 直接运行sql查询Druid
   * @param {String} query - sql statement
   * @param {string} queryEngine default is QUERY_ENGINE.TINDEX
   * @return {Promise.<ResponseStruct>}
   * @see {QUERY_ENGINE}
   * @example
   * ```js
   * const res = await $resource.sql('select count(*) from data_source_name')
   * res.result // result of query
   * ```
   */
  async sql(query, queryEngine = QUERY_ENGINE.TINDEX, childProjectId = null) {
    const res = await $resource.sql.post({}, { query, queryEngine, childProjectId }, {
      handleErr(res) {
        console.error('exec sql query in druid:: ', res)
      }
    }).json()
    return struct(true, res ? res.result : null, null)
  }
}
