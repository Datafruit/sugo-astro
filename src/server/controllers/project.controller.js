import _ from 'lodash'
import db from '../models'
import {
  returnResult,
  returnError,
  toJs
} from '../utils/helper'
import short_id from '../models/safe-id'
import CryptoJS from 'crypto-js'
import {
  AccessDataTableType,
  AccessDataOriginalType,
  ProjectStatus,
  ProjectState,
  DIMENSION_TYPES,
  DIMENSION_MAP,
  DIMENSION_TYPES_MINI_MAP,
  ACCESS_DATA_TASK_STATUS,
  AccessDataType,
  DataSourceType,
  UpdateTagSegmentType
} from '../../common/constants'

import ProjectService from '../services/sugo-project.service'
import SugoProjectService from '../services/sugo-project.service'
import SupervisorService from '../services/druid-supervisor.service'
import DatasourceService from '../services/sugo-datasource.service'
import SugoTrackEventService from '../services/sugo-track-event.service'
import DataAnalysisService from '../services/sugo-data-analysis.service'
import AccessDataTaskService from '../services/sugo-access-data-task'
import AnalysisHBaseService from '../services/sugo-data-analysis-hbase.service'
import UindexDatasourceService from '../services/uindex-datasource.service'

import {
  getDataSourcesWithPermissions
} from './sugo-datasources.controller'
import {
  defineTypes,
  PropTypes
} from '../../common/checker'
import { Response } from '../utils/Response'
import { Transform } from 'stream'
import DruidColumnType from '../../common/druid-column-type'
import config from '../config'
import Storage from '../services/public-redis-storage.service'
import kafka from 'kafka-node'
import SugoChildProjectsService from '../services/sugo-child-projects.service'

const DIMENSION_TYPES_INVERT = _.invert(DIMENSION_TYPES)

/**
 * @param {function} scheduler
 * @return {function(*=)}
 */
function setStatusScheduler(scheduler) {
  return async ctx => {
    const {
      project_id
    } = ctx.params
    const checked = PropTypes.string.isRequired({
      project_id
    }, 'project_id')

    if (!checked.success) {
      return returnResult(ctx, {
        success: false,
        model: [],
        message: checked.message
      })
    }

    const {
      company_id
    } = ctx.session.user

    const projects = await ProjectService.query({
      where: {
        id: project_id,
        company_id
      }
    })

    const record = projects[0]

    // Service 接口不会做权限判断，所以需要在controller中判定用户是否有操作权限
    if (!record) {
      return returnResult(ctx, {
        success: false,
        model: [],
        message: '未找到记录'
      })
    }

    let res = await scheduler({id: project_id})

    if (!res.success) {
      return returnResult(ctx, {
        success: false,
        model: [],
        message: res.message
      })
    }

    // 兼容之前的 createProjectStatusFactory
    // 需要返回所有的项目的id
    return returnResult(ctx, {
      success: true,
      model: [res.result.id],
      message: null
    })
  }
}

/**
 * 创建更新项目status函数
 * @param status
 * @return {function}
 */
function setStatusFactory(status) {
  return setStatusScheduler(async record => {
    const {
      id
    } = record
    let res
    switch (status) {
      case ProjectStatus.Show:
        res = await ProjectService.show(id)
        break
      case ProjectStatus.Hide:
        res = await ProjectService.hide(id)
        break
      default:
        res = Response.ok(record)
    }
    return res
  })
}

/**
 * 创建更新项目state函数
 * @param state
 * @return {*}
 */
function setStateFactory(state) {
  return setStatusScheduler(async record => {
    const {
      id
    } = record
    let res
    switch (state) {
      case ProjectState.Disable:
        res = await ProjectService.disable(id)
        break
      case ProjectState.Activate:
        res = await ProjectService.activate(id)
        break
      default:
        res = Response.ok(record)
    }
    return res
  })
}

const $checker = {
  create: defineTypes({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(_.values(AccessDataType))
  }),
  accessDataSource: defineTypes({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(_.values(AccessDataTableType)).isRequired,
    access_type: PropTypes.oneOf(_.values(AccessDataOriginalType)).isRequired,
    project_id: PropTypes.string.isRequired
  }),
  createSdk: defineTypes({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(_.values(AccessDataTableType)).isRequired,
    params: PropTypes.object.isRequired
  })
}

