/**
 * Created by xj on 2/26/18.
 */
import { Response } from '../utils/Response'
import FisrtStartService from '../services/sugo-first-start-time.service'
import moment from 'moment'
import {getDataSourcesByIds} from '../services/sugo-datasource.service'


/**
 * @description 首次启动controller
 * @export
 * @class FisrtStartController
 */
export default class FisrtStartController {

  constructor() {
    this.fisrtStartService = FisrtStartService.getInstance()
  }

  /**
   * 获取项目昨天和今天累记设备数
   * @param {*} ctx
   */
  async getDeviceCountForCutv(ctx) {
    let { dsNames, dsIds } = ctx.q
    if (!dsNames) {
      let dataSources = await getDataSourcesByIds(dsIds)
      dsNames = dataSources.map(ds => ds.name)
    }
    const yesterEnd = moment().add(-1, 'd').endOf('d').toISOString()
    const todayEnd = moment().endOf('d').toISOString()
    const resyeter = await this.fisrtStartService.getDeviceCountByDatasourseName(dsNames, yesterEnd)
    const resto = await this.fisrtStartService.getDeviceCountByDatasourseName(dsNames, todayEnd)
    const res = [
      ...resyeter.map(p => ({datasource_name: p.datasource_name, yesterday_device_count: p.count, app_type: p.app_type})),
      ...resto.map(p => ({datasource_name: p.datasource_name, today_device_count: p.count, app_type: p.app_type}))
    ]
    return ctx.body = Response.ok(res)
  }
}

