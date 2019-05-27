import { returnResult, returnError } from '../utils/helper'
import db from '../models'
import cache from '../services/cache'
import SugoTrackEventService from '../services/sugo-track-event.service'
import DruidQueryService from '../services/druid-query.service'
import SugoDatasourceService from '../services/sugo-datasource.service'
import SugoProjectService from '../services/sugo-project.service'
import SugoSDKPageCategoriesService from '../services/sugo-sdk-page-categories.service'
import { redisSetExpire, redisGet } from '../utils/redis'
import { compressUrlQuery } from '../../common/sugo-utils'
import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { get } from '../utils/logger'
import { ok, equal } from 'assert'
import generate from 'shortid'
import Storage, { GetDecideEventPrefix } from '../services/public-redis-storage.service'
import AppConfig from '../config'
import _ from 'lodash'

const logger = get('Desktop.Controller')

const $checker = {
  decide: defineTypes({
    path_name: PropTypes.string.isRequired,
    separator: PropTypes.string.isRequired
  })
}

const desktop = {

  /**
   * 所有客户端加载web可视化配置信息（正式环境）
   * 会根据此列表绑定对应的事件进行数据上报
   * */
  decide: async ctx => {
    const checked = $checker.decide(ctx.query)

    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }

    const { token, path_name, version, separator } = ctx.query

    const PRes = await SugoProjectService.getInfoWithSDKToken(token)
    // 查询token所属的项目
    if (!PRes.success) {
      return returnResult(ctx, null)
    }

    const path_names = path_name.split(separator)

    // 获取存储层中的数据
    const DRes = await Storage.DesktopDecide.get(token, path_names, version)
    if (!DRes.success) {
      return returnResult(ctx, null)
    }

    const DimRes = await Storage.SDKDimension.get(PRes.result.id)
    if (!DimRes.success) {
      return returnResult(ctx, null)
    }
    
    const result = {
      ...DRes.result,
      dimensions: DimRes.result.dimensions,
      position_config: DimRes.result.position_config 
    }

    return ctx.body = Response.ok(compressUrlQuery(result))
  },
  /**
   * 获取已配置的事件列表（生产环境）
   * */
  vtrackEvents: async ctx => {
    const { token } = ctx.query
    const res = await new SugoTrackEventService().getTrackEvents({ token })
    returnResult(ctx, res)
  },

  /**
   * 获取事件草稿绑定表列表(可视化配置时用到)
   */
  vtrackEventsDraft: async ctx => {
    const { token, path_name, ...rest } = ctx.q
    //事件草稿表记录
    const eventDrafts = await db.TrackEventDraft.findAll({
      where: {
        appid: token,
        $or: [
          {
            page: {
              $in: path_name
            }
          },
          {
            is_global: 'yes'
          }
        ],
        ...rest
      }
    })
    //页面参数设置记录
    let pageInfoDraft = await db.SugoSDKPageInfoDraft.findAll({
      where: {
        page: {
          $in: path_name
        },
        appid: token
      }
    })

    returnResult(ctx, { eventDrafts, pageInfoDraft })
  },

  /**
   * 选择可视化埋点启动页面列表
   */
  getTrackWebsites: async ctx => {
    const { token, url } = ctx.q
    if (!token) {
      return returnError(ctx, '非法请求：缺少token参数')
    }
    let dataCache = await cache.getCache(ctx)
    let projectId
    if (!dataCache) {
      // 根据token查询datasourceName
      const ds = await new SugoDatasourceService.selectOneByAppidForNewAccess(token)
      if (!ds) {
        return returnError(ctx, '非法请求：token参数错误')
      }

      const URL_FIELD_NAME = 'current_url'
      const params = {
        druid_datasource_id: ds.id,
        dimensions: [URL_FIELD_NAME],
        // TODO timezone 统一配置或传入
        timezone: 'Asia/Shanghai',
        groupByAlgorithm: 'topN',
        filters: [{
          col: 'event_type',
          op: 'in',
          type: 'string',
          eq: ['浏览', 'view']
        }, {
          col: 'token',
          op: 'equal',
          type: 'string',
          eq: [token]
        },
        // {
        //   col: '__time',
        //   op: 'in',
        //   eq: '-1 day',
        //   type: 'number'
        // }
        ],
        selectLimit: 100,
        dimensionExtraSettings: [{
          sortCol: URL_FIELD_NAME,
          sortDirect: 'desc',
          limit: 50,
          granularity: 'P1D'
        }],
        customMetrics: [],
        metrics: []
      }

      if (url) {
        // 模糊匹配
        params.filters.push({
          col: URL_FIELD_NAME,
          op: 'equal',
          type: 'string',
          eq: [url]
        })
      }

      projectId = ds.name
      dataCache = await DruidQueryService.queryByExpression(params)
      dataCache = (_.get(dataCache, '[0].resultSet') || []).map(r => ({ url: r[URL_FIELD_NAME] }))
      await cache.setCache(ctx, dataCache)
    }
    return returnResult(ctx, {
      projectId: projectId,
      websites: dataCache
    })
  },

  /** 保存草稿表，可视化配置保存事件 */
  saveVtrackEventsDraft: async ctx => {
    const { eventDraft, token, app_version } = ctx.q
    const res = await new SugoTrackEventService().saveEventDraft({ eventDraft, token, app_version })
    returnResult(ctx, res)
  },

  // 删除草稿定义事件
  deleteEventDraft: async ctx => {
    const { token, id } = ctx.q
    const res = await new SugoTrackEventService().deleteEventDraft({ token, id })
    returnResult(ctx, res)
  },

  /**
   * 部署可视化配置到正式环境
   */
  deployEvent: async ctx => {
    const { token, app_version } = ctx.q
    await new SugoTrackEventService().deployEvent({ token, app_version })
    returnResult(ctx, true)
  },

  // 保存PC埋点页面参数设置
  savePageInfoDraft: async ctx => {
    const { pageInfoDraft, token, app_version } = ctx.q
    const res = await new SugoTrackEventService().savePageInfoDraft({ pageInfoDraft, token, app_version })
    returnResult(ctx, res)
  },

  /**
   * 创建或更新页面分类，以id为操作标识
   * @param ctx
   * @return {Promise.<*>}
   */
  async savePageCategories(ctx) {
    const { models, token, app_version } = Object.assign(ctx.q, ctx.request.body)
    return ctx.body = await SugoSDKPageCategoriesService.bulkSave(models, token, app_version)
  },

  /**
   * 检测客户端是否主动要求不要缓存
   * @param ctx
   * @return {boolean}
   * @private
   */
  _doNotCache(ctx) {
    const cacheCtrl = ctx.get('cache-controller')
    return cacheCtrl ? cacheCtrl.indexOf('no-cache') !== -1 : false
  },

  /**
   * 查询 appid & app_version 下的所有分类记录
   * @param ctx
   * @return {Promise.<*>}
   */
  async findAllPageCategories(ctx){
    const { appid, app_version, isBatchExport = false } = ctx.q

    // 不要缓存
    if (desktop._doNotCache(ctx) || isBatchExport) {
      return ctx.body = await SugoSDKPageCategoriesService.findAll(appid, app_version, isBatchExport)
    }

    const key = GetDecideEventPrefix(appid, app_version) + 'ALL_PAGE_CATE'

    // 有缓存时取缓存数据
    const cache = await redisGet(key)
    if (cache) {
      return ctx.body = cache
    }

    // 没有缓存时，查询并写入缓存
    const body = await SugoSDKPageCategoriesService.findAll(appid, app_version)
    await redisSetExpire(key, AppConfig.redisExpire, body)

    return ctx.body = body
  },

  /**
   * 查询 appid & app_version 下的所有已部署分类记录
   * @param ctx
   * @return {Promise.<*>}
   */
  async findAllDeployedPageCategories(ctx) {
    const { appid, app_version } = ctx.q

    if (desktop._doNotCache(ctx)) {
      return ctx.body = await SugoSDKPageCategoriesService.findAllDeployed(appid, app_version)
    }

    const key = GetDecideEventPrefix(appid, app_version) + 'ALL_DEPLOYED_PAGE_CATE'

    // 有缓存时取缓存数据
    const cache = await redisGet(key)
    if (cache) {
      return ctx.body = cache
    }

    // 没有缓存时，查询并写入缓存
    const body = await SugoSDKPageCategoriesService.findAllDeployed(appid, app_version)
    await redisSetExpire(key, AppConfig.redisExpire, body)

    return ctx.body = body
  },

  /**
   * 查询token所属的所有页面信息记录
   * @param ctx
   * @return {Promise.<ResponseStruct<SDKPageInfoDraftModel>>}
   */
  async getEntirePageInfoByToken(ctx){
    const { appid, app_version } = ctx.q
    return ctx.body = await SugoTrackEventService.findEntirePageInfoByToken(appid, app_version)
  },

  /**
   * 分页查询 页面列表
   * @param ctx
   * @return {Promise.<ResponseStruct<SDKPageInfoDraftModel>>}
   */
  async getPageInfoPaging(ctx){
    return ctx.body = await SugoTrackEventService.getPageInfoPaging(ctx.q)
  },

  /**
   * 查询token所属的所有已部署的页面信息记录
   * @param ctx
   * @return {Promise.<ResponseStruct<SDKPageInfoModel>>}
   */
  async getEntireDeployedPageInfoByToken(ctx){
    const { appid, app_version } = ctx.q
    if (desktop._doNotCache(ctx)) {
      return ctx.body = await SugoTrackEventService.findEntireDeployedPageInfoByToken(appid, app_version)
    }

    const key = GetDecideEventPrefix(appid, app_version) + 'ENTIRE_DEPLOYED_PAGE_INFO'

    // 有缓存时取缓存数据
    const cache = await redisGet(key)
    if (cache) {
      return ctx.body = cache
    }

    // 没有缓存时，查询并写入缓存
    const body = await SugoTrackEventService.findEntireDeployedPageInfoByToken(appid, app_version)
    await redisSetExpire(key, AppConfig.redisExpire, body)

    return ctx.body = body
  },

  /**
   * 更新app事件page字段
   * @param ctx
   * @return {Promise.<ResponseStruct.<Array.<string>>>}
   */
  async upgradeAppEventsPageField(ctx){
    /** @type {{app_id:string, domain:string, app_version:string}} */
    const query = ctx.q
    return ctx.body = await SugoTrackEventService.upgradeAppEventsPageField(
      query.app_id,
      query.domain,
      query.app_version
    )
  },

  /**
   * 复制事件：app之间的复制、跨项目复制
   * @param ctx
   * @return {Promise.<ResponseStruct>}
   */
  async copyAppEvents(ctx) {
    /** @type {{source:CopyEventStruct, target:CopyEventStruct, regulation: Object}} */
    const query = ctx.q
    return ctx.body = await SugoTrackEventService.copyAppEvents(
      query.source,
      query.target,
      query.regulation
    )
  },
  /**
   * 获取用户第一次登录时间
   * @param {*} ctx
   */
  async getFirstLoginTime(ctx) {
    const { userId, token } = ctx.query
    return ctx.body = await SugoTrackEventService.getFirstLoginTime(userId, token)
  },
  /**
   * 分页查询页面分类
   * @param {*} ctx
   */
  async getPageCategoriesPaging(ctx) {
    return ctx.body = await SugoSDKPageCategoriesService.getPageCategoriesPaging(ctx.q)
  },
  
}

