import db from '../models'
import { returnResult, returnError } from '../utils/helper'
import config from '../config'
import { generate } from 'shortid'
import { err } from '../utils/log'
import {dedent, immutateUpdate} from '../../common/sugo-utils'
import _ from 'lodash'
import { redisGet, redisSet } from '../utils/redis'
import CryptoJS from 'crypto-js'
import tar from 'tar-stream'
import path from 'path'
import zlib from 'zlib'
import SupervisorService from '../services/druid-supervisor.service'
import SugoDatasourceService from '../services/sugo-datasource.service'
import { ACCESS_TYPES, PLATFORM, AccessDataTableType } from '../../common/constants'
import { readDir, readFile, statFile } from '../utils/fs-promise'
import SugoProjectService from '../services/sugo-project.service'
import UindexDataSourceService from '../services/uindex-datasource.service'
import { Response } from '../utils/Response'

const { collectGateway } = config.site
if (!collectGateway) throw new Error('缺少配置config.site.collectGateway')

export function permissionControl (q, sessionUser) {
  let { SugoRoles = [] } = sessionUser
  let roleIds = SugoRoles.map(r => r.id)
  Object.assign(q.where, {
    role_ids: {
      $or: roleIds.map(r => {
        return {
          $contains: r
        }
      })
    }
  })
  return q
}

export async function getDataSourcesWithPermissions (ctx) {
  let { q } = ctx
  let { user } = ctx.session
  let { company_id } = user
  if (!q.where) q.where = {}
  if (q.limit > 999) q.limit = 999
  if (!q.withCount && !q.noauth) permissionControl(q, user)
  q.where.company_id = company_id
  if (q.withCount) {
    q.attributes = {
      include: [
        [
          db.client
            .literal('(select count(*) from sugo_dimensions where "parentId"="SugoDatasources".id)'),
          'dimensionsize'
        ], [
          db.client
            .literal('(select count(*) from sugo_measures where "parentId"="SugoDatasources".id)'),
          'measuresize'
        ]
      ]
    }
    delete q.withCount
  }
  let childProjects = [], parentOfChildProjects = [], parentDataSources = []
  if (q.includeChild) {
    if (user.type === 'built-in') {
      childProjects = await db.SugoChildProjects.findAll({
        where: {},
        raw: true
      })
    } else {
      childProjects = await db.SugoChildProjects.findAll({
        where: _.isEmpty(q.where.role_ids) ? {} : { role_ids: q.where.role_ids },
        raw: true
      })
    }
    
    const parentProjIds = childProjects.map(cp => cp.project_id)
    parentOfChildProjects = await db.SugoProjects.findAll({
      where: {
        id: {$in: parentProjIds}
      },
      raw: true
    })
    parentOfChildProjects = parentProjIds.map(pId => _.find(parentOfChildProjects, {id: pId}))
  
    const parentDsIds = parentOfChildProjects.map(p => p.datasource_id)
    parentDataSources = await db.SugoDatasources.findAll({
      where: {
        id: {
          $in: parentDsIds
        }
      },
      raw: true
    })
    parentDataSources = parentDsIds.map(dsId => _.find(parentDataSources, {id: dsId}))
    // TODO with count ?
  }
  
  q.order = q.order || [ ['updatedAt', 'DESC'] ]
  let dataSources = await db.SugoDatasources.findAll({...q, raw: true})
  return {
    dataSources,
    childProjects,
    parentOfChildProjects,
    parentDataSources
  }
}

/** 获取数据接入token在redis中的key规则*/
export const getAccessTokenKey = (type, company_id) => {
  //sugo-canal的token验证值存入redis，在网关处做验证
  return `sugo_canal_token_key_${type}_${company_id}`
}

/** 获取数据接入token在redis中的值规则*/
const generateAccessTokenVal = (type, company_id) => {
  const val = CryptoJS.MD5(generate()).toString()
  const prefix = `${type}_token_${company_id}`
  return `${prefix}_${val}`
}

