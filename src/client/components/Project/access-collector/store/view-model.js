import { namespace, AccessDataOriginalType } from '../../constants'
import AnalyticsResource from '../../../../models/data-analysis/resource'
import ProjectsResource from '../../../../models/project/resource'
import DataSourceResource from '../../../../models/data-source/resource'
import {immutateUpdate} from '../../../../../common/sugo-utils'
import _ from 'lodash'
import {PLATFORM} from '../../../../../common/constants'
import DruidColumnType from '../../../../../common/druid-column-type'

const GrokTypeToDimType = {
  byte: DruidColumnType.Int,
  boolean: DruidColumnType.String,
  short: DruidColumnType.Int,
  int: DruidColumnType.Int,
  long: DruidColumnType.Long,
  float: DruidColumnType.Float,
  double: DruidColumnType.Double,
  date: DruidColumnType.Date,
  datetime: DruidColumnType.Date,
  string: DruidColumnType.String,
  json: DruidColumnType.String
}

const Actions = {
  updateState: `${namespace.access}-update-view-modal`,
  query: `${namespace.access}-query-log-app`,
  update: `${namespace.access}-update-log-app`,
  syncDimsAndLaunch: `${namespace.access}-launch-log-app`
}

const DefaultState = {
  isLoadingApp: false,
  isUpdatingApp: false,
  logApp: {}
}

async function scheduler (state, action, done) {
  switch (action.type) {
    case Actions.updateState:
      if (_.isFunction(action.payload)) {
        done(action.payload(state))
      } else {
        done(action.payload)
      }
      break

    case Actions.query: {
      let res = await AnalyticsResource.list(action.payload.projectId)
      let apps = res.success ? res.result : []

      done({
        logApp: _.find(apps, app => app.access_type === AccessDataOriginalType.Log),
        isLoadingApp: false
      })
    }
      break
    case Actions.update: {
      let res = await AnalyticsResource.update(state.logApp)
      done({
        isUpdatingApp: false,
        logApp: res.success ? res.result : null
      })
    }
      break
    case Actions.syncDimsAndLaunch: {
      let {resolve, reject, project} = action.payload
      let {grokPattern, timeDimensionName} = state.logApp.params
      let grokTypeDict = extractFieldType(grokPattern)

      let dimensions = _.keys(grokTypeDict).map(dim => ({name: dim, type: GrokTypeToDimType[grokTypeDict[dim]]}))
      try {
        let res = await ProjectsResource.postDimensions(dimensions, state.logApp.id, PLATFORM.SINGLE)
        if (!res || !res.success) {
          throw new Error('上报维度失败，无法开始采集，请联系管理员')
        }
        resolve()
      } catch (e) {
        reject(e)
      }

      done({isUpdatingApp: false})
    }
      break
    default:
  }
}

export default {
  name: 'ViewModel',
  scheduler,
  state: { ...DefaultState }
}

const subPatternsRegex      = /%{[A-Z0-9_]+(?:[:;][^;]+?)?(?:[:;][^;]+?)?(?:[:;][^;]+?)?}/g
const subPatternGroupRegex  = /^%{([A-Z0-9_]+)(?:[:;]([^;]+?))?(?:[:;]([^;]+?))?(?:[:;]([^;]+?))?}$/

function extractFieldType(grokPattern) {
  return ((grokPattern || '').match(subPatternsRegex) || []).reduce((obj, subPattern) => {
    let m = subPattern.match(subPatternGroupRegex) // 第 1 组 ～ 第 4 组分别为：模式名，列名，类型，日期读取格式
    if (!m) {
      return obj
    }
    obj[m[2] || m[1]] = m[3] || 'string'
    return obj
  }, {})
}

export {
  Actions,
  extractFieldType
}
