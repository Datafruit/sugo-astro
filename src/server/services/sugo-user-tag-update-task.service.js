import {BaseService} from './base.service'
import conf from '../config'
import FetchKit from '../utils/fetch-kit'
import {getProjectById} from './sugo-project.service'
import {getLookupInfo, getUserGroupById} from './segment.service'
import _ from 'lodash'
import db from '../models'
import {UserTagUpdateTaskUpdateStrategyEnum} from '../../common/constants'
import {log} from '../utils/log'
import RedisSchedule from './redis-schedule.service'

const pioUserGroupUrl = conf.pioUserGroupUrl
const hproxy = conf.uindex.hproxy
const hproxyFirstUrl = hproxy.split(',')[0]

let _inst = null

function getJobKey(id) {
  return `user-tag-update-by-usergroup-recompure-${id}`
}

/**
 * 标签定时更新任务 crud 服务
 */
export default class SugoUserTagUpdateTaskServ extends BaseService {
  constructor() {
    super('SugoUserTagUpdateTask')
  }

  static getInstance() {
    if (!_inst) {
      _inst = new SugoUserTagUpdateTaskServ()
    }
    return _inst
  }

  /**
   ##  为用户分群的数据更新标签
   - `/ant/tag/batchUpdate`
   **基本信息**
   接口说明: 为用户分群的数据更新标签
   请求方式:POST
   请求地址:`/ant/tag/batchUpdate`
   响应类型:application/json
   数据类型:application/json
   url请求参数: 无
   body参数:

   参数名 | 是否必须 | 类型 | 描述  | 默认值
   ---- | ----- | --- | --- | ----
   hproxy | 是 | string | 表示向hproxy服务请求的更新地址 |
   dataSource | 是 | string | 表示要更新的数据源 |
   primaryColumn | 是 | string | 表示数据源的主键列名 |
   userGroupConfig | 是 | object | 表示用户分群的redis配置 |
   dimData | 是 | object | 表示要更新的标签维度值 |
   appendFlags | 否 | object | 表示是否是追加操作,仅对多值列有效|

   * @param taskId
   * @returns {Promise<void>}
   */
  async runTask(taskId) {
    let task = await this.__model.findById(taskId)
    if (!task) {
      throw new Error('没找到任务')
    }
    const clearCurrentTagOldData = _.get(task,'dataValues.params.clearCurrentTagOldData') 

    let proj = await getProjectById(task.project_id)
    if (!proj) {
      throw new Error('没找到关联的项目')
    }
    let ug = await getUserGroupById(_.get(task.params, 'userGroupId'))
    if (!ug) {
      throw new Error('没找到关联的用户群')
    }

    let dimData = _(task.params).chain().get('userTagUpdates', [])
      .keyBy(u => u.tagName)
      .mapValues(u => _.isArray(u.targetValue) ? u.targetValue.join(',') : u.targetValue)
      .value()

    //仅当clearCurrentTagOldData为true才触发
    if ( clearCurrentTagOldData && !_.isUndefined(dimData) ) {
      let dataArr = Object.keys(dimData)
      let res = await FetchKit.post(`${hproxyFirstUrl}/druid/proxy/clean/${proj.tag_datasource_name}`, dataArr, {
        handleResponse: (response) => {
          return response.text()
        }
      })
      if (res === 500){
        throw new Error('清除旧数据失败')
      }
    }
    
    let res = await FetchKit.post(`${pioUserGroupUrl}/ant/tag/usergroup/batchUpdate`, {
      hproxy: hproxy.replace(/http:\/\//g, ''),
      dataSource: proj.tag_datasource_name,
      primaryColumn : ug.params.groupby,
      userGroupConfig : getLookupInfo(ug).dataConfig,
      dimData: dimData,
/*    appendFlags: {
        "s_test2":false,
        "mi_testmi":false
      }*/
    })
    task.recent_run_at = new Date()
    await task.save()
    return res
  }

  doRerun = async (jobInfo) => {
    return await this.runTask(jobInfo.data)
  }

  async initSingleUserTagUpdateTask(dbUserTagUpdateTask) {
    let cronExpression = _.get(dbUserTagUpdateTask, 'params.cronInfo.cronExpression')
    if (!cronExpression) {
      console.warn(`UserTag update task ${dbUserTagUpdateTask.title} has no cronExpression`)
      return
    }
    log('add UserTag update task => ', dbUserTagUpdateTask.title || dbUserTagUpdateTask.id)
    // cron:
    // 0 */n * * * * // 每隔n分钟
    // 0 0 */ * * *  // 每隔n小时
    try {
      await RedisSchedule.getInstance().addJob(getJobKey(dbUserTagUpdateTask.id), {
        // every: '20 seconds',
        cron: `${cronExpression}`,
        path: './sugo-user-tag-update-task.service',
        func: 'doRerun',
        data: dbUserTagUpdateTask.id,
        counter: 0
      })
    } catch (e) {
      console.error(e)
    }
  }

  async removeSingleUserTagUpdateTask(dbTask) {
    try {
      await RedisSchedule.getInstance().cancelJob(getJobKey(dbTask.id))
    } catch (e) {
      console.error(e)
    }
  }

  async initAutoUpdateUserTagTask() {
    // PM2 cluster模式只启动一次定时任务
    const clusterId = process.env.NODE_APP_INSTANCE || 0
    if (+clusterId !== 0) {
      return
    }

    // 只有 params.updateStrategy === UserTagUpdateTaskUpdateStrategyEnum.Interval 才加入定时任务
    // 用户取消该设置/删除分群时需要移除定时任务
    let preAddTaskUgs = await this.__model.findAll({
      where: {
        'params.updateStrategy': UserTagUpdateTaskUpdateStrategyEnum.Interval
      },
      raw: true
    })

    for (let dbUg of preAddTaskUgs) {
      await this.initSingleUserTagUpdateTask(dbUg)
    }
  }
}