//获取数据源配置中的commonMerics中的dimension
async function getDims (ds) {
  let datasources = []
  let dimensions = []
  for (let d of ds) {
    let params = d.params || {}
    let {
      commonMetric,
      commonDimensions,
      commonSession
    } = params
    if (!commonMetric || !commonDimensions || !commonSession) continue
    let names = _.uniq(
      commonMetric.concat(commonDimensions, commonSession)
    )

    let dims = await db.SugoDimensions.findAll({
      where: {
        parentId: d.id,
        name: {
          $in: names
        }
      },
      attributes: ['id', 'name', 'title', 'parentId']
    })
    if (dims.length !== names.length) {
      err('数据源', d.name, d.title, '缺少维度')
      continue
    }
    dimensions = dimensions.concat(dims)
    datasources.push(d)
  }

  return {
    result: datasources,
    dimensions
  }

}

/**
 * 组装lucene_supervisor对应的数据源参数值
 */
// async function getTopicJSONForLucene (ctx, dataSource) {
//   const id = dataSource.id
//   // let dataSource = await db.SugoDatasources.findById(id)
//   let dimensions = await db.SugoDimensions.findAll({
//     where: {
//       parentId: id
//     }
//   })
//   let result = {}
//   try {
//     if (dataSource) {
//       let {
//         name,
//         peak,
//         supervisorPath,
//         type,
//         supervisorJson,
//         access_type
//       } = dataSource
//       result.dataCube = name
//       result.peak = peak
//       result.supervisorPath = supervisorPath
//       result.type = type + '' //0=原始类型;1=聚合类型
//       result.supervisorJson = supervisorJson
//       result.access_type = access_type
//     }
//     if (dimensions.length > 0) {
//       result.dimensionsSpec = []
//       //date-string: 表示前端可以按date分组处理，druid还是存的string类型
//       //后端没有double类型，所有对应的是float类型
//       let types = ['long', 'float', 'string', 'string'] // {long: 0, double: 1, string: 2, datestring: 3}
//       dimensions.forEach(obj => {
//         result.dimensionsSpec.push({
//           name: obj.name,
//           type: types[obj.type] || 'string' //不存在的默认为string
//         })
//       })
//     }

//     result.metricsSpec = [] //lucene 原始类型，没有预聚合指标

//   } catch (e) {
//     err('getTopicJSONForLucene error', e.message, e.stack)
//   }
//   //console.log(result);
//   return result
// }

