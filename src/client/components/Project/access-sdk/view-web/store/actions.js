/**
 * Created by asd on 17-7-11.
 */

import DataAnalysisResource from '../../../../../models/data-analysis/resource'
import DruidQueryResource from '../../../../../models/druid-query/resource'
import AppVersionResource from '../../../../../models/app-version/resource'
import TrackResources from '../../../../../models/track/resource'
import ProjectResource from '../../../../../models/project/resource'
import TrackEventDraftResource from '../../../../../models/track-event-draft/resource'
import { PROJECT_STATE, APP_VERSION_STATUS } from '../../../constants'
import { Action } from './view-model'
import { getPageField, findTrackEvent, isUpdated, trackEventIdentification } from './utils'
import {AccessDataOriginalTypeArr} from '../../../../../../common/constants'

import * as PubSub from 'pubsub-js'
import * as d3 from 'd3'
import moment from 'moment'

import { exportFile } from '../../../../../../common/sugo-utils'
import TrackEventResource from '../../../../../models/track-event/resource'
import TrackPageResource from '../../../../../models/sdk-page-info/resource'
import Fetch from '../../../../../common/fetch-final'

/**
 * 检测WebSDK接入状态，成功之后，更新analysis记录的status
 * @param {String} sql
 * @param {DataAnalysisModel} analysis
 * @return {Promise.<Boolean>}
 */
async function checkAnalysisStatus(sql, analysis) {
  let res = await DruidQueryResource.sql(sql)
  let ret = res.result || []

  if (ret.length > 0) {
    const {
      name,
      package_name,
      total
    } = ret[0]
    if (name && package_name || total > 0) {

      // 安装成功之后更新分析表状态为激活
      res = await DataAnalysisResource.updateStatus({
        id: analysis.id,
        status: PROJECT_STATE.Activate,
        package_name
      })

      return res.success
    }

    return false
  }

  return false
}

/**
 * @param {Array<AppVersionModel>} appVersionsModels
 * @param {String} searchKey
 * @return {*}
 */
function filter (appVersionsModels, searchKey) {
  return searchKey 
    ? appVersionsModels.filter(r => r.app_version.indexOf(searchKey) !== -1) 
    : appVersionsModels.slice()
}

