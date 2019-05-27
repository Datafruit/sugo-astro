/**
 * @Author sugo.io<asd>
 * @Date 17-11-23
 * @desc redis共享存储方法
 * 每个Storage以单例形式对外提供使用,以节省创建开销
 */

import * as Redis  from '../utils/redis'
import DataSource from './sugo-datasource.service'
import Desktop from './desktop.service'
import { Response } from '../utils/Response'
import { get } from '../utils/logger'
import AppConfig from '../config'
import sugoGlobalConfigService from '../services/sugo-global-config.service'
import sugoProject from '../services/sugo-project.service'
import moment from 'moment'
import _ from 'lodash'
import DataAnalysisService from './sugo-data-analysis.service'

const Logger = get('Public.Redis.Storage')

/**
 * @constructor
 * @abstract
 */
class AbstractStorage {
  /** @param {string} name */
  constructor (name) {
    this.$name = name
  }

  /** @return {string} */
  getName () {
    return this.$name
  }

  /**
   * generator必须是一个无副作用的纯函数
   * 如果传入的参数相同,返回值一定相同
   * 否则会出现存储在redis中的key错乱
   * @abstract
   */
  generator () {
    throw new Error(`${this.$name}.generator not implement.`)
  }

  /** @abstract */
  set () {
    throw new Error(`${this.$name}.set not implement.`)
  }

  /** @abstract */
  setExpire () {
    throw new Error(`${this.$name}.setExpire not implement.`)
  }

  /** @abstract */
  get () {
    throw new Error(`${this.$name}.get not implement.`)
  }

  /** @abstract */
  del () {
    throw new Error(`${this.$name}.del not implement.`)
  }

  /** @return {string} */
  toString () {
    return `Redis Storage [${this.$name}]`
  }
}

/** -------------------
 * dimension
 * ------------------- */
class SDKDimensionStorage extends AbstractStorage {
  static EXPIRE = AppConfig.redisExpire

  constructor () {
    super('SDKDimension')
  }

  /**
   * @override
   * @return {string}
   */
  generator (project_id) {
    return `PUBLIC_REDIS_KEY_DIMENSION_${project_id}`
  }

  /**
   * @param {*} value
   * @param {string} project_id
   * @return {Promise.<void>}
   * @override
   */
  async set (value, project_id) {
    const key = this.generator(project_id)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisSet(key, value)
  }

  /**
   * @param {*} value
   * @param {number} expire
   * @param {string} project_id
   * @return {Promise.<void>}
   */
  async setExpire (value, expire, project_id) {
    const key = this.generator(project_id)
    Logger.info('%s: setExpire [%s]', this.toString(), key)
    await Redis.redisSetExpire(key, expire, value)
  }

  /**
   * @param {string} project_id
   * @return {Promise.<ResponseStruct<Array<object>>>}
   * @override
   */
  async get (project_id) {
    const key = this.generator(project_id)
    const name = this.toString()

    let dimensions = await Redis.redisGet(key)
    if (dimensions !== null) {
      Logger.info('%s: get [%s] use cached', name, key)
      return Response.ok(dimensions)
    }

    Logger.info('%s: get [%s] no cached. do query and cache the result', name, key)
    let maxVersion = moment().unix()

    // 处理上报地理位置和 采集设置
    let sdkConfig = await sugoProject.findOne(project_id)
    sdkConfig = _.get(sdkConfig, 'result.extra_params', {})
    if (_.isEmpty(sdkConfig) && AppConfig.site.enableSdkDecideGlobalConfig) {
      sdkConfig = await sugoGlobalConfigService.getInstance().findAll({ key: { $or: ['sdk_position_config', 'sdk_ban_report']} })
      sdkConfig = _.reduce(sdkConfig, (r, v) => { 
        r[v.key] = v.value 
        return r
      }, {})
    }
    const {sdk_position_config, sdk_ban_report} = sdkConfig
    if(sdk_ban_report === '0') {
      dimensions = []
    } else {
      dimensions = await DataSource.getDimensionsForSDK(project_id)
    }

    let result = { dimensions, dimension_version:maxVersion }
    result.position_config = _.isNaN(_.toNumber(sdk_position_config)) ? 0 : _.toNumber(sdk_position_config)
 
    await Redis.redisSetExpire(key, 1 * 60 * 60 * 24 * 365, result)

    return Response.ok(result)
  }

  /**
   * @param {string} project_id
   * @return {Promise.<void>}
   * @override
   */
  async del (project_id) {
    const key = this.generator(project_id)
    Logger.info('%s: del [%s]', this.toString(), key)
    await Redis.redisDel(key)
  }
}

export const NAME_SPACE = 'Decide'
export const GetDecideEventPrefix = (token, appVersion) => {
  return [NAME_SPACE, token, appVersion].filter(_.identity).join('|')
}
/** -------------------
 * desktop decide
 * ------------------- */
class DesktopDecideStorage extends AbstractStorage {

  static REDIS_EXPIRE = AppConfig.redisExpire

  constructor () {
    super('DesktopDecide')
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {string}
   * @override
   */
  generator (token, path_names, version) {
    return [
      GetDecideEventPrefix(token, version),
      path_names.sort().join('$')
    ].join('|')
  }

  /**
   * @param {*} value
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<void>}
   * @override
   */
  async set (value, token, path_names, version) {
    const key = this.generator(token, path_names, version)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisSet(key, value)
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<ResponseStruct<object>>}
   * @override
   */
  async get (token, path_names, version) {
    const key = this.generator(token, path_names, version)
    const name = this.toString()

    let decide = await Redis.redisGet(key)

    if (decide !== null) {
      Logger.info('%s: get [%s] use cached', name, key)
      return Response.ok(decide)
    }

    Logger.info('%s: get [%s] no cached. do query and cache the result', name, key)
    const res = await Desktop.decide(token, path_names, version)

    if (!res.success) {
      Logger.error('%s: get. Get error in Desktop(...args) : %s', name, res.message)
      return res
    }

    decide = res.result
    await Redis.redisSetExpire(key, DesktopDecideStorage.REDIS_EXPIRE, decide)

    return Response.ok(decide)
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<ResponseStruct<object>>}
   * @override
   */
  async del (token, path_names, version) {
    const key = this.generator(token, path_names, version)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisDel(key)
  }

  async delByProjectId(projectId) {
    const tokens = await DataAnalysisService.findAll({ where: { project_id: projectId } })
    for (let i = 0; i < tokens.length; i++) {
      await this.delByToken(tokens[i].id)
    }
  }
  /**
   * 删除所有以token开头的键
   * @param {string} token
   * @return {Promise.<void>}
   */
  async delByToken (token) {
    const redis = await Redis.getRedisClient()
    const pattern = GetDecideEventPrefix(token)
    const keys = await redis.keys(pattern + '*')

    if (keys.length === 0) {
      return
    }
    Logger.info('%s: delByToken delete pattern: %s', this.toString(), pattern)
    Logger.info('%s: delByToken delete keys: %s', this.toString(), JSON.stringify(keys, null, 2))
    await redis.del.apply(redis, keys)
  }
}

export default {
  SDKDimension: new SDKDimensionStorage(),
  DesktopDecide: new DesktopDecideStorage()
}