const dataSources = {

  //返回所有的数据源json数据
  list: async ctx => {
    let comp = await db.SugoCompany.findOne({
      name: 'test'
    })

    let q = {
      where: {
        status: 1
      },
      attributes: ['id', 'name', 'title', 'type']
    }

    if (comp) {
      q.where.company_id = comp.id
    }
    let dataSources = await db.SugoDatasources.findAll(q)

    let dataCubes = dataSources.map(dataSource => ({
      id: dataSource.id,
      name: dataSource.name,
      title: dataSource.title,
      type: dataSource.type === 0 ? 'sugoDruid' : 'druid'
    }))

    returnResult(ctx, dataCubes)
  },

  /** 通用查询 */
  getDatasources: async ctx => {
    let { q } = ctx
    let {
      dataSources,
      childProjects,
      parentOfChildProjects,
      parentDataSources
    } = await getDataSourcesWithPermissions(ctx)
    
    const resDs = _.orderBy([
      ...dataSources,
      ...parentDataSources.map((ds, idx) => {
        const cp = childProjects[idx]
        return {
          ...ds,
          role_ids: cp.role_ids,
          child_project_id: cp.id,
          title: cp.name,
          updated_at: cp.updated_at
        }
      })
    ], 'updatedAt', 'desc')
    
    let res = { result: resDs }
    if (q.withDim) {
      res = await getDims(res.result)
    }
    ctx.body = res
  },

  /** 更新操作 */
  editDatasource: async ctx => {
    let id = ctx.params.id || 0
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let {
      title,
      peak,
      user_ids,
      role_ids,
      params
    } = ctx.q
    //检查name是否被占用
    let { user } = ctx.session
    let { company_id } = user
    let uid = user.id
    let obj = await db.SugoDatasources.findOne({
      where: {
        id,
        company_id
      }
    })
    if (!obj) { //如果数据源名称存在 则可能是更新别名
      return returnError(ctx, '数据源不存在', 404)
    }
    let updateResult
    await db.client.transaction(async t => {
      const transaction = { transaction: t }

      // 修改数据源名称，还要同时修改项目名称（如果有关联的话）
      if (title !== obj.title) {
        await db.SugoProjects.update({ name: title }, { where: { datasource_id: obj.id }, ...transaction })
      }
      //微观画像设置和用户类型数据设置为两张表单 可能互相覆盖 用旧数据obj防止覆盖
        updateResult = await obj.update({
          ...obj,
          title,
          updated_by: uid,
          user_ids,
          role_ids,
          peak,
          params
        }, transaction)
    })

    returnResult(ctx, updateResult)
  },
  /**
   * 删除操作
   */
  deleteDatasource: async ctx => {
    let { id = 0 } = ctx.q
    let { user } = ctx.session
    let { company_id } = user
    let preRs = await db.SugoDatasources.findOne({
      where: {
        id,
        company_id
      }
    })

    if (preRs.description === 'trial') {
      throw new Error('不允许删除')
    }

    //检查project是否使用
    // let proj = await db.SugoProjectManage.findOne({
    //   where: {
    //     datasource_id: preRs.id
    //   }
    // })

    // if (proj) {
    //   return returnError(ctx, `这个数据源由项目[${proj.name}]创建，请先删除项目`)
    // }

    let result = 0
    await db.client.transaction(async t => {
      const transaction = { transaction: t }

      let preDelSlices = await db.Slices.findAll({
        where: {
          druid_datasource_id: id
        },
        attributes: ['id'],
        ...transaction
      })
      let preDelSliceIds = preDelSlices.map(s => s.id)

      // 有关联关系，需要先删除依赖

      let queryBySliceIds = {
        where: {
          slice_id: {
            $in: preDelSliceIds
          }
        },
        transaction: t
      }
      let queryByDruidId = { where: { druid_datasource_id: id }, ...transaction }
      let queryByParentId = { where: { parentId: id }, ...transaction }

      await db.SugoSubscribe.destroy(queryBySliceIds)
      await db.DashboardSlices.destroy(queryBySliceIds)
      await db.SugoOverview.destroy(queryBySliceIds)
      await db.SugoRoleSlice.destroy(queryBySliceIds)

      await db.Slices.destroy({ where: { id: { $in: preDelSliceIds } }, ...transaction })

      await db.SugoCustomOrders.destroy(queryByDruidId)

      await db.Segment.destroy(queryByDruidId)

      await db.SugoDimensions.destroy(queryByParentId)

      await db.SugoMeasures.destroy(queryByParentId)

      await db.SugoFunnels.destroy(queryByDruidId)

      await db.SugoRetentions.destroy(queryByDruidId)

      result = await db.SugoDatasources.destroy({
        where: {
          id: id,
          status: 0,
          company_id
        },
        ...transaction
      })

      if (result > 0) {
        //删除kafka topic
        // if (preRs && preRs.name)
        // kafkaUtil.deleteTopic(preRs.name)
        // 如果数据源名称跟标签数据源名称相同则表示为单纯的画像项目，不做删除tindex操作
        if (preRs.name !== preRs.tag_datasource_name) {
          // 删除tindex表
          await SugoDatasourceService.deleteTopic(preRs.taskId)
        }
        // 删除uindex表操作
        // if (preRs.tag_datasource_name) {
        //   await UindexDataSourceService.getInstance().removeFore(preRs.tag_datasource_name)
        // }
      } else {
        throw new Error('已激活数据源不能删除')
      }
    })

    returnResult(ctx, result)
  },
  /**
   * kafka 回调更新状态处理 topic之后更新数据源状态为完成
   */
  modifyStatus: async ctx => {
    let id = ctx.params.id || 0
    //let status = ctx.request.body.status
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }

    let { user } = ctx.session
    let { company_id } = user
    //更新状态为1  
    let task = await db.SugoDatasources.findOne({
      where: {
        id,
        company_id
      }
    })
    let res = await task.update({
      status: 1
    })
    returnResult(ctx, res)
  },

  // 取消激活数据源
  unActiveDataSource: async ctx => {
    let { id, taskId } = ctx.params
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let { user } = ctx.session
    let { company_id } = user
    let where = { id, company_id } //组装where条件
    let res

    try {
      if (taskId) { //存在taskId则调用kafka indexing service shatdown task
        where.taskId = await SupervisorService.shutdownSupervisor(taskId)
      }
    } catch (e) {
      console.log('unActiveDataSource', e)
    } finally {
      //更新状态为未激活状态
      res = await db.SugoDatasources.update({ status: 0 }, { where })
    }

    // debug(res, 'res')
    if (res.length > 0 && res[0] === 0) { //未更新成功
      throw new Error('操作失败，该数据源为手动操作，没有对应的任务ID.')
    }
    returnResult(ctx, 'ok')
  },

  /**
   生成数据源接入客户端采集文件
   */
  generateAccessFile: async ctx => {
    ctx.request.acceptsEncodings('gzip', 'deflate', 'identity')
    const {
      connectionCharset,
      dbPassword,
      dbUsername,
      filter,
      ip,
      //name,
      port,
      retry,
      size,
      timeout,
      client_company_id,
      accessType,
      locate,
      analysis
    } = ctx.q

    if (_.values(ctx.q).length < 10) {
      return returnError(ctx, '下载失败，请配置完整参数！')
    }
    const instanceProps = dedent`
      #################################################
      ## mysql serverId
      canal.instance.mysql.slaveId = 1234

      # position info
      canal.instance.master.address = ${ip}:${port}
      canal.instance.master.journal.name = 
      canal.instance.master.position = 
      canal.instance.master.timestamp = 

      #canal.instance.standby.address = 
      #canal.instance.standby.journal.name =
      #canal.instance.standby.position = 
      #canal.instance.standby.timestamp = 

      # username/password
      canal.instance.dbUsername = ${dbUsername}
      canal.instance.dbPassword = ${dbPassword}
      canal.instance.defaultDatabaseName =
      canal.instance.connectionCharset = ${connectionCharset}

      # table regex
      canal.instance.filter.regex = .*\\..*
      # table black regex
      canal.instance.filter.black.regex =  
      #################################################
    `
    let company_id = client_company_id || ctx.session.user.company.id
    //sugo-canal的token验证值存入redis，在网关处做验证
    const redisKey = getAccessTokenKey(ACCESS_TYPES.MYSQL, company_id)
    let token = await redisGet(redisKey)
    if (!token) {
      token = generateAccessTokenVal(ACCESS_TYPES.MYSQL, company_id)
      //save to redis
      await redisSet(redisKey, token)
    }
    const query = `?type=${accessType}`
      + `&locate=${locate}`
      + `&analysis=${analysis}`
      + `&token=${token}`

    const url = `${collectGateway}`
      + `/${accessType === AccessDataTableType.Main ? 'post' : 'postdim'}`
      + query

    const clientProps = dedent`
      client.destination=custom
      client.table.filter=${filter}
      client.fetch.timeout=${timeout}
      client.fetch.batch.size=${size}
      client.send.retry=${retry}
      client.key.schema=mysql_event_schema
      client.key.table=mysql_event_table
      client.key.event=mysql_event_type
      client.page.size=20
      client.sink=SyncNginx
      client.nginx.url = ${url}
      client.astro.url = ${ctx.protocol}://${ctx.host}/api/project/post/dimensions${query}&company_id=${company_id}&platform=${PLATFORM.MYSQL}
    `
    const cwd = process.cwd()
    const sugoCanalDir = cwd + '/node_modules/sugo-canal'
    //require('child_process').execFile('tar', ['-cvf','my_tar.tar','my_directory/*'])
    let pack = tar.pack() // pack is a streams2 stream
    const addEntry = async (tarDir, fileDir) => {
      let arr = await readDir(fileDir)
      arr = arr
        .filter(filename => filename !== 'package.json' && filename !== '.npmignore')

      for (let filename of arr) {
        const fullname = path.join(fileDir, filename)
        const stat = await statFile(fullname)
        if (stat.isDirectory()) {
          const _tarDir = `${tarDir}/${filename}`
          pack.entry({ name: _tarDir, type: 'directory' })// 增加目录到tar
          await addEntry(_tarDir, fullname)
        } else if (stat.isFile()) {
          let mode = 644
          if (filename.endsWith('.sh') || filename.endsWith('.bat')) {// 脚本可执行权限
            mode = 755
          }
          let content = await readFile(fullname)
          pack.entry({
            name: `${tarDir}/` + filename, mode: parseInt(`${mode}`, 8)
          }, content)//  增加文件到tar
        }
      }
    }
    const pkg = require(`${sugoCanalDir}/package.json`)
    await addEntry('sugo-canal', sugoCanalDir) //添加sugo-canal目录文件到压缩包
    //添加界面输入参数到压缩包
    pack.entry({ name: 'sugo-canal/conf/client.properties' }, clientProps)
    pack.entry({ name: 'sugo-canal/conf/custom/instance.properties' }, instanceProps)
    pack.entry({ name: 'sugo-canal/logs', type: 'directory' })
    pack.finalize() //压缩完成
    const filename = `sugo-canal.deployer-${pkg.version}.tar.gz`
    ctx.set('Content-disposition', `attachment;filename=${filename}`) //设置下载文件头
    ctx.body = pack.pipe(
      zlib.createGzip({ //gzip 压缩
        level: 6,
        memLevel: 6
      })
    )
  },

  /** 获取数据接入redis中的token值，必须是先点击下载配置才会有值*/
  getAccessToken: async (ctx) => {
    const { type } = ctx.params //type为ACCESS_TYPES里的值
    if (!type) {
      return returnError(ctx, '获取token失败，无效参数')
    }
    const company_id = ctx.session.user.company_id
    ctx.body = await redisGet(getAccessTokenKey(ACCESS_TYPES[type], company_id))
  },

  /** 创建token */
  createAccessToken: async (ctx) => {
    const { type } = ctx.params
    const company_id = ctx.session.user.company_id
    const access_type = ACCESS_TYPES[type]

    const redisKey = getAccessTokenKey(access_type, company_id)
    let token = await redisGet(redisKey)

    if (!token) {
      token = generateAccessTokenVal(access_type, company_id)
      await redisSet(redisKey, token)
    }

    ctx.body = token
  },

  /** 维度接口api给数据清洗使用 */
  getDimsionsForApi: async ctx => {
    // 接口改为传入token，因为原型的数据源名称会重复。modify by WuQic 2017-05-17
    // 这里的projectId现在规定传入的是token
    const { projectId } = ctx.params
    const res = await SugoProjectService.getInfoWithSDKToken(projectId)
    if (!res.success) {
      return returnResult(ctx, null)
    }
    const project = res.result
    const dimensions = await SugoDatasourceService.getDimensionsForSDK(project.id)
    returnResult(ctx, dimensions)
  },

  //获取全公司所有维度指标，目前仅供新建用户组授权使用，以便减少查询次数
  getAllRes: async ctx => {
    let { company_id } = ctx.session.user
    let projs = await db.SugoProjects.findAll({
      where: {
        company_id
      },
      attributes: ['id', 'datasource_id'],
      raw: true
    })
    let datasourceIds = projs.map(p => p.datasource_id)
    let q = {
      where: {
        parentId: {
          $in: datasourceIds
        },
        company_id
      },
      attributes: ['title', 'id', 'name', 'parentId', 'role_ids'],
      raw: true
    }
    let dimensions = await db.SugoDimensions.findAll(q)
    let measures = await db.SugoMeasures.findAll(q)
    let tagGroups = await db.TagGroup.findAll({
      where: {
        datasource_id: { $in: datasourceIds },
        company_id
      },
      attributes: ['title', 'id', ['datasource_id', 'parentId'], 'role_ids'],
      raw: true
    })
    returnResult(ctx, {
      dimensions,
      measures,
      tagGroups
    })
  },

  /**
   * 更新supervisorJson时间列
   * @param ctx
   * @return {Promise.<*>}
   */
  async updateSupervisorJsonTimeColumn(ctx){
    const { datasource_id, time_column, format, granularity } = ctx.q
    const res = await SugoDatasourceService.findOne(datasource_id)
    if (!res.success) {
      return ctx.body = res
    }

    if (res.result.company_id !== ctx.session.user.company_id) {
      return ctx.body = Response.fail('无操作权限')
    }

    return ctx.body = await SugoDatasourceService.updateSupervisorJsonTimeColumn(
      datasource_id,
      time_column,
      granularity || {},
      format
    )
  }
}

export default dataSources