const Project = {

  /**
   * 创建项目，步骤如下
   * 1. 创建数据源记录
   * 2. 创建项目记录
   * @param ctx
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async create(ctx) {
    const checked = $checker.create(ctx.q)
    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }

    const {
      name,
      type
    } = ctx.q
    const {
      company_id,
      id: user_id
    } = ctx.session.user
    const res = await ProjectService.findOneByName(name, company_id)

    if (res.success) {
      return ctx.body = Response.fail('名称已存在')
    }

    let datasType = DataSourceType.Tindex
    if (type === AccessDataType.MySQL) {
      datasType = DataSourceType.MySQL
    } else if (type === AccessDataType.Tag) {
      datasType = DataSourceType.Uindex
    }

    const dataSource = ProjectService.generateProjectName(company_id, datasType)
    return ctx.body = await db.client.transaction(async transaction => {
      // 1. 插入数据源记录，并在数据源中记录接入类型，留待后用
      let res = await DatasourceService.createDataSource(
        ctx,
        dataSource,
        name, {},
        transaction,
        datasType,
        type === AccessDataType.Tag ? dataSource : undefined
      )

      if (!res.success) {
        return res
      }

      const { result: DataSource } = res
      if (AccessDataType.SDK === type) {
        const sql = `DROP TABLE IF EXISTS "public"."sugo_${DataSource.name}";
        CREATE TABLE "public"."sugo_${DataSource.name}" (
          "device_id" varchar(100) COLLATE "default" NOT NULL,
          "app_type" varchar(20) COLLATE "default",
          "app_version" varchar(50) COLLATE "default",
          "channel" varchar(50) COLLATE "default",
          "start_time" timestamptz(15)
        )
        WITH (OIDS=FALSE);
        ALTER TABLE "public"."sugo_${DataSource.name}" ADD PRIMARY KEY ("device_id");
        CREATE INDEX "sugo_${DataSource.name}_index_app_type" ON "public"."sugo_${DataSource.name}" USING btree ("app_type");
        CREATE INDEX "sugo_${DataSource.name}_index_app_version" ON "public"."sugo_${DataSource.name}" USING btree ("app_version");
        `
        await db.client.query(sql, { transaction })
      }

      // 2. 插入项目记录
      return await ProjectService.create(
        company_id,
        name,
        DataSource.id,
        DataSource.name, {
          company_id,
          status: ProjectStatus.Show,
          state: ProjectState.Disable,
          access_type: type,
          created_by: user_id,
          updated_by: user_id,
          tag_datasource_name: type === AccessDataType.Tag ? DataSource.name : undefined
        },
        transaction
      )
    })
  },

  diySdk: async (ctx) => {
    const checked = $checker.create(ctx.q)
    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }
    let {
      name,
      type,
      params
    } = ctx.q
    //去空值 非法值 只允许英文开头加下划线
    let reg = /^[a-zA-Z0-9][a-zA-Z0-9_]*$/
    params = _.pickBy(params, a => reg.test(a))
    const {
      company_id,
      id: user_id
    } = ctx.session.user
    const isNameExisted = await ProjectService.findOneByName(name, company_id)
    if (isNameExisted.success) {
      return ctx.body = Response.fail('名称已存在')
    }

    let datasType = DataSourceType.Tindex
    let dataSource = ProjectService.generateProjectName(company_id, datasType)
    //自定义了项目ID(datasource_name)
    if (params.project_id) {
      let {
        project_id
      } = params
      let existProject = await ProjectService.findOneByDatasourcename(project_id, company_id)
      let existDatasource = await ProjectService.findOneSugoDatasourcesByname(project_id)

      const {
        kafka: {
          zookeeperHost
        }
      } = config
      const client = new kafka.Client(zookeeperHost)
      let topic = await new Promise((resolve, reject) => {
        client.once('connect', function () {
          client.loadMetadataForTopics([], function (error, results) {
            if (error) {
              return reject(error)
            }
            resolve(_.get(results, '1.metadata'))
          });
        })
      })
      if (existProject.success || existDatasource.success || _.keys(topic).includes(project_id)) {
        return ctx.body = Response.fail('项目ID已存在')
      } else {
        dataSource = project_id
      }
    }
    params = _.omit(params, ['project_id'])
    if (!_.isEmpty(params)) {
      for (let sdkname in params) {
        //验证是否存在同名的token(dataAnalysis)
        let existedDataAnalysis = await db.SugoDataAnalysis.findOne({
          where: {
            id: params[sdkname]
          }
        })
        if (existedDataAnalysis) {
          return ctx.body = Response.fail('存在同名token')
        }
      }
    }

    let DataProject, DataSource
    await db.client.transaction(async transaction => {
      // 1. 插入数据源记录，并在数据源中记录接入类型，留待后用
      let res1 = await DatasourceService.createDataSource(
        ctx,
        dataSource,
        name, {},
        transaction,
        datasType,
        undefined
      )

      if (!res1.success) {
        return res1
      }

      DataSource = res1.result

      // 2. 插入项目记录
      let res2 = await ProjectService.create(
        company_id,
        name,
        DataSource.id,
        DataSource.name, {
          company_id,
          status: ProjectStatus.Show,
          state: ProjectState.Disable,
          access_type: type,
          created_by: user_id,
          updated_by: user_id,
          tag_datasource_name: undefined
        },
        transaction
      )
      if (!res2.success) {
        return res2
      }

      DataProject = res2.result
    })
    // 3. 插入dataanalysis记录
    const SdkAccessType = {
      "iOS接入": AccessDataOriginalType.Ios,
      "Android接入": AccessDataOriginalType.Android,
      "Web接入": AccessDataOriginalType.Web,
      "微信小程序": AccessDataOriginalType.WxMini
    }
    for (let sdkname in SdkAccessType) {
      let dataAnalysis = {
        id: CryptoJS.MD5(short_id()).toString(),
        name: sdkname,
        access_type: SdkAccessType[sdkname],
        type: AccessDataTableType.Main,
        project_id: DataProject.id,
        package_name: null,
        status: ProjectState.Disable,
        params: {},
        created_by: user_id,
        updated_by: user_id
      }
      if (params[sdkname]) {
        dataAnalysis.id = params[sdkname]
      }
      dataAnalysis = await DataAnalysisService.create(dataAnalysis)
      if (_.isEmpty(DataSource.params)) {
        // 初始化维度、配置参数
        let res3 = await DatasourceService.processForAccessSDK(DataProject.datasource_id, company_id)
        if (!res3.success) {
          return ctx.body = res3
        }
      }

      // 激活数据源
      if (DataProject.state !== ProjectState.Activate) {
        let res4 = await ProjectService.activate(DataProject.id)
        if (!res4.success) {
          return ctx.body = res4
        }
      }

    }
    return ctx.body = Response.ok(DataProject.id)
  },

  update: async (ctx) => {
    // 只开放name更新
    const { 
      name, 
      id, 
      filter,
      parentId,
      datasource_name, 
      extra_params, 
      tag_datasource_name, 
      tag_datasource_id, 
      tag_project_id, 
      updateTagSegmentType = UpdateTagSegmentType.Delete
    } = ctx.q

    if (name && (typeof name !== 'string' || name === '')) {
      return returnResult(ctx, {
        success: false,
        message: '参数类型非法'
      })
    }
    
    if (parentId) {
      await SugoChildProjectsService.getInstance().update({
        name,
        params: {
          filters: _.get(filter, 'filters') || []
        }
      }, { id: id, project_id: parentId })
      return returnResult(ctx, { success: true })
    }

    const {
      company_id
    } = ctx.session.user
    const ins = await db.SugoProjects.findOne({
      where: {
        id,
        company_id
      }
    })

    if (!ins) {
      return returnResult(ctx, {
        success: false,
        message: `项目：[${id}] 未找到`
      })
    }

    if (name) {
      const ins1 = await db.SugoProjects.findOne({
        where: {
          name,
          company_id
        }
      })
      if (ins1 && ins1.id !== id) {
        return returnResult(ctx, {
          success: false,
          message: `保存失败，重复的项目名称【${name}】`
        })
      }
    }

    let updateOfProject = {
      name
    }
    let updateOfDataSource = {
      title: name
    }

    if (filter) {
      updateOfDataSource.filter = filter
    }
    if (datasource_name) {
      updateOfProject.datasource_name = datasource_name
      updateOfDataSource.name = datasource_name
    }
    if (extra_params) {
      updateOfProject.extra_params = extra_params
    }
    if (typeof tag_datasource_name !== 'undefined') {
      updateOfProject.tag_datasource_name = tag_datasource_name ? tag_datasource_name : null
      updateOfDataSource.tag_datasource_name = tag_datasource_name ? tag_datasource_name : null
    }

    await db.client.transaction(async transaction => {

      // 切换标签项目 修改用户分群数据
      if (typeof updateOfProject.tag_datasource_name !== 'undefined' && ins.tag_datasource_name) {
        const tagProject = await db.SugoProjects.findOne({
          where: {
            tag_datasource_name: ins.tag_datasource_name,
            access_type: AccessDataType.Tag
          }
        })
        // 解绑 或者 更新标签时删除关联用户群
        if (tagProject &&
          (updateOfProject.tag_datasource_name === '' ||
            updateTagSegmentType === UpdateTagSegmentType.Delete)) {
          await db.Segment.destroy({
            where: {
              params: {
                relatedUserTagProjectId: tagProject.id
              },
              druid_datasource_id: ins.datasource_id
            },
            transaction
          })

          await db.Segment.destroy({
            where: {
              params: {
                relatedBehaviorProjectId: ins.id
              },
              druid_datasource_id: tagProject.datasource_id
            },
            transaction
          })


        } else if (tagProject &&
          updateTagSegmentType === UpdateTagSegmentType.Keep) { // 更新标签时更新关联用户群
          const actionSegments = await db.Segment.findAll({
            where: {
              params: {
                relatedUserTagProjectId: tagProject.id
              },
              druid_datasource_id: ins.datasource_id
            }
          })
          for (const actionSegment of actionSegments) {
            actionSegment.params = {
              ...actionSegment.get({
                plain: true
              }).params,
              relatedUserTagProjectId: tag_project_id
            }
            await actionSegment.save({
              transaction
            })
          }
          await db.Segment.update({
            druid_datasource_id: tag_datasource_id
          }, {
            where: {
              params: {
                relatedBehaviorProjectId: ins.id
              },
              druid_datasource_id: tagProject.datasource_id
            },
            transaction
          })
        }
      }

      if (!_.isEmpty(updateOfProject)) {
        await db.SugoProjects.update(updateOfProject, {
          where: {
            id,
            company_id
          },
          transaction
        })
      }
      if (!_.isEmpty(updateOfDataSource)) {
        await db.SugoDatasources.update(updateOfDataSource, {
          where: {
            id: ins.datasource_id
          },
          transaction
        })
      }
      
      if (_.get(ins, 'extra_params.sdk_position_config', 0) !== _.get(extra_params, 'sdk_position_config', 0)
        || _.get(ins, 'extra_params.sdk_ban_report', '0') !== _.get(extra_params, 'sdk_ban_report', '0')) {
        await Storage.SDKDimension.del(id)
      }
      if (_.get(ins, 'extra_params.sdk_submit_click_point', '0') !== _.get(extra_params, 'sdk_submit_click_point', '0')) {
        await Storage.DesktopDecide.delByProjectId(id)
        await new SugoTrackEventService().updataConfigDeploy([id])
      }

      return returnResult(ctx, {
        success: true
      })
    })
  },

  /**
   * 标签接入-更新标签数据表名(tag_source_name) 字段
   */
  saveTagSuorceName: async (params, userSession) => {
    const {
      project_id,
      datasource_id,
      tag_datasource_name,
      partitions
    } = params
    if (!tag_datasource_name || !project_id || !datasource_id) {
      throw new Error('缺少参数!')
    }
    // 1.创建uindex表、创建hive关联表
    const createUindexRes = await UindexDatasourceService.getInstance().createUindexTableAndHiveTable(tag_datasource_name, null, [], partitions, true)

    // 2.默认创建通用类型的distinct_id标签维度（datasource_type='default_tag')
    const {
      id: created_by,
      company_id,
      SugoRoles
    } = userSession
    const [{
      id: role_id
    }] = SugoRoles
    const distinct_id = 'distinct_id'
    let defs = {
      title: '用户唯一ID',
      name: distinct_id,
      type: 2, // '0=Long,1=Float,2=String,3=DateString;4=Date;5=Integer;6=TEXT;7=DOUBLE;8=BIGDECIMAL'
      is_druid_dimension: true,
      parentId: datasource_id,
      datasource_type: 'default_tag',
      role_ids: [role_id],
      company_id,
      created_by
    }
    // 3.保存表名称
    const result = await ProjectService.saveTagSuorceName({
      tag_datasource_name,
      project_id,
      datasource_id,
      uindexSpec: createUindexRes
    }, defs)
    return result
  },

  hide: setStatusFactory(ProjectStatus.Hide),

  show: setStatusFactory(ProjectStatus.Show),

  disable: setStateFactory(ProjectState.Disable),

  activate: setStateFactory(ProjectState.Activate),

  /**
   * 删除项目
   * @param ctx
   * ```js
   * ctx.q = {
   *   project_id: String
   * }
   * ```
   */
  deleteProject: async (ctx) => {
    const {
      project_id
    } = ctx.params
    if (!project_id) {
      return {
        success: false,
        message: '缺少参数'
      }
    }
    const {
      company_id
    } = ctx.session.user
    const project = await db.SugoProjects.findOne({
      where: {
        id: project_id,
        company_id
      }
    })
    let childProject
    // 该项目是个子项目 删子项目
    if (!project) {
      childProject = await db.SugoChildProjects.findOne({
        where: { id: project_id },
        raw: true
      })
      if (childProject) {
        await ProjectService.deleteChildProject(childProject)
        return returnResult(ctx, {
          success: true,
          model: [childProject.id]
        })
      }
      return returnResult(ctx, { success: false, message: '项目不存在' })
    }

    //检查是否有子项目未删除
    childProject = await db.SugoChildProjects.findOne({
      where: { project_id },
      raw: true
    })
    if (childProject) {
      return returnResult(ctx, { success: false, message: `该项目有子项目${childProject.name}未删除` })
    }

    if (project.state === ProjectState.Activate) {
      return returnResult(ctx, { success: false, message: '正在运行的项目不可删除' })
    }
    // 删除项目为标签项目
    if (project.access_type === AccessDataType.Tag && !project.parent_id) {
      const actionProjects = await db.SugoProjects.findAll({
        where: {
          tag_datasource_name: project.tag_datasource_name,
          id: {
            $ne: project.id
          }
        }
      })
      if (actionProjects.length) {
        return returnResult(ctx, {
          success: false,
          message: `[${actionProjects.map(p => p.title || p.name)}]关联此项目, 请解绑后删除!`
        })
      }
    }



    //删除项目
    await ProjectService.deleteProj(project)
    returnResult(ctx, {
      success: true,
      model: [project.id]
    })
  },
  deleteTopic: async (ctx) => {
    const {
      dataSource
    } = ctx.params
    // 先停再删
    await SupervisorService.shutdownSupervisor(dataSource)
    const result = await DatasourceService.deleteTopic(dataSource)
    return returnResult(ctx, result)
  },
  /**
   * 获取用户项目列表
   * @param ctx
   */
  projectList: async (ctx) => {
    const { company_id } = ctx.session.user
    if (!company_id)
      return returnResult(ctx, {
        success: false,
        message: '非法用户请求'
      })

    // 已授权访问的数据源
    const {
      dataSources,
      childProjects,
      parentOfChildProjects,
      parentDataSources
    } = await getDataSourcesWithPermissions(ctx)
    
    let projects = await db.SugoProjects.findAll({
      where: {
        company_id,
        datasource_id: {
          $in: dataSources.map(d => d.id)
        }
      },
      order: [['updated_at', 'DESC']],
      raw: true
    })
    const res = [
      ...projects,
      // 子项目数据，带上父项目名称
      ...childProjects.map(cp => {
        const parentProj = _.find(parentOfChildProjects, {id: cp.project_id})
        return parentProj && {
          ...parentProj,
          created_at: cp.created_at,
          updated_at: cp.updated_at,
          id: cp.id,
          name: cp.name,
          status: cp.status,
          filter: cp.params,
          parent_id: parentProj.id,
          parentName: parentProj.name
        }
      }).filter(_.identity)
    ]
    returnResult(ctx, {
      success: true,
      model: _.orderBy(res, p => p.updated_at, 'desc')
    })
  },
  /**
   * 获取项目下所有的分析表数据
   * @param ctx
   * ```js
   * ctx.q = {
   *  project_id: String
   * }
   * ```
   */
  tables: async (ctx) => {
    const {
      project_id
    } = ctx.q
    if (!project_id) {
      return returnResult(ctx, {
        success: false,
        message: '参数错误'
      })
    }
    const dim_inst = await db.SugoDataAnalysis.findAll({
      where: {
        project_id
      }
    })
    returnResult(ctx, {
      success: true,
      model: dim_inst.map(di => di.get({
        plain: true
      }))
    })
  },
  /**
   * 获取项目所有appid
   * @param ctx
   * ```js
   * ctx.q = {
   *  project_id: String
   * }
   * ```
   */
  getAppIdList: async (ctx) => {
    const {
      where
    } = ctx.q || {}
    const dim_inst = await db.SugoDataAnalysis.findAll({
      where: where || {},
      raw: true
    })
    returnResult(ctx, {
      success: true,
      model: dim_inst
    })
  },

  /**
   * 获取项目信息
   * @param ctx
   * ```js
   * ctx.q = {
   *  project_id: String
   * }
   * ```
   */
  projectInfo: async (ctx) => {
    const {
      project_id
    } = ctx.q
    const {
      company_id
    } = ctx.session.user
    const instance = await db.SugoProjects.findOne({
      where: {
        id: project_id,
        company_id
      }
    })
    return returnResult(ctx, {
      success: true,
      model: instance ? instance.get({
        plain: true
      }) : null
    })
  },

  /**
   * 接入维度数据
   * 1. 插入记录到 DataAnalysis 表
   * 2. 如果该项目还没有创建 supervisor，则创建
   * 3. 执行初始化操作：写入初始维度、默认指标等
   * @param ctx
   * @return {Promise.<ResponseStruct<DataAnalysisModel>>}
   */
  async accessDataSource(ctx) {
    const checked = $checker.accessDataSource(ctx.q)

    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }

    const {
      id,
      name,
      type,
      package_name = null,
      access_type,
      project_id,
      params = {}
    } = ctx.q

    const {
      id: user_id,
      company_id
    } = ctx.session.user
    const {
      result: project
    } = await ProjectService.info(project_id)

    if (!project || !project.id) {
      return ctx.body = Response.fail('项目不存在')
    }

    if (project.company_id !== company_id) {
      return ctx.body = Response.fail('无操作权限')
    }

    // 所有的数据源默认都未激，其中：
    // SDK 项目接入数据时再激活
    // 文件项目上报维度时再激活
    let dataAnalysis = {
      name,
      type,
      package_name,
      access_type,
      project_id,
      status: ProjectState.Disable,
      params,
      created_by: user_id,
      updated_by: user_id
    }

    // 更新
    if (id) {
      const {
        result: analysis
      } = await DataAnalysisService.findOne(id)
      if (analysis && analysis.id === id) {
        await DataAnalysisService.update(id, {
          name,
          type,
          package_name,
          access_type,
          project_id,
          params
        })
        dataAnalysis.id = id
      }
    } else {
      // 创建
      // 改为md5加长的字符串
      dataAnalysis.id = CryptoJS.MD5(short_id()).toString()
      dataAnalysis = await DataAnalysisService.create(dataAnalysis)

      // 如果是SDK接入，在此初始化维度与数据源
      if (
        access_type === AccessDataOriginalType.Android ||
        access_type === AccessDataOriginalType.Ios ||
        access_type === AccessDataOriginalType.Web ||
        access_type === AccessDataOriginalType.WxMini
      ) {

        // 创建数据源之前，先判断是否已创建该项目的数据源
        const dRes = await DatasourceService.findOne(project.datasource_id)

        if (!dRes.success) {
          return ctx.body = dRes
        }

        const dataSource = dRes.result

        if (_.isEmpty(dataSource.params)) {
          // 初始化维度、配置参数
          const res = await DatasourceService.processForAccessSDK(project.datasource_id, company_id)
          if (!res.success) {
            return ctx.body = res
          }
        }

        // 激活数据源
        if (project.state !== ProjectState.Activate) {
          const res = await ProjectService.activate(project_id)
          if (!res.success) {
            return ctx.body = res
          }
        }
      }
      if (access_type === AccessDataOriginalType.Tag) {
        await DatasourceService.processForAccessTAG(project.datasource_id, company_id)
        const res = await this.saveTagSuorceName({
            project_id: project.id,
            datasource_id: project.datasource_id,
            tag_datasource_name: project.tag_datasource_name,
            partitions: ctx.q.partitions || null
          },
          ctx.session.user)
        if (!res.success) {
          return ctx.body = res
        }
      }
    }

    return ctx.body = Response.ok(dataAnalysis)
  },

  /**
   * 删除接入数据源
   * 1. 删除所有关联关系
   * 2. 删除`analysis_id`的所有维度
   * 3. 删除 SugoDataAnalysis 中的记录
   * @params ctx
   * ```js
   * ctx = {analysis_id: string}
   * ```
   *
   */
  deleteAccessData: async (ctx) => {
    const {
      analysis_id
    } = ctx.params
    console.log('deleteAccessData', analysis_id)
    await ProjectService.createDBTransaction(db.client, async (transaction) => {

      // 检测`analysis_table`是否存在
      const inst = await db.SugoDataAnalysis.findOne({
        where: {
          id: analysis_id
        }
      })

      if (!inst)
        return returnResult(ctx, {
          success: false,
          message: '没有分析表记录'
        })

      // 1. 删除所有关联关系
      await db.SugoAnalysisAssociate.destroy({
        where: {
          analysis_id
        },
        transaction
      }, )
      // 2. 删除`analysis_id`的所有维度
      await db.SugoDimensionsHBase.destroy({
        where: {
          analysis_id
        },
        transaction
      })
      // 3. 删除 SugoDataAnalysis 中的记录
      await db.SugoDataAnalysis.destroy({
        where: {
          id: analysis_id
        },
        transaction
      })

      transaction.commit()
      returnResult(ctx, {
        success: true,
        model: inst
      })
    })
  },
  updateAnalysisStatus: async ctx => {
    const {
      id,
      status,
      name,
      package_name
    } = ctx.q
    if (!id || status === null || status === void 0) {
      return returnError(ctx, {
        success: false,
        message: '保存失败，缺少参数'
      })
    }
    const updateData = name && package_name ? {
      status,
      name,
      package_name
    } : {
      status
    }
    await db.SugoDataAnalysis.update(updateData, {
      where: {
        id
      }
    })
    updateData.id = id
    returnResult(ctx, {
      success: true,
      model: updateData
    })
  },

  /**
   * 配置数据源维度
   * 1. 先检数据表对应的`project`是否已创建task,如果没有创建,则创建
   * 2. 删除`analysis_id`的所有维度
   * 3. 删除所有关联关系
   * 4. 写入维度数据到 `sugo_dimensions_hbase`
   * @param ctx
   * ```js
   * ctx = {
   *  dimensions:[{name:String, type: Number}, ...],
   *  analysis_id: String,
   *  platform: String
   * }
   * ```
   */
  createAccessDimensions: async (ctx) => {
    const {
      dimensions,
      analysis_id,
      platform,
      inDimTable = true
    } = ctx.q

    // 检测 analysis 记录是否存在
    const analysisRes = await DataAnalysisService.findOne(analysis_id)
    if (!analysisRes.success) {
      return ctx.body = analysisRes
    }

    const {
      result: analysis
    } = analysisRes

    // 检测 analysis 所属的项目是否存在
    const projectRes = await ProjectService.findOne(analysis.project_id)
    if (!projectRes.success) {
      return ctx.body = projectRes
    }

    const {
      result: project
    } = projectRes

    // 生成维度，补上时间维度，免得用户需要通过同步维度来获得 __time 维度
    let dimsWithTimeDim = _.some(dimensions, dim => dim.name === '__time') ?
      dimensions : [{
        name: '__time',
        type: DruidColumnType.Date
      }, ...dimensions]
    const dims = ProjectService.generateAccessDimensions(dimsWithTimeDim, platform)

    // 写入hbase
    const hbaseRes = await AnalysisHBaseService.bulkCreate(project, analysis, dims, inDimTable)
    if (!hbaseRes.success) {
      return ctx.body = hbaseRes
    }

    // 如果是 File 类型接入，创建数据源
    const datasouceRes = await DatasourceService.findOne(project.datasource_id)
    if (!datasouceRes.success) {
      return ctx.body = datasouceRes
    }

    const {
      result: datasource
    } = datasouceRes
    // 如果是File类型
    // 生成 supervisorJson
    if (datasource.params.AccessDataType === AccessDataType.File && _.isEmpty(datasource.supervisorJson)) {
      const res = await DatasourceService.createSupervisorJsonForFileAccessor(datasource)
      if (!res.success) return ctx.body = res
    }

    // 激活数据源
    if (project.state !== ProjectState.Activate) {
      const res = await ProjectService.activate(project.id)
      if (!res.success) return ctx.body = res
    }

    return ctx.body = Response.ok({
      dimensions: hbaseRes.result.dimensions,
      datasource_id: project.datasource_id
    })
  },

  /**
   * 查询维度
   * @param ctx
   * ```js
   * ctx.q = {
   *  analysis_ids: {Array<String>}
   * }
   * ```
   */
  queryAccessDimensions: async (ctx) => {
    const {
      analysis_ids
    } = ctx.q
    if (!_.isArray(analysis_ids) || analysis_ids.length === 0)
      return returnResult(ctx, {
        success: false,
        message: '请求参数为空'
      })

    if (analysis_ids.some(id => !_.isString(id)))
      return returnResult(ctx, {
        success: false,
        message: 'id类型非法,analysis_id应为String类型'
      })

    const inst = await db.SugoDimensionsHBase.findAll({
      where: {
        analysis_id: {
          $in: analysis_ids
        }
      }
    })
    const plain_inst = inst.map(ins => ins.get({
      plain: true
    }))
    const model = {}
    plain_inst.forEach(record => {
      const id = record.analysis_id
      const arr = model[id] || (model[id] = [])
      arr.push(record)
    })
    returnResult(ctx, {
      success: true,
      model
    })
  },
  /**
   * 创建主表、维表关联关系
   * @param ctx
   * ```js
   * ctx.q = {
   *  analysis_id: String,
   *  associate: [{
   *   main_dimension: String,
   *   associate_dimension: String
   *  }]
   * }
   * ```
   */
  createAccessAssociation: async (ctx) => {
    const {
      analysis_id,
      associate
    } = ctx.q
    if (!analysis_id || !_.isArray(associate) || associate.length === 0) {
      return returnResult(ctx, {
        success: false,
        message: '请求参数错误'
      })
    }
    const _associates = associate.map(ass => {
      return { ...ass,
        id: short_id(),
        analysis_id
      }
    })
    const create_inst = await db.SugoAnalysisAssociate.bulkCreate(_associates)
    if (!create_inst) {
      return returnResult(ctx, {
        success: false,
        message: '写入失败'
      })
    } else {
      return returnResult(ctx, {
        success: true,
        model: _associates
      })
    }
  },
  /**
   * 查询维表关联关系
   * @param ctx
   * ```js
   * ctx.q = {
   *   analysis_ids: Array<String>
   * }
   * ```
   */
  queryAccessAssociation: async (ctx) => {
    const {
      analysis_ids
    } = ctx.q
    if (!_.isArray(analysis_ids) || analysis_ids.length === 0)
      return returnResult(ctx, {
        success: false,
        message: '请求参数为空'
      })
    if (analysis_ids.some(id => !_.isString(id)))
      return returnResult(ctx, {
        success: false,
        message: 'id类型非法,analysis_id应为String类型'
      })

    const inst = await db.SugoAnalysisAssociate.findAll({
      where: {
        analysis_id: {
          $in: analysis_ids
        }
      }
    })
    const plain_inst = inst.map(ins => ins.get({
      plain: true
    }))
    returnResult(ctx, {
      success: true,
      model: plain_inst
    })
  },
  /**
   * 查询项目下所有的关联关系, java层调用
   * @param ctx
   * ```js
   * ctx.query = {
   *   project_id: String
   * }
   * ```
   */
  queryProjectAccessAssociation: async (ctx) => {
    const {
      project_id
    } = ctx.query
    if (!project_id)
      return returnResult(ctx, {
        success: false,
        message: '参数为空'
      })
    // 1. 项目下所有表
    const analysis = await db.SugoDataAnalysis.findAll({
      where: {
        project_id
      }
    })
    const analysis_map = {
      main: [],
      dimension: []
    }
    // 分主表、维表
    analysis.forEach(ana => {
      return (
        ana.type === AccessDataTableType.Main ?
        analysis_map.main :
        analysis_map.dimension
      ).push(ana.id)
    })
    const analysis_ids = analysis_map.main.concat(analysis_map.dimension)

    // 2. 所有表的关联关系
    const associate = await db.SugoAnalysisAssociate.findAll({
      where: {
        analysis_id: {
          $in: analysis_ids
        }
      }
    })
    // 分组
    const associate_group = _.groupBy(associate, (asso) => asso.analysis_id)
    // 3. 项目所有维度
    const dimensions = await db.SugoDimensionsHBase.findAll({
      where: {
        analysis_id: {
          $in: analysis_ids
        }
      }
    })
    const dimensions_list = dimensions.map(dim => dim.get({
      plain: true
    }))
    const dimensions_map = {}
    dimensions_list.forEach(dim => dimensions_map[dim.id] = dim)
    // 取出维度name
    const associate_names = {}
    analysis_map.dimension.forEach(id => {
      const asso = associate_group[id]
      associate_names[id] = asso.map(as => {
        const m = dimensions_map[as.main_dimension]
        const d = dimensions_map[as.associate_dimension]

        // const StrType = DIMENSION_TYPES_INVERT[type]
        // const BackendType = DIMENSION_MAP[StrType]
        // const MiniType = DIMENSION_TYPES_MINI_MAP[BackendType]

        return `${DIMENSION_TYPES_MINI_MAP[DIMENSION_MAP[DIMENSION_TYPES_INVERT[m.type]]]}|${m.name},` +
          `${DIMENSION_TYPES_MINI_MAP[DIMENSION_MAP[DIMENSION_TYPES_INVERT[d.type]]]}|${d.name}`
      })
    })

    ctx.body = {
      success: true,
      model: associate_names
    }
  },
  /**
   * 主分析表跨项目复制埋点事件记录
   */
  copyProjectEvents: async ctx => {
    const {
      targetRecord,
      currentRecord
    } = ctx.q
    if (!targetRecord || !currentRecord) {
      return returnError(ctx, '操作失败缺少参数')
    }
    await ProjectService.copyProjectEvnts({
      targetRecord,
      currentRecord
    })
    return returnResult(ctx, {
      success: true
    })
  },
  /**
   * 创建新App版本
   */
  createAppVersion: async ctx => {
    const {
      targetRecord,
      sourceRecord
    } = ctx.q
    if (!targetRecord || !sourceRecord) {
      return returnError(ctx, '操作失败缺少参数')
    }
    const result = await ProjectService.createProjectEvent({
      targetRecord,
      sourceRecord
    })
    if (result) {
      return returnResult(ctx, {
        success: true
      })
    } else {
      return returnError(ctx, '当前AppVersion已存在')
    }

  },
  /**
   * 删除可视化配置事件草稿
   */
  deleteTrackEventDraft: async ctx => {
    let body = ctx.q
    let {
      ids
    } = body

    const res = await new SugoTrackEventService().deleteTrackEventDraft(ids)
    return returnResult(ctx, res)
  },

  /**
   * 更新可视化配置事件
   */
  editTrackEvent: async ctx => {
    //type: draft or notDraft
    let body = ctx.q
    let {
      params
    } = body
    let result = await new SugoTrackEventService().editTrackEvent(params)
    return returnResult(ctx, result)
  },

  /**
   * 创建子项目
   */
  createChildProject: async ctx => {
    let { parentId, filter, name } = ctx.q
    let { company_id, id: user_id, SugoRoles } = ctx.session.user
    let res = await ProjectService.createChildProject(company_id, user_id, parentId, filter, name, SugoRoles)
    if (res && res.error) {
      return returnError(ctx, res.error, res.code)
    }
    res.success = true
    returnResult(ctx, res)
  },

  /**
   * 修改项目权限并更新指标和维度
   */
  updateProjectRoles: async ctx => {
    let id = ctx.params.id || 0
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let {
      child_project_id,
      role_ids
    } = ctx.q
    let {
      user
    } = ctx.session
    let {
      company_id
    } = user
    let uid = user.id
    let obj = await db.SugoDatasources.findOne({
      where: {
        id,
        company_id
      }
    })
    let childProj = child_project_id && await db.SugoChildProjects.findOne({
      where: {
        id: child_project_id
      }
    })
    if (!obj) { //如果数据源名称存在 则可能是更新别名
      return returnError(ctx, '数据源不存在', 404)
    }
    let dimensions = await db.SugoDimensions.findAll({
      where: {
        parentId: id,
        company_id
      }
    })
    let measures = await db.SugoMeasures.findAll({
      where: {
        parentId: id,
        company_id
      }
    })
    let deleteRoles = _.difference(obj.role_ids, role_ids)
    let addRoles = _.difference(role_ids, obj.role_ids)
    await db.client.transaction(async t => {
      const transaction = { transaction: t }
      if (child_project_id) {
        await childProj.update({
          updated_by: uid,
          role_ids
        }, transaction)
      } else {
        await obj.update({
          updated_by: uid,
          role_ids
        }, transaction)
      }
      await dimensions.map(async p => {
        _.remove(p.role_ids, r => _.findIndex(deleteRoles, d => d === r) >= 0)
        let newRoles = [...p.role_ids, ...addRoles]
        await p.update({
          role_ids: newRoles
        })
      })
      await measures.map(async p => {
        _.remove(p.role_ids, r => _.findIndex(deleteRoles, d => d === r) >= 0)
        let newRoles = [...p.role_ids, ...addRoles]
        await p.update({
          role_ids: newRoles
        })
      })
    })
    let result = true
    returnResult(ctx, result)
  },

  /**
   * 创建数据接入task记录
   * @param ctx
   * @return {Promise.<*>}
   */
  async createAccessTask(ctx) {
    const {
      project_id
    } = ctx.q
    const {
      result: project
    } = await SugoProjectService.info(project_id)

    if (project.company_id !== ctx.session.user.company_id) {
      return ctx.body = Response.fail('没有操作权限')
    }

    return ctx.body = await AccessDataTaskService.create(ctx.q)
  },

  /**
   * 更新数据接入记录
   * @param ctx
   * @return {Promise.<*>}
   */
  async updateAccessTask(ctx) {
    const {
      id
    } = ctx.q
    const {
      result: task
    } = await AccessDataTaskService.findOne(id)

    if (!task.id) {
      return ctx.body = Response.fail('未找到记录')
    }

    const {
      result: project
    } = await SugoProjectService.info(task.project_id)

    if (project.company_id !== ctx.session.user.company_id) {
      return ctx.body = Response.fail('没有操作权限')
    }

    return ctx.body = await AccessDataTaskService.update(ctx.q)
  },

  /**
   * 查询数据接入task列表
   * @param ctx
   * @return {Promise.<*>}
   */
  async queryAccessTaskList(ctx) {
    const {
      project_id
    } = ctx.q
    const {
      result: project
    } = await SugoProjectService.info(project_id)

    if (project.company_id !== ctx.session.user.company_id) {
      return ctx.body = Response.fail('没有操作权限')
    }

    return ctx.body = await AccessDataTaskService.findAll(project_id)
  },

  /**
   * 查询单条 AccessDataTask 记录
   * @param ctx
   * @return {Promise.<ResponseStruct>}
   */
  async queryAccessTask(ctx) {
    const {
      id
    } = ctx.q
    const {
      result: task
    } = await AccessDataTaskService.findOne(id)
    const {
      result: project
    } = await SugoProjectService.info(task.project_id)

    if (project.company_id !== ctx.session.user.company_id) {
      return ctx.body = Response.fail('没有操作权限')
    }

    return ctx.body = Response.ok(task)
  },

  /**
   * 创建接入记录并运行task
   * @param ctx
   * @return {Promise.<*>}
   */
  async createAndRunTask(ctx) {
    const {
      id,
      params,
      project_id,
      datasource_name
    } = ctx.q
    let resRunTask = await AccessDataTaskService.runTask(params)
    if (resRunTask && resRunTask.success) {
      const res = await AccessDataTaskService.updateOrCreate({
        project_id,
        datasource_name,
        params,
        task_id: resRunTask.result.task,
        id,
        status: ACCESS_DATA_TASK_STATUS.RUNNING
      })

      if (!res.success) {
        return ctx.body = res
      }
      return ctx.body = Response.ok(res.result)
    } else {
      Response.fail('创建失败')
    }
  },

  /**
   * 停止MR创建的task
   * @param ctx
   * @return {Promise.<*>}
   */
  async stopTask(ctx) {
    const res = await AccessDataTaskService.findOne(ctx.q.id)
    if (!res.success) {
      return ctx.body = res
    }

    if (!res.result) {
      return ctx.body = Response.fail('未找到记录')
    }

    const stop = await AccessDataTaskService.stopTask(res.result.task_id)

    if (!stop.success) {
      return ctx.body = stop
    }
    let taskStatus = ACCESS_DATA_TASK_STATUS.FAILED
    const {
      result: status
    } = await AccessDataTaskService.getAllTasks()
    let rc = status.find(s => s.id === res.result.task_id)
    if (rc) {
      taskStatus = ACCESS_DATA_TASK_STATUS[rc.status] || ACCESS_DATA_TASK_STATUS.FAILED
    }
    return ctx.body = await AccessDataTaskService.update({
      id: res.result.id,
      status: taskStatus
    })
  },

  /**
   * 运行MR创建的task
   * @param ctx
   * @return {Promise.<*>}
   */
  async runTask(ctx) {
    const res = await AccessDataTaskService.findOne(ctx.q.id)
    if (!res.success) {
      return ctx.body = res
    }

    if (!res.result) {
      return ctx.body = Response.fail('未找到记录')
    }

    const stopStatus = await AccessDataTaskService.getTaskStatusByTaskId(res.result.task_id)
    if (stopStatus && stopStatus.success && stopStatus.result.status) {
      let status = ACCESS_DATA_TASK_STATUS[stopStatus.result.status.status]
      if (status === ACCESS_DATA_TASK_STATUS.WAITING || status === ACCESS_DATA_TASK_STATUS.RUNNING || status === ACCESS_DATA_TASK_STATUS.PENDING) {
        return returnError(ctx, '任务已创建,排队中...')
      }
    }
    const run = await AccessDataTaskService.runTask(res.result.params)

    if (!run.success) {
      return ctx.body = run
    }

    return ctx.body = await AccessDataTaskService.update({
      id: res.result.id,
      task_id: run.result.task,
      status: ACCESS_DATA_TASK_STATUS.RUNNING
    })
  },

  /**
   * 查询MR task列表并更新其status
   * @param ctx
   * @return {Promise.<*>}
   */
  async queryTaskWithStatus(ctx) {
    const {
      project_id
    } = ctx.q

    // TODO 所有权验证
    const res = await AccessDataTaskService.findAll(project_id)

    if (!res.success) {
      return ctx.body = res
    }

    const tasks = res.result

    if (tasks.length === 0) {
      return ctx.body = Response.ok(tasks)
    }

    const taskMap = new Map()
    const statusMap = new Map()
    const {
      result: status
    } = await AccessDataTaskService.getAllTasks()
    tasks.forEach(r => {
      let rc = status.find(s => s.id === r.task_id)
      if (rc) {
        statusMap.set(r.task_id, rc.status)
      }
      taskMap.set(r.task_id, r)
    })

    const diffStatus = tasks.filter(r => statusMap.get(r.task_id) && r.status !== statusMap.get(r.task_id))

    // update status
    for (let r of diffStatus) {
      await AccessDataTaskService.update({
        id: r.id,
        status: statusMap.get(r.task_id)
      })
    }

    return ctx.body = Response.ok(tasks.map(r => {
      let s = statusMap.get(r.task_id)
      return s !== void 0 ? { ...r,
        status: s
      } : r
    }))
  },

  /**
   * 查看MR task日志
   * @param ctx
   * @return {Promise.<*>}
   */
  async queryTaskLog(ctx) {
    const {
      id,
      size
    } = ctx.q
    const res = await AccessDataTaskService.findOne(id)

    if (!res.success) {
      return ctx.body = res
    }

    const {
      result: stream
    } = await AccessDataTaskService.queryTaskLog(res.result.task_id, size)
    ctx.set('Content-type', 'text/html')
    return ctx.body = stream.pipe(transformLog())
  },

  /**
   * @param ctx
   * @return {Promise.<ResponseStruct<{project_id:string, real_user_table:string}>>}
   */
  async associateRealUserTable(ctx) {
    const {
      project_id,
      real_user_table
    } = ctx.q
    return ctx.body = await ProjectService.associateRealUserTable(project_id, real_user_table)
  },

  async querySupervisor(ctx) {
    // 如果tindex跟uindex配置相同 则视为只有uindex项目不做supervisor查询操作
    if (config.druid.host === config.uindex.host) {
      return ctx.body = {}
    }
    return ctx.body = await ProjectService.supervisorConfig(ctx.q)
  },

  async upDateSupervisor(ctx) {
    return ctx.body = await ProjectService.updateSupervisorConfig(ctx.q)
  },

  async queryUindexSpec(ctx) {
    return ctx.body = await ProjectService.queryUindexSpec(ctx.q)
  },

  async listAllTindexAndUindexsDatasourceNameAndProjectName(ctx) {

    const sql ='SELECT ds."name" as "datasourceName", pro."name" as "projectName", ds."type" FROM sugo_projects pro, sugo_datasources ds WHERE pro.datasource_id=ds."id" AND ds."type" IN (0, 2)'
    const result = await db.client.query(sql, { type: db.client.QueryTypes.SELECT }) // [{datasourceName, projectName, type}]
    let res = result.reduce((p, cur) => {
      const item = { [cur.datasourceName]:cur.projectName }
      p[cur.type === 0 ? 'tindex' : 'uindex'].push(item)
      return p
    }, { tindex: [], uindex: [] })
    return ctx.body = Response.ok(res)
  },

  /**
   * @description 获取Uinde数据加载完成进度状态
   * @param {any} ctx
   * @returns
   */
  async getUindexLoadStatus(ctx) {
    let result = {}
    try {
      /**
       *return
       {
        "uindex_r1aJyE6dM_project_8al1TRqip": 100,
        "projects": 100,
        "user_tag": 100,
        "users_message": 100，
         ...
        }
       *
       */
      result = await UindexDatasourceService.getInstance().getUindexLoadStatus()
    } catch(e) {
      result = {}
    }
    return ctx.body = Response.ok(result)
  }

}
/** 格式化日志，增加pre标签 */
const transformLog = () => {
  let idx = 0
  let transform = new Transform({
    transform: function (data, enc, cb) {
      if (idx === 0) {
        transform.push('<pre>')
      }
      cb(null, data)
      idx++
    },
    flush: function (cb) {
      transform.push('</pre>')
      cb(null)
    }
  })
  return transform
}

export default Project
