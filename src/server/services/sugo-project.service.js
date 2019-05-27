/**
 * @file 项目相关服务，如创建、暂停、启动、禁用、删除
 */
import CONFIG from '../config'
import short_id from '../models/safe-id'
import _ from 'lodash'
import db from '../models'
import {
  AccessDataType,
  DataSourceType,
  DIMENSION_TYPES,
  PLATFORM,
  ProjectState,
  ProjectStatus
} from '../../common/constants'
// ## Constants
import {MYSQL_DIMENSIONS, SDK_DIMENSIONS} from '../constants/druid-constant'
import SupervisorService from './druid-supervisor.service'
import DatasourceService from './sugo-datasource.service'
import RealUserTableService from './real-user-table.service'
import UindexDataSourceService from '../services/uindex-datasource.service'
// ## Util
import {defineTypes, PropTypes} from '../../common/checker'
import {Response} from '../utils/Response'
// import config from '../config'
import FetchKit from '../utils/fetch-kit'
import SugoChildProjectsService from './sugo-child-projects.service'

const { projectCapacity, taskScheduleHost } = CONFIG

// ==
// TODO 接口测试
//

const $checker = {
  create: defineTypes({
    company_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    datasource_id: PropTypes.string.isRequired,
    datasource_name: PropTypes.string.isRequired,
    props: PropTypes.object.isRequired
  }),
  setStatusScheduler: defineTypes({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf([
      ProjectStatus.Show,
      ProjectStatus.Hide
    ])
  }),
  setStateScheduler: defineTypes({
    id: PropTypes.string.isRequired,
    state: PropTypes.oneOf([
      ProjectState.Activate,
      ProjectState.Disable
    ]),
    scheduler: PropTypes.func
  }),
  findOne: defineTypes({
    id: PropTypes.string.isRequired
  }),
  findOneByName: defineTypes({
    name: PropTypes.string.isRequired,
    company_id: PropTypes.string.isRequired
  }),
  findOneByDatasourcename: defineTypes({
    datasource_name: PropTypes.string.isRequired,
    company_id: PropTypes.string.isRequired
  }),
  findOneSugoDatasourcesByname: defineTypes({
    datasource_name: PropTypes.string.isRequired,
  }),
  findByDataSource: defineTypes({
    dataSource: PropTypes.string.isRequired
  }),
  findByDataSourceId: defineTypes({
    datasource_id: PropTypes.string.isRequired
  }),
  update: defineTypes({
    id: PropTypes.string.isRequired,
    props: PropTypes.object.isRequired
  }),
  associateRealUserTable: defineTypes({
    project_id: PropTypes.string.isRequired,
    user_table_id: PropTypes.string.isRequired
  })
}

export const getProjectById = async (id) => {
  return await db.SugoProjects.findById(id)
}
export async function getProjectsByDataSourceIds(dsIds) {
  const res = await db.SugoProjects.findAll({
    where: {
      datasource_id: {$in: dsIds}
    },
    raw: true
  })
  let dict = _.keyBy(res, 'datasource_id')
  return dsIds.map(dsId => dict[dsId])
}

export async function getProjectsByDataSourceNames(dsNames) {
  const res = await db.SugoProjects.findAll({
    where: {
      datasource_name: {$in: dsNames}
    },
    raw: true
  })
  let dict = _.keyBy(res, 'datasource_name')
  return dsNames.map(dsName => dict[dsName])
}

