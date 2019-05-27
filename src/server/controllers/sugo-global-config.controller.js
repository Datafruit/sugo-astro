import sugoGlobalConfig from '../services/sugo-global-config.service'
import { Response } from '../utils/Response'
import Storage from '../services/public-redis-storage.service'
import db from '../models'
import { AccessDataType } from '../../common/constants'
import SugoTrackEventService from '../services/sugo-track-event.service'
import _ from 'lodash'

async function setSdkGlobalConfig(ctx) {
  const { config } = ctx.q
  const oldData = await sugoGlobalConfig.getInstance().findOne({key: 'sdk_submit_click_point'})
  for (let index = 0; index < config.length; index++) {
    let p = config[index]
    const [result, isCreate] = await sugoGlobalConfig.getInstance().findOrCreate(
      { key: p.key },
      { value: p.val.toString(), key: p.key },
    )
    if (!isCreate) {
      await sugoGlobalConfig.getInstance().update(
        { value: p.val.toString(), key: p.key },
        { key: p.key }
      )
    }
  }
  // 修改配送  删除所有sdk接入项目维度缓存
  const projects = await db.SugoProjects.findAll({
    where: {
      access_type: AccessDataType.SDK
    },
    raw: true
  })
  
  const submitClickPoint =  _.get(config.find(p => p.key === 'sdk_submit_click_point') || {}, 'val', '0')

  if(_.get(oldData, 'value', '0') !== submitClickPoint) {
    //批量更新sdkVersion
    await new SugoTrackEventService().updataConfigDeploy(
      projects
      .filter(p => _.get(p, 'extra_params.sdk_submit_click_point', '0') === '1')
      .map(p => p.id)
    )
  }

  for (let index = 0; index < projects.length; index++) {
    await Storage.SDKDimension.del(projects[index].id)
    await Storage.DesktopDecide.delByProjectId(projects[index].id)
  }

  return ctx.body = Response.ok('设置成功')
}

async function getSdkGlobalConfig(ctx) {
  const res = await sugoGlobalConfig.getInstance().findAll({ key: { $or: ['sdk_position_config', 'sdk_ban_report', 'sdk_submit_click_point'] } })
  return ctx.body = Response.ok(res)
}

export default {
  setSdkGlobalConfig,
  getSdkGlobalConfig
}
