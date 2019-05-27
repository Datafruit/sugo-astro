import _ from 'lodash'
import { get } from '../utils/logger'
import db from '../models'
import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { Domain } from '../../common/url-tools'
import { getRedisClient } from '../utils/redis'
import Storage from './public-redis-storage.service'
import DataAnalysisService from './sugo-data-analysis.service'
import moment from 'moment'
import sugoGlobalConfigService from '../services/sugo-global-config.service'
import SugoProjectService from '../services/sugo-project.service'

const logger = get('TrackEventService')

const $checker = {
  create: defineTypes({
    page: PropTypes.string.isRequired,
    event_name: PropTypes.string.isRequired,
    event_type: PropTypes.string.isRequired,
    event_path: PropTypes.string.isRequired
  }),
  findEntirePageInfoByToken: defineTypes({
    token: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired
  }),
  copyAppEvents: defineTypes({
    app_id: PropTypes.string.isRequired,
    project_id: PropTypes.string.isRequired,
    app_version: PropTypes.string
  }),

  getFirstLoginTime: defineTypes(({
    userId: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired
  }))
}

export default class SugoTrackEventService {
  /**
   * 删除相同版本的事件草稿
   */
  static async deleteAllSameVersionTrackEventDraft (token, appVersion, target, others) {
    return await db.TrackEventDraft.destroy({
      where: {
        appid: token,
        app_version: appVersion,
        ...others
      },
      ...target
    })
  }

  /**
   * 获取事件列表
   * */
  async getTrackEvents ({ token, ...rest }) {
    return await db.TrackEvent.findAll({
      where: {
        appid: token
      },
      attributes: [
        'id', 'event_id', 'event_name', 'event_path', 'event_path_type',
        'event_type', 'page', 'control_event', 'delegate', 'code', 'advance',
        'changed_on', 'is_global'
      ]
    })
  }

  /**
   * 保存可视化事件信息
   * 根据 `appid + page + event_path` 来判断事件是否存在
   * 如果存在则更新，不存在则新建
   *
   * 新版创建同类元素发生如下修改：
   * 1. 参数中传入 origin_path，表示为更新原有的同类元素记录
   * 2. 以origin_path为查找条件，更新记录的event_path为参数中的eventDraft.event_path
   * @param {TrackEventDraftModel} eventDraft
   * @param {String} token
   * @param {String} app_version
   * @param {?String} origin_path
   */
  async saveEventDraft ({ eventDraft, token, app_version, origin_path }) {
    if (!$checker.create(eventDraft).success) return {}
    return await db.client.transaction(async transaction => {

      await db.AppVersion.findOrCreate({
        defaults: {
          appid: token,
          app_version: app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: token,
          app_version: app_version
        },
        transaction
      })
      // 更新event_path
      const event_path = origin_path || eventDraft.event_path
      const { page } = eventDraft
      const ins = await db.TrackEventDraft.find({
        where:  {
          appid: token,
          page,
          event_path
        }
      })
      let result = {}

      if (ins) {
        // update
        const record = ins.get({ plain: true })
        const { id, ...fields } = eventDraft
        await db.TrackEventDraft.update(fields, {
          where: {
            id: record.id,
            appid: token
          },
          transaction
        })
        result = {
          ...record,
          ...fields,
          app_version,
          appid: token
        }
      } else {
        // create
        result = await db.TrackEventDraft.create(
          {
            ...eventDraft,
            app_version,
            appid: token
          },
          { transaction }
        )
        result = result.get({ plain: true })
      }

      return result
    })
  }

  //删除草稿定义事件
  async deleteEventDraft ({ token, id, app_version }) {
    return await db.TrackEventDraft.destroy({
      where: {
        appid: token,
        $or: { id, event_id: id } //id or event_id
      }
    })
  }