/**
 * @desc 探索涉及到数据库操作的测试方案,勿删
 * @class 测试类
 */
class Test {
  static async copyAppEvents () {
    await db.client.transaction(async transaction => {
      transaction = void 0
      let res

      // 参数异常时会返回异常的信息
      res = await desktop.copyAppEvents({ q: { source: {}, target: {}, regulation: '' } })
      equal(res.success, false)
      ok(res.message !== null && typeof res.message === 'string')
      logger.debug('testCopyAppEvents: Error params result %j', res)

      const mark = (mark = '=', num = 64) => logger.debug(new Array(num).fill(mark).join(''))

      // 插入几条虚拟数据
      const appid = generate()
      const app_version = '0'

      // 写入到SugoDataAnalysis表
      const analysis = {
        id: appid,
        name: 'desktop.controller.testCopyAppEvents',
        type: 0,
        access_type: 2
      }

      // 写入到事件表
      const events = [
        {
          appid,
          page: 'https://www.sugo.io/a/b.html',
          event_path: '#a',
          event_type: 'click',
          event_name: 't1',
          event_path_type: 'web',
          app_version
        },
        {
          appid,
          page: 'https://www.sugo.io/a/c.html',
          event_path: '#a',
          event_type: 'click',
          event_name: 't2',
          event_path_type: 'web',
          app_version
        }
      ]
      const info = [
        {
          appid,
          page: 'https://www.sugo.io/a/b.html',
          category: '*/a/*',
          app_version
        }
      ]
      const app_versions = {
        appid,
        app_version
      }
      const categories = [
        {
          appid,
          name: 'C1',
          app_version,
          regulation: '*/a/c/*'
        },
        {
          appid,
          name: 'C2',
          app_version,
          regulation: '*/a/d/*'
        }
      ]

      const params = {
        source: {
          app_id: appid,
          app_version
        },
        target: {
          app_id: generate(),
          app_version
        },
        regulation: '*/a.com'
      }

      // 写入
      await db.SugoDataAnalysis.create(analysis, { transaction })
      await db.SugoDataAnalysis.create({ ...analysis, id: params.target.app_id }, { transaction })
      await db.AppVersion.create(app_versions, { transaction })
      await db.TrackEventDraft.bulkCreate(events, { transaction })
      await db.SugoSDKPageInfoDraft.bulkCreate(info, { transaction })
      await db.SDKPageCategoriesDraft.bulkCreate(categories, { transaction })

      // 复制事件接口
      res = await desktop.copyAppEvents({ q: params })
      logger.debug('testCopyAppEvents: param => %j & res => %j', params, res)
      logger.debug('res.success %s', res.success)

      // 检测event表
      const target_events = await db.TrackEventDraft.findAll({
        where: {
          appid: params.target.app_id,
          app_version: params.target.app_version
        }
      })

      mark()
      logger.debug('target_events.length === events.length', target_events.length === events.length)
      mark()

      logger.debug(
        'testCopyAppEvents: target.events => %j',
        target_events.map(r => r.get({ plian: true }))
      )

      // 检测page_info表
      const target_page = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: params.target.app_id,
          app_version: params.target.app_version
        }
      })

      mark()
      logger.debug('target_page.length === events.length + info.length', target_page.length === events.length + info.length)
      mark()

      logger.debug(
        'testCopyAppEvents: target.page_info => %j',
        target_page.map(r => r.get({ plian: true }))
      )

      // 检测page_categories表
      const page_categories = await db.SDKPageCategoriesDraft.findAll({
        where: {
          appid: params.target.app_id,
          app_version: params.target.app_version
        }
      })
      mark()
      logger.debug('page_categories.length === categories.length', page_categories.length === categories.length)
      mark()
      logger.debug(
        'testCopyAppEvents: target.page_categories => %j',
        page_categories.map(ins => ins.get({ plain: true }))
      )
    })
  }

  static run () {
    async function runner () {
      await Test.copyAppEvents()
    }

    runner().then(_.noop)
  }
}

if (process.env.NODE_ENV === 'TEST_API_ENV') {
  Test.run()
}

export default desktop
