/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 */
import db from '../models'

import { Validates, Validator } from 'sugo-store'
import { Response } from '../utils/Response'
import { mapValues, passValid } from './base.service'
// import sugoProject from '../services/sugo-project.service'
// import sugoGlobalConfigService from '../services/sugo-global-config.service'
import _ from 'lodash'
// import AppConfig from '../config'

import sugoGlobalConfigService from '../services/sugo-global-config.service'
import SugoProjectService from '../services/sugo-project.service'

/* --------------- Global --------------- */
const { DataTypes, DataType, Required } = Validates

class DecideParams extends Validator {
  @DataType(DataTypes.PRIM_STR)
  @Required()
  token = null

  @DataType(DataTypes.OBJ_A)
  @Required()
  path_names = null

  @DataType(DataTypes.PRIM_STR)
  @Required()
  version = null
}

/* --------------- To export --------------- */
export default class Desktop {

  static DecideChecker = new DecideParams()

  /**
   * 查询应用埋点信息,包括页面信息与事件列表
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<ResponseStruct>}
   */
  static async decide (token, path_names, version) {
    const valid = Desktop.DecideChecker.valid({ token, path_names, version })
    
    if (!passValid(valid)) {
      // 这里不转换为string也可以
      // ctx.body赋值时会处理json为string
      return Response.fail(mapValues(valid).join('\n'))
    }

    /* 返回值结构 */
    const result = {
      config: {
        enable_collect_everything: true
      },
      page_info: [],
      notifications: [],         // 页面提示
      web_event_bindings: []
    }

    //查看当期使用的时间绑定版本
    const versions = await db.AppVersion.findAll({
      where: {
        appid: token,
        app_version: version,
        status: 1
      }
    })

    let event_bindings_version = 0
    if (versions.length > 0) {
      event_bindings_version = versions[0].event_bindings_version
    }

    // 页面事件列表
    const events = await db.TrackEvent.findAll({
      where: {
        appid: token,
        app_version: version,
        event_bindings_version: event_bindings_version,
        $or: [
          { page: { $in: path_names } },
          { is_global: 'yes' }
        ]
      }
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

    // 页面参数设置
    const pages = await db.SugoSDKPageInfo.findAll({
      where: {
        appid: token,
        page: {
          $in: path_names
        },
        app_version: version,
        event_bindings_version: event_bindings_version
      },
      raw:true
    })
    
    const pageInfo = pages.map(p => {
      let item = { isSubmitPoint: submitClickPoint && p.is_submit_point, ..._.omit(p, 'is_submit_point') }
      if (!item.code) return _.omit(item, 'code')
      return item
    })

    result.web_event_bindings = events
    result.page_info = pageInfo

    return Response.ok(result)
  }
}