export default {
  /**
   * 检测sdk接入状态
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async checkAnalysis(store, done) {
    const {
      Project: project,
      DataAnalysis: analysis
    } = store.getState()
    const {
      datasource_name
    } = project
    const {
      id
    } = analysis
    PubSub.publish('sdk.stepChange', 2)
    // 查询数据源中是否有数据上报
    // 每隔三秒查询一次
    // 尝试10次
    let retry = 10
    let success
    let timer
    const sql = `SELECT COUNT(*) total FROM \`${datasource_name}\` WHERE token='${id}'`

    store.dispatch({
      type: Action.change,
      payload: {
        checking: true
      }
    })

    async function checker() {
      retry--
      success = await checkAnalysisStatus(sql, analysis)

      if (success) {
        done({
          check_end: true,
          installed: true
        })
        PubSub.publish('sdk.stepChange', 3)
        clearInterval(timer)
      }

      if (retry === 0) {
        done({
          check_end: true,
          installed: false
        })
        clearInterval(timer)
      }
    }

    setTimeout(checker, 0)
    timer = setInterval(checker, 3000)
  },

  /**
   * 查询项目列表
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {Store} store
   * @param done
   * @return {Promise.<void>}
   */
  async queryProjectsList(state, store, done) {
    const res = await ProjectResource.list()
    done({
      projects: res.result
    })
  },

  /**
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async createAppVersion(state, store, done) {
    const {
      DataAnalysis
    } = store.getState()
    const {
      appVersion,
      appVersionsModels,
      searchKey
    } = state
    const res = await AppVersionResource.create({
      appid: DataAnalysis.id,
      app_version: appVersion
    })
    const newAppVersionsModels = appVersionsModels.concat(res.result)
    if (res.success) {
      done({
        appVersionsModels: newAppVersionsModels,
        visibleAppVersionModels: filter(newAppVersionsModels, searchKey)
      })
    }
    // TODO send error message
  },

  /**
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async queryAppVersions(state, store, done) {
    const {
      DataAnalysis
    } = store.getState()
    const res = await AppVersionResource.listWithEventsCount(DataAnalysis.id)
    const {
      app_versions,
      count,
      draftCount
    } = res.result
    const countMap = new Map()
    const counts = (count[0] || [])
    counts.forEach(r => countMap.set(r.app_version, parseInt(r.count)))

    const draftCountMap = new Map()
    const draftCounts = (draftCount[0] || [])
    draftCounts.forEach(r => draftCountMap.set(r.app_version, parseInt(r.count)))

    const appVersionsModels = app_versions.map(r => ({
      ...r,
      deploy_events_count: countMap.get(r.app_version),
      draft_event_count: draftCountMap.get(r.app_version)
    }))

    done({
      appVersionsModels,
      visibleAppVersionModels: filter(appVersionsModels, state.searchKey)
    })
  },

  /**
   * 切换AppVersion记录status
   * 如果为 APP_VERSION_STATUS.Disabled，就换成 APP_VERSION_STATUS.Active
   * 反之亦然
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {String} id - id of app version record
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async toggleAppVersionStatus(state, id, store, done) {
    let {
      appVersionsModels
    } = state
    const record = appVersionsModels.find(r => r.id === id)

    if (!record) {
      return done({})
    }

    const status = record.status === APP_VERSION_STATUS.Active 
     ? APP_VERSION_STATUS.Disable 
     : APP_VERSION_STATUS.Active
    const appid = record.appid
    const app_version = record.app_version

    const res = await AppVersionResource.toggleAppVersionStatus({
      id,
      status,
      appid,
      app_version
    })

    if (!res.success) {
      // TODO send message
      store.dispatch({})
      return done({})
    }

    appVersionsModels = appVersionsModels.map(r => r.id === id ? ({ ...r,
      ...res.result
    }) : r)

    done({
      appVersionsModels,
      visibleAppVersionModels: filter(appVersionsModels, state.searchKey)
    })
  },

  /**
   * 更新app_version
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {String} app_version
   * @param {String} id
   * @param {Store} store
   * @param {Function} done
   */
  async updateAppVersion(state, app_version, id, store, done) {
    let {
      appVersionsModels
    } = state
    const record = appVersionsModels.find(r => r.id === id)

    if (!record) {
      return done({})
    }

    if (record.app_version === app_version) {
      return done({})
    }

    const res = await AppVersionResource.update({
      id,
      app_version
    })

    if (!res.success) {
      // TODO send message
      return done({})
    }

    appVersionsModels = appVersionsModels.map(r => r.id === id ? ({ ...r,
      ...res.result
    }) : r)

    done({
      appVersionsModels,
      visibleAppVersionModels: filter(appVersionsModels, state.searchKey)
    })
  },

  /**
   * 导出事件
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {String} id
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async downloadEvents(state, id, store, done) {
    const record = state.appVersionsModels.find(r => r.id === id)

    if (!record) {
      return done({})
    }

    const {
      DataAnalysis
    } = store.getState()

    const res = await TrackEventDraftResource.pageList({
      token: DataAnalysis.id,
      app_version: record.app_version,
      event_bindings_version: record.event_bindings_version || 1
    })

    const content = d3.csvFormat(res.result)
    exportFile(`可视化埋点_${moment().format('YYYY-MM-DD')}.csv`, content)
    done({})
  },

  /**
   * 批量导出事件
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {String} id
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async batchExport(state, id, store, done) {
    const record = state.appVersionsModels.find(r => r.id === id)

    const {
      DataAnalysis
    } = store.getState()
    //获取事件草稿列表
    const eventRes = await TrackEventDraftResource.list({
      token: DataAnalysis.id,
      app_version: record.app_version,
      isBatchExport: true
    })
    //获取页面草稿列表
    const pageRes = await TrackResources.draftPageList({
      token: DataAnalysis.id,
      app_version: record.app_version,
      isBatchExport: true
    })
    //获取页面分类草稿表
    const pageCategoriesRes = await TrackResources.getPageCategories({
      appid: DataAnalysis.id,
      app_version: record.app_version,
      isBatchExport: true
    })
    //获取图片base64
    // let eventScreenshotIdArr = []
    // for (let i = eventRes.result.length - 1; i >=0; i --) {
    //   const screenshot = await TrackResources.eventScreenshot({
    //     screenshot_id: eventRes.result[i].screenshot_id,
    //   })
    //   eventScreenshotIdArr.push(screenshot.result)
    // }
    let result = {
      events: eventRes.result || [], // TODO万级别测试数据
      pageInfos: pageRes.result || [],
      pageCategories: pageCategoriesRes.result || [],
      // eventScreenshotIdArr
    }
    exportFile(`${record.appid}_${AccessDataOriginalTypeArr[store.state.DataAnalysis.access_type]}_${record.app_version}.json`, JSON.stringify(result), 'text/json;charset=utf-8;')
    done({})
  },

  //开始导入项目数据
  async startImporting(state, payload, store, done) {
    payload.app_type = AccessDataOriginalTypeArr[store.state.DataAnalysis.access_type]
    let res = await TrackResources.startImporting(payload)
    if (res.success) {
      store.dispatch({
        type: Action.queryAppVersion
      })
      done({
        message: {
          type: 'success',
          message: res.result
        },
        ModalVisible: false,
        isImporting: false
      })
    } else {
      done({
        message: {
          type:  'error',
          message: res.message
        },
        isImporting: false
      })
    }
  },

  /**
   * @param {string} app_id
   * @param {string} app_version
   * @param {SDKEditorAndAccessorViewModel} state
   * @param {Store} store
   * @param {function} done
   * @return {Promise.<void>}
   */
  async deployAppEvents(app_id, app_version, state, store, done) {
    const res = await TrackEventDraftResource.deployAppEvents(app_id, app_version)
    done({
      message: {
        type: res.success ? 'success' : 'error',
        message: res.success ? '部署成功' : res.message
      }
    })

    await new Promise(resolve => store.dispatch({
      type: Action.change,
      payload: {
        message: null
      }
    }, resolve))
    store.dispatch({
      type: Action.queryAppVersion
    })
  },

  /**
   * 过渡searchKey
   * @param state
   * @param searchKey
   * @param store
   * @param done
   */
  searchKey(state, searchKey, store, done) {
    const {
      appVersionsModels
    } = state
    done({
      searchKey,
      visibleAppVersionModels: filter(appVersionsModels, searchKey)
    })
  },

  /**
   * 过滤事件列表
   * @param {SDKEditorAndAccessorViewModel} vmState
   * @param {Store<WebSDKAccessorState>} store
   * @param {AccessWebAppEventsFilter} filter
   * @param {function} done
   */
  async filterEvents(vmState, store, filter, done) {
    const appEventsFilter = { ...vmState.appEventsFilter,
      ...filter
    }
    let res = await TrackEventResource.eventList(appEventsFilter)
    if (res.success) {
      done({
        appEvents: res.result,
        appEventsFilter
      })
    } else {
      done({
        message: {
          type: 'error',
          message: res.message
        }
      })
    }
  },

  /**
   * 过滤页面分类
   * @param {SDKEditorAndAccessorViewModel} vmState
   * @param {Store<WebSDKAccessorState>} store
   * @param {object} filter
   * @param {function} done
   */
  async filterCategories(vmState, store, filter, done) {
    const appCategoriesFilter = { ...vmState.appCategoriesFilter,
      ...filter
    }
    let res = await TrackResources.getPageCategoriesPaging(appCategoriesFilter)
    if (res.success) {
      done({
        appCategories: res.result,
        appCategoriesFilter
      })
    } else {
      done({
        message: {
          type: 'error',
          message: res.message
        }
      })
    }
  },

  /**
   * 过滤页面列表
   * @param {SDKEditorAndAccessorViewModel} vmState
   * @param {Store<WebSDKAccessorState>} store
   * @param {object} filter
   * @param {function} done
   */
  async filterPages(vmState, store, filter, done) {
    const appPagesFilter = { ...vmState.appPagesFilter,
      ...filter
    }
    let res = await TrackPageResource.list(appPagesFilter)
    if (res.success) {
      done({
        appPages: res.result,
        appPagesFilter
      })
    } else {
      done({
        message: {
          type: 'error',
          message: res.message
        }
      })
    }
  },
  /**
   * 过滤页面列表
   * @param {SDKEditorAndAccessorViewModel} vmState
   * @param {Store<WebSDKAccessorState>} store
   * @param {object} filter
   * @param {function} done
   */
  async pagesForFilterEvents(vmState, filter, done) {
    const {
      page
    } = filter
    const query = {
      ..._.pick(vmState.appEventsFilter, ["app_id", "app_version", "event_bindings_version", "state"]),
      pageSize: 20,
      pageIndex: 1,
      page
    }
    let res = await TrackPageResource.list(query)
    if (res.success) {
      done({
        appEventPages: res.result.data
      })
    } else {
      done({
        message: {
          type: 'error',
          message: res.message
        }
      })
    }
  }
}