const Service = {

  /**
   * 检查项目容量
   * 查看 http://overlord IP:8090/druid/indexer/v1/supervisor supervisor数量， 对比配置中的projectCapacity
   * 如果达到容量上限，提醒用户
   */
  async checkProjectCapacity () {
    let arr = await SupervisorService.getActiveSupervisor()
    if (arr.length >= projectCapacity) {
      throw new Error(`已经达到druid服务项目上限:${projectCapacity}, 请先关闭其他项目，再尝试创建或者运行项目`)
    }
  },

  //创建子项目
  async createChildProject (company_id, user_id, parentId, filter, name, SugoRoles) {
    let proj = await db.SugoProjects.findOne({
      where: {
        company_id,
        id: parentId
      },
      raw: true
    })
    if (!proj) {
      return {
        error: '项目不存在',
        code: 404
      }
    }

    //子项目定义
    proj = _.omit(proj, ['created_at', 'updated_at'])

    //子数据源
    let parentDatasourceId = proj.datasource_id
    let datasource = await db.SugoDatasources.findOne({
      where: {
        company_id,
        id: parentDatasourceId
      }
    })
    if (!datasource) {
      return {
        error: '数据源不存在',
        code: 404
      }
    }

    let childProj = await db.client.transaction(async transaction => {

      //创建子项目
      let sameNameProj = await db.SugoProjects.findOne({
        where: {
          name: name
        },
        raw: true,
        transaction
      })
      
      let sameNameChildProj = await db.SugoChildProjects.findOne({
        where: {
          name: name
        },
        raw: true,
        transaction
      })
      if (sameNameProj || sameNameChildProj) {
        return {
          error: `保存失败，重复的项目名称【${name}】`,
          code: 400
        }
      }
      const role_ids = SugoRoles.map(i => i.id).filter(_.identity)
      return await db.SugoChildProjects.create({
        name: name,
        project_id: parentId,
        status: proj.status,
        role_ids, //默认只授权当前用户所在用户组
        params: {
          filters: _.get(filter, 'filters')
        },
        created_by: user_id,
        updated_by: user_id
      }, {transaction})
    })
    if (childProj.error) return childProj
    return {
      ...proj,
      created_at: childProj.created_at,
      updated_at: childProj.updated_at,
      id: childProj.id,
      name: childProj.name,
      status: childProj.status,
      filter: childProj.params,
      parent_id: proj.id,
      parentName: proj.name
    }
  },
  // 删除项目下属的任务
  async deleteTaskOfProject (id) {
    const url = `${taskScheduleHost}/api/manager?treeOperation=deleteRefProjects&refProjectId=${id}`
    let resp = await FetchKit.post(url)
    if (resp.status !== 'success') {
      throw new Error(resp.message)
    }
  },
  async deleteChildProject(childProj) {
    return await db.SugoChildProjects.destroy({
      where: {
        id: childProj.id
      }
    })
  },
  async deleteProj (project, deleteDataOnly = false, transaction = null) {
    // 1. 删除所有关联关系
    // 2. 删除所有维度
    // 3. 删除所有表
    // 4. 删除项目
    let opt = transaction ? {transaction} : {}
    return await db.client.transaction(opt, async (transaction) => {
      const { datasource_id, datasource_name, id: project_id, company_id, tag_datasource_name, access_type } = project
      // 有关联关系，需要先删除依赖
      await db.SugoCustomOrders.destroy({ where: { druid_datasource_id: datasource_id }, transaction })

      await db.Segment.destroy({ where: { 
        $or: [{
          druid_datasource_id: datasource_id 
        }, {
          params: { relatedUserTagProjectId: project_id }
        }, {
          params: { relatedBehaviorProjectId: project_id }
        }]
      }, transaction })

      await db.SegmentExpand.destroy({ where: { datasource_id }, transaction })
      let ins = await db.Slices.findAll({
        where: { druid_datasource_id: datasource_id },
        transaction
      })
      let slices_ids = ins.map(i => i.id)
      // 单图相关的删除
      // RoleSlice
      // SugoSubscribe
      // DashboardSlices
      if (slices_ids.length > 0) {
        let q = {
          where: {
            slice_id: {
              $in: slices_ids
            }
          },
          transaction
        }
        await db.SugoOverview.destroy(q)
        await db.SugoRoleSlice.destroy(q)
        await db.SugoSubscribe.destroy(q)
        await db.DashboardSlices.destroy(q)
      }

      //删除画像
      let gallerys = await db.SugoGallery.findAll({
        where: {
          parent_id: project_id,
          company_id
        },
        transaction
      })

      if (gallerys.length) {
        let gdis = gallerys.map(g => g.id)
        await db.SugoGalleryFrame.destroy({
          where: {
            parent_id: {
              $in: gdis
            }
          },
          transaction
        })
        await db.SugoRoleGalleries.destroy({
          where: {
            gallery_id: {
              $in: gdis
            },
            company_id
          },
          transaction
        })
        await db.SugoGallery.destroy({
          where: {
            parent_id: project_id,
            company_id
          },
          transaction
        })
      }

      //删除路径分析
      await db.PathAnalysis.destroy({
        where: { datasource_id },
        transaction
      })

      //标签分类
      await db.TagType.destroy({
        where: { datasource_id },
        transaction
      })

      //组合标签
      await db.TagGroup.destroy({
        where: { datasource_id },
        transaction
      })

      // 删除场景数据
      await db.SugoSceneData.destroy({ where: { project_id }, transaction })
      // 删除rfm
      await db.SugoRFM.destroy({ where: { project_id }, transaction })

      await db.Slices.destroy({ where: { druid_datasource_id: datasource_id }, transaction })

      //看板
      let dashbs = await db.Dashboards.findAll({
        where: {
          datasource_id
        },
        transaction
      })
      await db.SugoRoleDashboard.destroy({
        where: {
          dashboard_id: {
            $in: dashbs.map(d => d.id)
          }
        },
        transaction
      })
      await db.Dashboards.destroy({ where: { datasource_id }, transaction })

      await db.SugoDimensions.destroy({ where: { parentId: datasource_id }, transaction })

      await db.SugoMeasures.destroy({ where: { parentId: datasource_id }, transaction })

      await db.SugoFunnels.destroy({ where: { druid_datasource_id: datasource_id }, transaction })

      await db.SugoRetentions.destroy({ where: { druid_datasource_id: datasource_id }, transaction })

      //告警
      let qalarms = {
        where: { project_id },
        transaction
      }
      let alarms = await db.SugoMonitorAlarms.findAll(qalarms)

      let alarmIds = alarms.map(f => f.id)

      await db.SugoMonitorAlarmsExceptions.destroy({
        where: {
          monitor_id: {
            $in: alarmIds
          }
        },
        transaction
      })
      await db.SugoMonitorAlarms.destroy(qalarms)

      // 1. 该项目下的所有表
      const analysis = await db.SugoDataAnalysis.findAll({
        where: { project_id },
        transaction
      })
      const analysis_ids = analysis.map(an => an.id)

      if (analysis_ids.length > 0) {
        //删除TrackEvent
        await db.TrackEvent.destroy({ where: { appid: { $in: analysis_ids } }, transaction })
        await db.TrackEventDraft.destroy({ where: { appid: { $in: analysis_ids } }, transaction })
        // 删除版本
        await db.AppVersion.destroy({ where: { appid: { $in: analysis_ids } }, transaction })
        // 删除所有维度
        await db.SugoDimensionsHBase.destroy({ where: { analysis_id: { $in: analysis_ids } }, transaction })
        // 删除关联联系
        await db.SugoAnalysisAssociate.destroy({ where: { analysis_id: { $in: analysis_ids } }, transaction })
        // 删除所有表
        await db.SugoDataAnalysis.destroy({ where: { project_id }, transaction })
      }

      // 删除项目
      const res = await db.SugoProjects.destroy({ where: { id: project_id, company_id }, transaction })

      if (res < 0) {
        return { success: false, model: project_id }
      }

      // 该项目还没有创建task
      if (!project.datasource_id) {
        return { success: true, model: project_id }
      }

      await db.SugoDatasources.destroy({
        where: { id: datasource_id, company_id },
        transaction
      })

      let del_res = false
      if (deleteDataOnly) return { success: true, model: project_id }

      // 如果数据源名称跟标签数据源名称相同则表示为单纯的画像项目，不做删除tindex操作
      const canDeleteTindexSupervisor = CONFIG.druid.host !== CONFIG.uindex.host && datasource_name !== tag_datasource_name

      try {
        if (canDeleteTindexSupervisor) {
          //删除kafka topic //停task
          await SupervisorService.shutdownSupervisor(datasource_name)
        }
      } catch (e) {
        // 不存在，则认为关闭成功
        // 否则认为操作失败
        if (e.message.indexOf('does not exist') === -1) {
          throw e
        }
      }
      try {
        // 如果数据源名称跟标签数据源名称相同则表示为单纯的画像项目，不做删除tindex操作
        if (canDeleteTindexSupervisor) {
          // 删除supervisor对应topic
          del_res = await DatasourceService.deleteTopic(datasource_name)
        }
        // 没有任务调度菜单不做删除调度信息操作
        if (_.flatMap(CONFIG.site.menus, m => _.map(m.children, p => p.path)).includes('/console/task-schedule-manager')) {
          // 有调度任务权限目前分为两种情况：标签项目
          // if (tag_datasource_name || access_type === AccessDataType.MYSQL) {
          if (project.access_type === AccessDataType.Tag) {
            // 删除任务调度记录
            await this.deleteTaskOfProject(project_id)
          }
        }
        // 删除uindex表操作
        if (project.access_type === AccessDataType.Tag) {
          // 删除标签计算管理记录
          await db.SugoTagHql.destroy({where: { project_id }, transaction})
          // 删除标签体系管理
          await db.SugoTagTypeTree.destroy({where: { datasource_id }, transaction})
          // 删除任务调度->概览->关联标签表
          await UindexDataSourceService.getInstance().removeFore(tag_datasource_name)
        }
      } catch (e) {
        // 不存在，则认为删除成功
        // 否则认为操作失败
        if (e.message.indexOf('does not exist') === -1) {
          del_res = false
          throw e
        }
      }

      return { success: !!del_res, model: project_id }
    })

  },

  generateProjectName (company_id, datasType = DataSourceType.Tindex, id ) {
    return `${datasType === DataSourceType.Uindex ? 'uindex' : 'tindex'}_${company_id}_project_${id || short_id()}`
  },

  createDBTransaction (sequelize, callback) {
    return sequelize.transaction().then(callback)
  },

  /**
   * 根据 platform 生成对应的维度
   * @param {Array<Object>} dimensions
   * @param {String} platform
   * @return {Array<Object>}
   */
  generateAccessDimensions (dimensions, platform) {
    if (!_.isArray(dimensions) || dimensions.length === 0)
      return dimensions

    let translate_dimensions
    if (platform === PLATFORM.MOBILE) { //sdk android、ios创建初始化维度
      translate_dimensions = SDK_DIMENSIONS.map(dim => {
        const val = dim[2] || 2 //default is string
        const type = _.reduce(DIMENSION_TYPES, (result, value, key) => {
          if (value === val) {
            result = key
          }
          return result
        }, DIMENSION_TYPES['string'])
        return { name: dim[0], title: dim[1], type: type }
      })
      //[...Array(100).keys()]
      const customDimensions = new Array(100).fill(1).map((o, idx) => {//创建100个自定义维度
        return { name: `CS${idx + 1}`, type: DIMENSION_TYPES['string'] }
      })
      translate_dimensions = translate_dimensions.concat(customDimensions)
    } else if (platform === PLATFORM.MYSQL) {
      translate_dimensions = dimensions.map(dim => {
        return { name: dim.name, type: dim.type }
      })
      translate_dimensions = translate_dimensions.concat(
        MYSQL_DIMENSIONS.map((dim) => {
          return { name: dim, type: DIMENSION_TYPES['string'] }
        })
      )
    } else if (platform === PLATFORM.SINGLE) {
      translate_dimensions = dimensions.slice(0)
    } else {
      return []
    }
    if (!translate_dimensions || translate_dimensions.length === 0) {
      return translate_dimensions
    }

    return translate_dimensions.map(dim => {
      return { name: dim.name, type: dim.type, role_ids: dim.role_ids || [] }
    })
  },

  /**
   * 复制不同项目之间的事件列表
   */
  async copyProjectEvnts({ targetRecord, currentRecord }) {
    /*
     "targetRecord": {
     "projectId": "Byl9o2guOx",
     "analysisId": "37e7f496106f22aedede1676c4e77e15"
     "appVersion": "2.0.1"
     },
     "currentRecord": {
     "projectId": "H1gjQOVPOg",
     "analysisId": "8e554051ee380924eb143ad6008298ce",
     "accessType": 2,
     "projectName": "SDKTest",
     "analysisName": "Web【web】",
     "appVersion" : "1.0"
     }
     */

    const { analysisId: targetAppid } = targetRecord
    const { analysisId: currentAppid, appVersion: currentAppVersion } = currentRecord
    // 目标版本为空就保持与源版本一致
    let targetAppVersion = targetRecord.appVersion || currentAppVersion
    const currentQuery = { appid: currentAppid, app_version: currentAppVersion } // app_version: app_version
    const targetQuery = { appid: targetAppid, app_version: targetAppVersion } // app_version: app_version

    return db.client.transaction(async t => {

      const transaction = { transaction: t }

      // 复制appVersion记录
      let existingAppVersion = await db.AppVersion.findOne({
        where: targetQuery,
        ...transaction
      })

      if (!existingAppVersion) {
        await db.AppVersion.create({
          ...targetQuery,
          event_bindings_version: 0,
          last_deployed_on: Date.now()
        }, transaction)
      }
      await this.copyRecordFromTrackEventDraftToTrackEvent(currentQuery, targetQuery, { targetAppid, targetAppVersion }, transaction)
      return true
    })
    // end transaction
  },

  async createProjectEvent({ targetRecord, sourceRecord }) {
    /*
     "sourceRecord": {
     "projectId": "Byl9o2guOx",
     "analysisId": "37e7f496106f22aedede1676c4e77e15"
     "appVersion": "2.0.1"
     },
     "targetRecord": {
     "projectId": "H1gjQOVPOg",
     "analysisId": "8e554051ee380924eb143ad6008298ce",
     "accessType": 2,
     "projectName": "SDKTest",
     "analysisName": "Web【web】",
     "appVersion" : "1.0"
     }
     */
    const {
      //projectId: sProjectId,
      analysisId: sAnalysisId,
      appVersion: sAppVersion
    } = sourceRecord
    const {
      //projectId: tProjectId,
      analysisId: tAnalysisId,
      appVersion: tAppVersion
    } = targetRecord

    const sourceQuery = { appid: sAnalysisId, app_version: sAppVersion }
    const targetQuery = { appid: tAnalysisId, app_version: tAppVersion }

    let existingAppVersion = await db.AppVersion.findOne({
      where: targetQuery
    })

    if (existingAppVersion) {
      return false

    }

    return db.client.transaction(async t => {
      const transaction = { transaction: t }
      await db.AppVersion.create({
        ...targetQuery,
        event_bindings_version: 0,
        last_deployed_on: Date.now()
      }, transaction)

      await this.copyRecordFromTrackEventDraftToTrackEvent(sourceQuery, targetQuery, { targetAppid: tAnalysisId, targetAppVersion: tAppVersion }, transaction)
      return true
    })//end transaction
  },

  /**
   * 创建项目
   * @param company_id
   * @param name
   * @param datasource_id
   * @param datasource_name
   * @param props
   * @param [transaction]
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async create(company_id, name, datasource_id, datasource_name, props, transaction){
    const checked = $checker.create({
      company_id,
      name,
      datasource_id,
      datasource_name,
      props
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const defaults = {
      ...props,
      name,
      company_id,
      datasource_id,
      datasource_name
    }

    const [ins] = await db.SugoProjects.findOrCreate({
      where: {
        company_id,
        name
      },
      defaults,
      transaction
    })

    return Response.ok(ins.get({ plain: true }))
  },

  /**
   * @param {Object} filter
   * @return {Promise.<Array<Object>>}
   */
  async query(filter){
    if (!filter.hasOwnProperty('limit')) {
      filter = { ...filter, limit: 999 }
    }
    const records = await db.SugoProjects.findAll(filter)
    return records.map(ins => ins.get({ plain: true }))
  },

  /**
   * 查找单条记录
   * @param {String} id
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async findOne(id){
    const checked = $checker.findOne({ id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoProjects.findOne({ where: { id } })
    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  },

  /**
   * @param {String} name
   * @param {String} company_id
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async findOneByName(name, company_id){
    const checked = $checker.findOneByName({ name, company_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoProjects.findOne({
      where: {
        company_id,
        name
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  },

   async findOneByDatasourcename(datasource_name, company_id){
    const checked = $checker.findOneByDatasourcename({ datasource_name, company_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoProjects.findOne({
      where: {
        company_id,
        datasource_name
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  },

  async findOneSugoDatasourcesByname(datasource_name) {
      const checked = $checker.findOneByDatasourcename({
        datasource_name
      })

      if (!checked.success) {
        return Response.fail(checked.message)
      }
      const ins = await db.SugoDataSources.findOne({
      where: {
        name: datasource_name
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')

  },

  /**
   * 更新記錄
   * @param {String} id
   * @param {Object} props
   * @return {Promise.<ResponseStruct<Object>>}
   */
  async update(id, props){
    const checked = $checker.update({ id, props })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const [affectedCount] = await db.SugoProjects.update(props, {
      where: {
        id
      }
    })

    return affectedCount > 0 ? Response.ok(props) : Response.fail('操作失败')
  },

  /**
   * 查询一条记录
   * @param id
   * @return {Promise.<ResponseStruct>}
   */
  async info(id){
    const records = await this.query({ where: { id }, limit: 1 })
    return Response.ok(records[0] || null)
  },

  /**
   * 更新项目状态
   * @param id
   * @param status
   * @param datasource_id
   * @return {Promise.<ResponseStruct>}
   */
  async setStatus(id, status, datasource_id) {
    const res = new Response()
    try {
      await db.client.transaction(async transaction => {
        // 1. 更新数据源对应状态
        await db.SugoDatasources.update(
          { status },
          {
            where: {
              id: datasource_id
            },
            transaction
          }
        )
        // 2. 更新项目对应状态
        await db.SugoProjects.update(
          { status },
          {
            where: {
              id: id
            },
            transaction
          }
        )
      })
    } catch (e) {
      res.message = e.message
    }

    return res.serialize()
  },

  /**
   * 使用datasource_name查询项目记录
   * @param {String} dataSource
   * @return {Promise.<ResponseStruct>}
   */
  async findByDataSource(dataSource){
    const checked = $checker.findByDataSource({ dataSource })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoProjects.findOne({
      where: {
        datasource_name: dataSource
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('记录不存在')
  },

  /**
   * 使用datasource_id查找数据源
   * @param {string} datasource_id
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async findByDataSourceId(datasource_id) {
    const checked = $checker.findByDataSourceId({ datasource_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoProjects.findOne({
      where: {
        datasource_id
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('记录不存在')
  },

  /**
   * <h3>更新项目状态并执行一个调度程序</h3>
   * <p>如果 scheduler 返回的状态为false，则直接返回</p>
   * <p>如果为true，则更新项目状态</p>
   * @param {string} id
   * @param {Number} status
   * @return {Promise.<ResponseStruct>}
   */
  async setStatusScheduler(id, status){

    const checked = $checker.setStatusScheduler({ id, status })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const info = await this.info(id)
    const record = info.result

    if (!record) {
      // 操作子项目
      let childProj = await SugoChildProjectsService.getInstance().findOne({ id })
      if (childProj) {
        await SugoChildProjectsService.getInstance().update({ status }, { id })
        return Response.ok(childProj)
      }
      return Response.fail('未找到记录')
    }

    if (record.status === status) {
      return Response.ok(record)
    }

    const rs = await this.setStatus(id, status, record.datasource_id)

    return rs.success ? Response.ok(record) : Response.fail(rs.message)
  },

  /**
   * 显示项目，项目可以在界面上显示
   * @param id
   * @return {Promise.<*|Promise.<ResponseStruct>>}
   */
  async show(id){
    return await this.setStatusScheduler(id, ProjectStatus.Show)
  },

  /**
   * 隐藏项目，项目在界面上隐藏
   * @param id
   * @return {Promise.<*|Promise.<ResponseStruct>>}
   */
  async hide(id){
    return await this.setStatusScheduler(id, ProjectStatus.Hide)
  },

  /**
   * @callback Scheduler
   * @param {Object} record
   * @return {Promise.<ResponseStruct>}
   */

  /**
   * 设置项目的state状态
   * @param id
   * @param state
   * @param {Scheduler} scheduler
   * @return {Promise.<ResponseStruct>}
   */
  async setStateScheduler(id, state, scheduler){
    const checked = $checker.setStateScheduler({ id, state, scheduler })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const pRes = await this.findOne(id)
    if (!pRes.success) return pRes

    const project = pRes.result
    if (project.state === state) return Response.ok(project)

    const sRes = await scheduler(project)
    if (!sRes.success) return sRes

    let res = new Response()
    try {
      await db.SugoProjects.update({ state }, {
        where: {
          id: id
        }
      })
      res.result = { id }
    } catch (e) {
      res.message = e.message
    }

    return res.serialize()
  },

  /**
   * 禁用项目，停掉task，不能再上报数据
   * @param id
   * @return {Promise.<ResponseStruct>}
   */
  async disable(id) {
    return await this.setStateScheduler(id, ProjectState.Disable, async (record) => {
      return await DatasourceService.shutdownSupervisor(record.datasource_name)
    })
  },

  /**
   * 启用项目，开启task，可继续接收数据
   * @param id
   * @return {Promise.<ResponseStruct>}
   */
  async activate(id) {
    await this.checkProjectCapacity()
    return await this.setStateScheduler(id, ProjectState.Activate, async (record) => {
      return await DatasourceService.runSupervisor(record)
    })
  },

  /**
   * 使用sdk发送过来的token查询对应的项目。
   * 返回token对应的project信息对象
   * @param {string} token
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async getInfoWithSDKToken(token){
    const checked = PropTypes.string.isRequired({ token }, 'token')
    if (!checked.success) return Response.fail(checked.message)

    // `token`为`sugo_data_analysis`表中的`id`
    // 检测`token`对应的`project`记录是否存在

    const sql = `SELECT project.* 
      FROM sugo_projects AS project, sugo_data_analysis AS analysis
      WHERE analysis.id =:token
      AND analysis.project_id = project.id`

    const ret = await db.client.query(sql, {
      replacements: { token },
      type: db.client.QueryTypes.SELECT
    })

    const record = ret[0]

    return record ? Response.ok(record) : Response.fail('未找到记录')
  },

  async copyRecordFromTrackEventDraftToTrackEvent(currentQuery, targetQuery, { targetAppid, targetAppVersion }, transaction) {
    // 1.复制事件草稿表记录
    let total = await db.TrackEventDraft.count({ where: currentQuery, ...transaction })
    let offset = 0 //分页起始位置
    let limit = 100 // 每页处理条数
    if (total > 0) {
      //删除之前数据，避免重复
      await db.TrackEventDraft.destroy({
        where: targetQuery,
        ...transaction
      })
    }
    let pagination
    do {
      pagination = { offset, limit }
      let currentEventDrafts = await db.TrackEventDraft.findAll({ where: currentQuery, ...pagination, ...transaction })
      // 更appid, id
      currentEventDrafts = currentEventDrafts.map((row) => {
        let draft = row.get({ plain: true })
        delete draft.id
        delete draft.changed_on
        draft.appid = targetAppid
        draft.app_version = targetAppVersion
        //清空tags
        draft.tags = []
        return draft
      })
      if (currentEventDrafts && currentEventDrafts.length > 0) {
        await db.TrackEventDraft.bulkCreate(currentEventDrafts, transaction)
      }
      offset += currentEventDrafts.length || limit
    } while (offset < total)

    // 2.复制浏览页面参数设置表记录
    total = await db.SugoSDKPageInfoDraft.count({ where: currentQuery, ...transaction })
    offset = 0 //分页
    limit = 100
    if (total > 0) {
      //删除之前数据，避免重复
      await db.SugoSDKPageInfoDraft.destroy({
        where: targetQuery,
        ...transaction
      })
    }
    do {
      pagination = { offset, limit }
      let currentPageInfos = await db.SugoSDKPageInfoDraft.findAll({ where: currentQuery, ...pagination, ...transaction })
      currentPageInfos = currentPageInfos.map((row) => {
        let info = row.get({ plain: true })
        delete info.id
        delete info.changed_on
        info.appid = targetAppid
        info.app_version = targetAppVersion
        //清空tags
        info.tags = []
        return info
      })
      if (currentPageInfos && currentPageInfos.length > 0) {
        await db.SugoSDKPageInfoDraft.bulkCreate(currentPageInfos, transaction)
      }
      offset += currentPageInfos.length || limit
    } while (offset < total)
  },

  /**
   * @param {string} project_id
   * @param {string} real_user_table
   * @return {Promise.<ResponseStruct<{project_id:string, user_table_id:string}>>}
   */
  async associateRealUserTable(project_id, real_user_table) {
    const PRes = await this.findOne(project_id)
    if (!PRes.success) {
      return Response.fail(PRes.message)
    }

    const UTRes = await RealUserTableService.findOne(real_user_table, PRes.result.company_id)
    if (!UTRes.success) {
      return Response.fail(UTRes.message)
    }

    return this.update(project_id, { real_user_table })
  },

  /**
   * 标签接入-更新标签数据表名(tag_source_name) 字段
   * @param datasource_name 行为表数据表名 ( tindex table name)
   * @param project_id 项目表id
   * @param datasource_id 数据源表id
   * @return {Promise.<ResponseStruct>}
   */
  async saveTagSuorceName({tag_datasource_name, project_id, datasource_id, uindexSpec}, defaultDim) {
    const res = new Response()
    try {
      await db.client.transaction(async transaction => {

        // 默认创建通用类型的distinct_id标签维度（datasource_type='default_tag')
        await db.SugoDimensions.findOrCreate({
          where: {
            name: defaultDim.name,
            parentId: defaultDim.parentId,
            company_id: defaultDim.company_id
          }, //根据parentId和name去重严重
          defaults: defaultDim,
          transaction
        })

        // 1. 更新数据源对应字段
        await db.SugoDatasources.update(
          {
            tag_datasource_name,
            name: tag_datasource_name,
            tag_task_id: tag_datasource_name,
            supervisorJson: uindexSpec
          },
          {
            where: {
              id: datasource_id
            },
            transaction
          }
        )
        // 2. 更新项目对应字段
        await db.SugoProjects.update({
          tag_datasource_name,
          datasource_name: tag_datasource_name
        }, {
          where: {
            id: project_id
          },
          transaction
        })
      })
    } catch (e) {
      console.log(e.stack)
      if (e.sql) {
        console.log('ERROR SQL =>', e.sql)
      }
      res.message = e.message
    }
    return res.serialize()
  },

  // 查询配置
  async supervisorConfig(param) {
    const { id, name } = param
    let localConfig = await db.SugoDatasources.findOne({
      where: { id },
      attributes: ['supervisorJson']
    })
    let originConfig = await SupervisorService.getSupervisorSpecInfo(name)

    if(originConfig && originConfig.length) {
      originConfig = _.filter(originConfig, item => item.spec.type !== 'NoopSupervisorSpec')
      _.orderBy(originConfig, ['version'], ['desc'])
    }
    
    return Response.ok({
      localConfig,
      originConfig: {
        supervisorJson: _.get(originConfig, '[0]', {}).spec || {}
      }
    })
  },

  async queryUindexSpec(param) {
    const { id } = param
    let localConfig = await db.SugoDatasources.findOne({
      where: { id },
      attributes: ['supervisorJson']
    })
    return Response.ok({
      localConfig
    })
  },

  async updateSupervisorConfig(param) {
    const { id , config } = param
    let resp = await db.SugoDatasources.update({
      supervisorJson: config
    }, {
      where: { id }
    })

    return resp
  },

  /**
 * 使用datasource_id查找数据源
 * @param {string} datasource_id
 * @return {Promise.<ResponseStruct<ProjectModel>>}
 */
  async findByTagName(tagName) {

    const ins = await db.SugoProjects.findOne({
      where:{
        access_type: AccessDataType.Tag,
        tag_datasource_name: tagName
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('记录不存在')
  },
  
  getProjectsByDataSourceIds
}

export default Service