  /**
   * 修改全局配置后 更新版本号
   */
  async updataConfigDeploy(projectIds) {
    // 获取所有token
    let newEventBindingsVersion = _.toNumber(moment().format("X"))
    let tokens = await db.SugoDataAnalysis.findAll({ where: { project_id: { $in: projectIds } }, attributes: ["id"], raw: true })
    tokens = tokens.map(p => p.id)
    let resVersions = await db.AppVersion.findAll({
      where: { appid: { $in: tokens }, status: 1 },
      attributes: ['appid', 'app_version', 'event_bindings_version'],
      raw: true
    })
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      //更新appversion 版本号  
      await db.AppVersion.update(
        { event_bindings_version: newEventBindingsVersion },
        {
          where: { appid: { $in: tokens } },
          ...transaction
        })

      for (let i = 0; i < resVersions.length; i++) {
        const { appid, app_version, event_bindings_version } = resVersions[i]
        await db.TrackEvent.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          })
        await db.SugoSDKPageInfo.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          })
        await db.SDKPageCategories.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          })
      }
    })
  }



  /**
   * 部署可视化配置到正式场景
   */
  async deployEvent ({ token, app_version }) {
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      if (app_version !== null) {//转换成string
        app_version = app_version + ''
      }
      let max_keep_version = 3
      let event_bindings_version = _.toNumber(moment().format("X"))

      //删除之前保存失败的数据，避免重复
      await db.TrackEvent.destroy({
        where: {
          appid: token,
          app_version: app_version,
          event_bindings_version: event_bindings_version
        },
        ...transaction
      })

      //从TrackEventDraft复制到TrackEvent/////////////////////////////////////////////
      const rows = await db.TrackEventDraft.findAll({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
      if (rows.length > 0) {
        const trackEvents = rows.map(row => {
          let event = row.get({ plain: true })
          delete event.id
          event.event_bindings_version = event_bindings_version
          return event
        })
        //批量插入新记录
        await db.TrackEvent.bulkCreate(trackEvents, transaction)
        //更新版本
        await db.AppVersion.update({ event_bindings_version: event_bindings_version, last_deployed_on: Date.now() }, {
          where: {
            appid: token,
            app_version: app_version
          },
          ...transaction
        })

        const bindingVersions = await db.TrackEvent.findAll({
          where: { appid: token, app_version: app_version },
          ...transaction,
          attributes: ["event_bindings_version"],
          raw: true,
          group: "event_bindings_version",
          order: [['event_bindings_version', 'ASC']]
        })
        let delete_version = ''
        if (bindingVersions.length > max_keep_version) {
          delete_version = _.get(bindingVersions[0], 'event_bindings_version')
        }
        if (delete_version !== '') {
          await db.TrackEvent.destroy({
            where: {
              appid: token,
              app_version: app_version,
              event_bindings_version: delete_version
            },
            ...transaction
          })
        }
      }

      //从SugoSDKPageInfoDraft复制到SugoSDKPageInfo
      const pageDraftRows = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })

      if (pageDraftRows.length > 0) {
        const pageInfoDrafts = pageDraftRows.map(row => {
          let pageInfo = row.get({ plain: true })
          delete pageInfo.id
          pageInfo.event_bindings_version = event_bindings_version
          return pageInfo
        })
        //批量插入新记录
        await db.SugoSDKPageInfo.bulkCreate(pageInfoDrafts, transaction)
        //更新版本
        await db.AppVersion.update({ event_bindings_version: event_bindings_version, last_deployed_on: Date.now() }, {
          where: {
            appid: token,
            app_version: app_version
          },
          ...transaction
        })

        const pageBindingVersions = await db.SugoSDKPageInfo.findAll({
          where: { appid: token, app_version: app_version },
          ...transaction,
          attributes: ["event_bindings_version"],
          raw: true,
          group: "event_bindings_version",
          order: [['event_bindings_version', 'ASC']]
        })
        let delete_version = ''
        if (pageBindingVersions.length > max_keep_version) {
          delete_version = _.get(pageBindingVersions[0], 'event_bindings_version')
        }
        if (delete_version !== '') {
          await db.SugoSDKPageInfo.destroy({
            where: {
              appid: token,
              app_version: app_version,
              event_bindings_version: delete_version
            },
            ...transaction
          })
        }

        // let delete_version = event_bindings_version - max_keep_version
        // await db.SugoSDKPageInfo.destroy({
        //   where: {
        //     appid: token,
        //     app_version: app_version,
        //     event_bindings_version: delete_version
        //   },
        //   ...transaction
        // })
      }

      // 复制page_categories_draft到page_categories
      // 删除原有记录
      await db.SDKPageCategories.destroy({
        where: {
          appid: token,
          app_version: app_version
        }
      })

      const pageCategories = await db.SDKPageCategoriesDraft.findAll({
        where: {
          appid: token,
          app_version
        }
      })

      if (pageCategories.length > 0) {
        const keys = ['name', 'appid', 'app_version', 'regulation']
        const categories = pageCategories.map(cate => keys.reduce((p, c) => {
          p[c] = cate[c]
          return p
        }, { event_bindings_version: event_bindings_version }))
        logger.info('deployEvent: Copy page categories => %j', categories)
        await db.SDKPageCategories.bulkCreate(categories, transaction)
      } else {
        logger.info('deployEvent: Do not need copy page category.')
      }
      // 清除token下所有的缓存
      await Storage.DesktopDecide.delByToken(token)
    })
  }

  /**
   * 保存可视化事件信息
   */
  async savePageInfoDraft ({ pageInfoDraft, token, app_version }) {
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      await db.AppVersion.findOrCreate({
        defaults: {
          appid: token,
          app_version: app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
      pageInfoDraft.app_version = app_version
      pageInfoDraft.appid = token
      const res = await db.SugoSDKPageInfoDraft.findOrCreate({
        defaults: {
          ...pageInfoDraft
        },
        where: {
          appid: token,
          page: pageInfoDraft.page,
          app_version
        },
        ...transaction
      })
      let [record, created] = res
      if (!created) {
        //已经存在则更新
        await db.SugoSDKPageInfoDraft.update({
          page_name: pageInfoDraft.page_name,
          code: pageInfoDraft.code,
          similar: pageInfoDraft.similar,
          category: pageInfoDraft.category,
          is_submit_point: pageInfoDraft.is_submit_point
        }, {
          where: {
            id: record.id,
            appid: token
          },
          ...transaction
        })
      }
      return {
        ...record.get({ plain: true }),
        ...pageInfoDraft
      }
    })
  }

  /**
   * 更新可视化事件信息
   */
  editTrackEvent (params) {
    return db.client.transaction(async t => {
      let result = []
      const transaction = { transaction: t }
      for (let i = 0; i < params.length; i++) {
        let { id, tags, event_bindings_version, event_id } = params[i]
        let tkEventDraftObj = await db.TrackEventDraft.update({
          tags
        }, {
          where: {
            id
          },
          ...transaction
        })

        if (_.isEmpty(tkEventDraftObj)) return
        let tkEventObj = await db.TrackEvent.update({
          tags
        }, {
          where: {
            event_id,
            event_bindings_version
          },
          ...transaction
        })
        result.push({
          trackEventDraft: tkEventDraftObj,
          trackEvent: tkEventObj
        })
      }
      return result
    })
  }

  /**
   * 删除可视化配置事件草稿
   */
  deleteTrackEventDraft (ids) {
    return db.TrackEventDraft.destroy({
      where: {
        id: {
          $in: ids
        }
      }
    })
  }

  static async mergeTrackEventDraft ({ currentRecord, targetDataAnalysisId, appVersion, selectedTrackEventDraftList, selectedPageInfoDraftList, overwrite }) {
    /*{
     "currentRecord": {
     "projectId": "Sygzs1urYg",
     "analysisId": "38c07f58b8f6e1df82ea29f794b6e097",
     "accessType": 0,
     "projectName": "fxj_test6",
     "analysisName": "Android【android】"
     },
     "targetDataAnalysisId": "2a789a06f0f092cc40a67799d6dc2ab9",
     "appVersion": "1.0",
     "overwrite": [0,1],
     "selectedTrackEventDraftList": [
     {
     "key":2,
     "id":"BygXs6Ef6e"，
     "page": "io.sugo.sdkdemo.activity.WebActivity::/#index",
     "event_path": "{\"path\":\"div#a4117-11\"}",
     "event_name": "外卖"
     }
     ],
     "selectedPageInfoDraftList": [
     {
     "key":2,
     "id":"BygXs6Ef6e"，
     "page": "io.sugo.sdkdemo.activity.WebActivity::/#index",
     "event_path": "{\"path\":\"div#a4117-11\"}",
     "event_name": "外卖"
     }
     ]
     }*/

    return db.client.transaction(async t => {
      const transaction = { transaction: t }
      let targetTrackEventDraft = await db.TrackEventDraft.findAll({
        where: {
          appid: targetDataAnalysisId,
          app_version: appVersion
        }
      })

      let targetPageInfoDraft = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: targetDataAnalysisId,
          app_version: appVersion
        }
      })

      let currentTrackEventDraft = await db.TrackEventDraft.findAll({
        where: {
          appid: currentRecord.analysisId,
          app_version: appVersion
        }
      })

      let currentPageInfoDraft = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: currentRecord.analysisId,
          app_version: appVersion
        }
      })

      targetTrackEventDraft = targetTrackEventDraft.map(r => r.get({ plain: true }))
      targetPageInfoDraft = targetPageInfoDraft.map(r => r.get({ plain: true }))
      currentTrackEventDraft = currentTrackEventDraft.map(r => r.get({ plain: true }))
      currentPageInfoDraft = currentPageInfoDraft.map(r => r.get({ plain: true }))

      const existingTrackEventDraft = targetTrackEventDraft.map((tTED) => {
        return currentTrackEventDraft.find((cTED) => {
          return cTED.page === tTED.page && cTED.event_path === tTED.event_path
        })
      })
      const existingPageInfoDraft = targetPageInfoDraft.map((tPID) => {
        return currentPageInfoDraft.find((cPID) => {
          return tPID.page === cPID.page
        })
      })

      let createTrackEventDraftList = currentTrackEventDraft
      let createPageInfoDraftList = currentPageInfoDraft
      if ((existingTrackEventDraft.length || existingPageInfoDraft.length) && overwrite === 0) {
        return {
          existingTrackEventDraftList: existingTrackEventDraft,
          existingPageInfoDraftList: existingPageInfoDraft
        }
      } else {

        if (overwrite === 1) { //删除需要被覆盖的
          //Track Event Draft List
          let trackEventDraftList = await db.TrackEventDraft.findAll({
            where: {
              appid: targetDataAnalysisId,
              app_version: appVersion
            }
          })

          let destroyQuery = []
          selectedTrackEventDraftList.forEach(t => {
            destroyQuery.push(trackEventDraftList.find(r => r.page === t.page && r.event_path === t.event_path))
          })

          await db.TrackEventDraft.destroy({
            where: {
              id: {
                $in: destroyQuery.map(dq => dq.id)
              }
            }
          }, transaction)

          //Page Info Draft List
          let pageInfoDraftList = await db.SugoSDKPageInfoDraft.findAll({
            where: {
              appid: targetDataAnalysisId,
              app_version: appVersion
            }
          })

          destroyQuery = []
          selectedPageInfoDraftList.forEach(t => {
            destroyQuery.push(pageInfoDraftList.find(r => r.page === t.page))
          })

          await db.SugoSDKPageInfoDraft.destroy({
            where: {
              id: {
                $in: destroyQuery.map(dq => dq.id)
              }
            }
          }, transaction)

          //把没有被选的挑出来
          _.remove(existingTrackEventDraft, r => {
            let result = selectedTrackEventDraftList.find(t => t.event_path === r.event_path && t.page === r.page)
            return result ? true : false
          })

          //把没有被选中的过滤出来，就不用新增了
          _.remove(createTrackEventDraftList, r => {
            let result = existingTrackEventDraft.find(t => t.event_path === r.event_path && t.page === r.page)
            return result ? true : false
          })
        }//end if

        //把没有被选的挑出来
        _.remove(existingPageInfoDraft, r => {
          let result = selectedPageInfoDraftList.find(t => t.page === r.page)
          return result ? true : false
        })

        //把没有被选中的过滤出来，就不用新增了
        _.remove(createPageInfoDraftList, r => {
          let result = existingPageInfoDraft.find(t => t.page === r.page)
          return result ? true : false
        })

      } //end else

      //start copy & paste
      currentTrackEventDraft = createTrackEventDraftList.map((row) => {
        delete row.id
        delete row.appid
        return row = {
          appid: targetDataAnalysisId,
          ...row
        }
      })

      currentPageInfoDraft = createPageInfoDraftList.map((row) => {
        delete row.id
        delete row.appid
        return row = {
          appid: targetDataAnalysisId,
          ...row
        }
      })

      await db.TrackEventDraft.bulkCreate(currentTrackEventDraft, transaction)
      await db.SugoSDKPageInfoDraft.bulkCreate(currentPageInfoDraft, transaction)
      return true
    })
  }

  static async findEntirePageInfoByToken(token, app_version) {
    const checked = $checker.findEntirePageInfoByToken({ token, app_version })
    if (!checked.message) {
      return Response.fail(checked.message)
    }
    const ins = await db.SugoSDKPageInfoDraft.findAll({
      where: {
        appid: token,
        app_version
      }
    })
    return Response.ok(ins.map(r => r.get({ plain: true })))
  }

  /**
   * 分页查询页面信息列表
   * @param {String} token
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  static async getPageInfoPaging (query) {
    let { app_id, name, state, page, pageSize, pageIndex, app_version, event_bindings_version, lastDeployedOn } = query
   
    let res 
    const limit = pageSize
    const offset = (pageIndex - 1) * pageSize
    let where = {
      appid: app_id,
      app_version: app_version
    }
    if(name) {
      where.page_name = {
        $iLike: `%${name}%`
      }
    }
    if(page) {
      where.page = {
        $iLike: `%${page}%`
      }
    }

    if (state === 'DEPLOYED') {
      res = await db.SugoSDKPageInfo.findAndCountAll ({
        where:{
          ...where,
          event_bindings_version
        },
        limit,
        offset
       })
    } else {
      if(!lastDeployedOn || lastDeployedOn === null ) {
        lastDeployedOn = "1970-01-01T00:00:00.000Z"
      }
      res = await db.SugoSDKPageInfoDraft.findAndCountAll ({
        where:{
          ...where,
          changed_on: {
            $gt: lastDeployedOn
          }
        },
        limit,
        offset
       })
    }
    return Response.ok({
      data: res.rows,
      totalCount: res.count
    })
  }

  /**
   * 使用appid查询所有已部署的页面信息
   * @param {String} token
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  static async findEntireDeployedPageInfoByToken (token, app_version) {
    const checked = $checker.findEntirePageInfoByToken({ token, app_version })

    if (!checked.message) {
      return Response.fail(checked.message)
    }

    //查看当期使用的时间绑定版本
    const version_rows = await db.AppVersion.findAll({
      where: {
        appid: token,
        app_version,
        status: 1
      }
    })

    let event_bindings_version = 0
    if (version_rows.length > 0) {
      event_bindings_version = version_rows[0].event_bindings_version
    }

    const ins = await db.SugoSDKPageInfo.findAll({
      where: {
        appid: token,
        app_version,
        event_bindings_version
      },
      raw: true
    })

    let submitClickPoint = false
    const sdkConfig = await sugoGlobalConfigService.getInstance().findOne({ key: 'sdk_submit_click_point' })
    if(_.get(sdkConfig, 'value', '0') === '1') {
      const project = await SugoProjectService.getInfoWithSDKToken(token)
      if (!project.success) {
        return returnResult(ctx, null)
      }
      submitClickPoint = _.get(project,'result.extra_params.sdk_submit_click_point', "0") === "1"
    }

    const pageInfo = ins.map(p => {
      let item = { isSubmitPoint: submitClickPoint && p.is_submit_point, ..._.omit(p, 'is_submit_point') }
      if (!item.code) return _.omit(item, 'code')
      return item
    })

    return Response.ok(pageInfo)
  }

  /**
   * @typedef {Object} CopyEventStruct
   * @property {string} app_id
   * @property {string} app_version
   */

  /**
   * 复制应用的事件到另一个应用
   * 1. 复制 sugo_app_version
   * 2. 复制 sugo_track_event_draft
   * 3. 复制 sugo_sdk_page_info_draft
   * 4. 复制 sugo_page_categories_draft
   * @param {CopyEventStruct} source
   * @param {CopyEventStruct} target
   * @param {string} [regulation] - 域名映射关系
   * @return {Promise.<ResponseStruct>}
   */
  static async copyAppEvents (source, target, regulation) {
    logger.info('copyAppEvents params. source: %j, target: %j, regulation: %s', source, target, regulation)

    const checked_source = $checker.copyAppEvents(source)
    if (checked_source.success) {
      logger.error('copyAppEvents params.source.error: %s', checked_source.message)
      return Response.fail(checked_source.message)
    }

    const checked_target = $checker.copyAppEvents(target)
    if (checked_target.success) {
      logger.error('copyAppEvents params.target.error: %s', checked_source.message)
      return Response.fail(checked_target.message)
    }

    const version = await db.AppVersion.findAll({
      where: {
        appid: source.app_id,
        app_version: source.app_version
      }
    })

    if (version.length === 0) {
      logger.error('copyAppEvents: Not found AppVersion appid')
      return Response.fail('找不到复制的应用版本')
    }

    if (_.isString(regulation)) {
      regulation = regulation.trim()
    }

    return await db.client.transaction(async transaction => {

      // =============================
      // app version
      // =============================
      // 1. 删除原有的app_version
      await db.AppVersion.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 2. 创建app_version
      await db.AppVersion.findOrCreate({
        defaults: {
          appid: target.app_id,
          app_version: target.app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // =============================
      // track events
      // =============================

      // 1. 查找所有事件记录
      const events = await db.TrackEventDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        },
        transaction
      })

      // 2. 删除之前的事件记录
      await db.TrackEventDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 創建新的事件记录
      if (events.length > 0) {
        const fieldsMap = _.omit(events[0].get({ plain: true }), ['id', 'appid', 'app_version', 'created_on', 'changed_on'])
        const keys = _.keys(fieldsMap)
        logger.debug('copyAppEvents: Events keys => %j', keys)
        const ToCreateEvents = events.map(event => keys.reduce((p, c) => {
          p[c] = event[c]
          return p
        }, { appid: target.app_id, app_version: target.app_version }))

        logger.info('copyAppEvents: Events to create: %j', ToCreateEvents.map(e => e.event_name))
        await db.TrackEventDraft.bulkCreate(ToCreateEvents)
      } else {
        logger.warn('copyAppEvents: No events.')
      }

      // =============================
      // page information
      // =============================
      const info = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        }
      })

      // 1. 删除之前的页面信息
      await db.SugoSDKPageInfoDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 2. 复制页面信息到草稿表
      if (info.length > 0) {
        const fieldsMap = _.omit(info[0].get({ plain: true }), ['id', 'appid', 'app_version', 'created_on', 'changed_on'])
        const keys = _.keys(fieldsMap)
        logger.debug('copyAppEvents: Page info keys => %j', keys)
        const infoList = info.map(rc => {
          const ret = keys.reduce((p, c) => {
            p[c] = rc[c]
            return p
          }, { appid: target.app_id, app_version: target.app_version })

          // 如果传入了regulation，则覆盖原来的设置
          if (regulation) {
            ret.category = Domain.replace(ret.page, regulation)
          }
          return ret
        })
        logger.info('copyAppEvents: Page info to create: %j', infoList.map(info => info.page))
        await db.SugoSDKPageInfoDraft.bulkCreate(infoList, { transaction })
      } else {
        logger.warn('copyAppEvents: No page info')
      }

      // =============================
      // regulation
      // 如果传入了regulation，表示用户需要重新设定哉名匹配规则
      // =============================
      if (regulation) {
        // 统计一个应用的所有事件的page，并使用regulations提供的pattern
        // 写入到 sugo_track_page_info_draft 表
        // 如果已经有记录，则更新记录的category
        // 如果没有记录，则插入记录
        const pages = new Set(events.map(event => event.page))
        const map = info.reduce(function (p, c) {
          p[c.page] = c
          return p
        }, {})

        // 直接写入数据
        const insert = []
        pages.forEach(page => {
          // 不计已有的page
          if (!map.hasOwnProperty(page)) {
            insert.push({
              appid: target.app_id,
              page,
              app_version: target.app_version,
              category: Domain.replace(page, regulation)
            })
          }
        })
        logger.info('copyAppEvents: Insert Page info regulation: %j', insert)
        await db.SugoSDKPageInfoDraft.bulkCreate(insert, { transaction })
      } else {
        logger.info('copyAppEvents: Do not need insert record to sugo_sdk_page_info_draft')
      }

      // ## 复制页面分类：sugo_sdk_page_categories_draft
      const categoriesIns = await db.SDKPageCategoriesDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        }
      })

      // 删除页面分类表
      await db.SDKPageCategoriesDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 写入页面分类数据
      if (categoriesIns.length > 0) {
        const categories = categoriesIns.map(ins => ({
          name: ins.name,
          regulation: ins.regulation,
          appid: target.app_id,
          app_version: target.app_version
        }))
        logger.info('copyAppEvents: copy page categories: %j', categories)
        await db.SDKPageCategoriesDraft.bulkCreate(categories, { transaction })
      } else {
        logger.info('copyAppEvents: Do not need copy page categories')
      }

      return Response.ok()
    })
  }

  /**
   * 通过userId获取第一次登录时间
   *
   * @static
   * @param {string} userId
   * @param {string} token
   * @return {Promise.<ResponseStruct>}
   * @memberof SugoTrackEventService
   */
  static async getFirstLoginTime (userId, token) {
    const checked = $checker.getFirstLoginTime({ userId, token })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const PRes = await DataAnalysisService.findProject(token)
    if (!PRes.success) {
      return Response.fail(PRes.message)
    }

    const real_user_table = PRes.result.real_user_table

    if (!real_user_table) {
      return Response.fail('项目未关联用户表')
    }

    const client = await getRedisClient()
    const firstLoginTime = await client.hget(real_user_table, userId)

    if (firstLoginTime) {
      return Response.ok({
        firstLoginTime: parseInt(firstLoginTime),
        isFirstLogin: false
      })
    }

    const now = Date.now()
    await client.hset(real_user_table, userId, now)
    return Response.ok({ firstLoginTime: now, isFirstLogin: true })
  }

  static async getTrackEventsPaging(query) {
    let { app_id, name, page, state, pageSize, pageIndex, app_version, event_bindings_version, lastDeployedOn } = query
    let where = [
      ` event.appid = '${app_id}'`,
      ` event.app_version = '${app_version}'`
    ]
    const count = ' count("event"."id") as "count" '
    const fields = `  
    "event"."id",
    "event"."event_id",
    "event"."event_name",
    "event"."event_path",
    "event"."event_path_type",
    "event"."event_type",
    "event"."page",
    "event"."control_event",
    "event"."delegate",
    "event"."code",
    "event"."advance",
    "event"."similar",
    "event"."changed_on",
    "event"."tags",
    "event"."similar_path",
    "event"."screenshot_id",
    "page"."page_name"`
    let sql = ''
    if (name) {
      where.push(` UPPER(event.event_name) like '%${name.toUpperCase()}%'`)
    }
    if (page) {
      where.push(` UPPER(event.page) = '${page.toUpperCase()}'`)
    }
    const limit = ` limit ${pageSize} offset ${(pageIndex - 1) * pageSize}`
    if (state === 'DEPLOYED') {
      where.push(`"event".event_bindings_version = '${event_bindings_version}'`)
      sql = `SELECT
      <%= fields %>
      FROM
        "sugo_track_event" AS "event"
      LEFT JOIN "sugo_sdk_page_info" AS "page" ON event.page = page.page
      AND event.appid = page.appid
      AND event.event_bindings_version = page.event_bindings_version
      AND event.app_version = page.app_version`
    } else {
      if(!lastDeployedOn || lastDeployedOn === null ) {
        lastDeployedOn = "1970-01-01T00:00:00.000Z"
      }
      where.push(` event.changed_on > '${lastDeployedOn}'`)
      sql = `SELECT
      <%= fields %>
      FROM
        "sugo_track_event_draft" AS "event"
      LEFT JOIN "sugo_sdk_page_info_draft" AS "page" ON event.page = page.page 
      AND event.appid = page.appid
      AND event.app_version = page.app_version 
    `
    }
    sql += where.length ? ` where ${where.join(" and ")}` : ''
    const resCount = await db.client.query(
      _.template(sql)({ fields: count })
    )
    sql += limit
    const resData = await db.client.query(
      _.template(sql)({ fields })
    )
    return Response.ok({
      data: resData[0],
      totalCount: resCount.length ? resCount[0][0].count : 0
    })
  }

  //批量导入事件到事件草稿表
  static async batchImportTrackEventDraft({ eventsArr, token, app_version, transaction }) {

    await db.AppVersion.findOrCreate({
      defaults: {
        appid: token,
        app_version: app_version,
        event_bindings_version: '0'
      },
      where: {
        appid: token,
        app_version: app_version
      },
      transaction
    })
    await db.TrackEventDraft.destroy({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
    // create
    let trackEvents = eventsArr.map(i => {
      i = _.omit(i,['created_on', 'changed_on', 'id', 'appid', 'app_version'])
      i.appid = token,
      i.app_version = app_version
      return i
    })
    await db.TrackEventDraft.bulkCreate(trackEvents, transaction)
  } 

  static async batchImportTrackPageInfoDreaft({ pageInfoArr, token, app_version, transaction }) {
      await db.SugoSDKPageInfoDraft.destroy({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
    let trackInfos = pageInfoArr.map(i =>{
       i = _.omit(i,['created_on', 'changed_on', 'id', 'appid', 'app_version'])
       i.appid = token,
       i.app_version = app_version
       return i
      })
     await db.SugoSDKPageInfoDraft.bulkCreate(trackInfos, transaction)
  }

  static async batchImportPageCategoriesDraft({ pageCategoriesArr, token, app_version, transaction }) {
      await db.SDKPageCategoriesDraft.destroy({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
    let trackInfos = pageCategoriesArr.map(i =>{
       i = _.omit(i,['created_at', 'updated_at', 'id', 'appid', 'app_version'])
       i.appid = token,
       i.app_version = app_version
       return i
      })
     await db.SDKPageCategoriesDraft.bulkCreate(trackInfos, transaction)
  }

  static async batchImportEventProps({ eventProps, token, app_version, transaction }) {
    await db.TrackEventProps.destroy({
      where: {
        appid: token,
        app_version: app_version
      },
      ...transaction
    })
  let trackInfos = eventProps.map(i =>{
     i = _.omit(i,['created_at', 'updated_at', 'id', 'appid', 'app_version'])
     i.appid = token,
     i.app_version = app_version
     return i
    })
   await db.TrackEventProps.bulkCreate(trackInfos, transaction)
}
}
