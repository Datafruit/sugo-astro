import { BaseService } from './base.service'
import moment from 'moment'
import _ from 'lodash'
import db from '../models'

export default class FirstStartTimeService extends BaseService {
  static instance = null

  constructor() {
    /** @see {Model} */
    super('SugoFirstStartTime')
    this.instance = null
  }

  /**
   * @return {FirstStartTimeService}
   */
  static getInstance() {
    if (FirstStartTimeService.instance === null) {
      FirstStartTimeService.instance = new FirstStartTimeService()
    }
    return FirstStartTimeService.instance
  }

  async getFirstStartTime(params) {
    const { app_type, device_id, app_version, channel = '', project_id } = params
    const [[res]] = await db.client.query(`select * from "sugo_${project_id}"
      where app_type = '${app_type}' and device_id = '${device_id}' limit 1`)
    if (!_.isEmpty(res)) {
      if (res.app_version !== app_version) {
        await db.client.query(`update "sugo_${project_id}"
        set app_version = '${app_version}'
        where app_type = '${app_type}' and device_id = '${device_id}' `)
      }
      return { isFirstStart: false, firstStartTime: moment(res.start_time) + 0 }
    }
    const now = moment().toISOString()
    await db.client.query(`insert into "sugo_${project_id}"(app_type,device_id,app_version, channel, start_time)
      values('${app_type}', '${device_id}', '${app_version}', '${channel}', '${now}') `)
    return { isFirstStart: true, firstStartTime: now }
  }

  async getDeviceCountByDatasourseName(dsNames, date = '' ) {
    let res = []
    for (let i = 0; i < dsNames.length; i++) {
      try {
        const [count] = await db.client.query(`select count(1) as count, app_type, '${dsNames[i]}' as datasource_name from "sugo_${dsNames[i]}" where start_time < '${date}' group by app_type`)
        res = res.concat(count)
      } catch (error) {
      }
    }
    return res
  }
}