import db from '../models'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import {checkLimit} from '../utils/resouce-limit'
import safeId from '../models/safe-id'
import {permissionControl} from './sugo-datasources.controller'
import DruidColumnType from '../../common/druid-column-type'
import {genSortedOrder} from '../../common/generate-sorted-data'
import {SDK_DEFAULT_DIMENSIONS} from '../../common/sdk-access-dimensions'
import sugoDatasourceService from '../services/sugo-datasource.service'
import SugoDimensionsService from '../services/sugo-dimensions.service'
import ProjectService from '../services/sugo-project.service'
import projectServices from '../services/sugo-project.service'
import {Expression} from 'sugo-plywood'
import {removeProcessContextCacheForPlywood} from '../utils/druid-middleware'
import Storage from '../services/public-redis-storage.service'
import UindexDimensionService from '../services/uindex-dimension.service'
import {AccessDataType, DimDatasourceType, KEY_NONE_TYPE, QUERY_ENGINE, DIMENSION_TYPES} from '../../common/constants'
import TagTypeService from '../services/tag-type.service'
import {buildTagItems} from '../../common/convertTagsValue'
import {recurFindFilter} from '../../common/druid-query-utils'
import { immutateUpdate } from '../../common/sugo-utils';

const DruidColumnTypeRevert = _.invert(DruidColumnType)
const sdkDefaultDims = _.map(SDK_DEFAULT_DIMENSIONS, d => d[0])


/** 查询列表数据 */
const getDimensions = async ctx => {
  let { user } = ctx.session
  let { company_id } = user || {}
  let dsId = ctx.params.id || ''
  let offset = ctx.query.offset || 0
  let limit = ctx.query.limit || 9999
  let noauth = ctx.query.noauth || ''
  let datasource_type = ctx.query.datasource_type || 'default'
  let search = ctx.query.name ? decodeURIComponent(ctx.query.name) : ''
  let includeNotUsing = ctx.query.includeNotUsing || null
  let includeDesensitiz = ctx.query.includeDesensitiz || null
  let { tags, noSort, useUserCustomOrder } = ctx.query
  if (!dsId) {
    throw new Error('别闹，id不能为空啊')
  }
  
  // 如果传入的是行为项目datasourceId 则根据行为项目的datasourceId 查询标签项目的标签设置
  if (datasource_type === DimDatasourceType.tag) {
    let project = await projectServices.findByDataSourceId(dsId)
    if (project.success && _.get(project, 'result.accessType', '') !== AccessDataType.Tag) {
      const tagProject = await projectServices.findByTagName(_.get(project, 'result.tag_datasource_name', ''))
      if (project.success) {
        dsId = _.get(tagProject, 'result.datasource_id', '')
      }
    }
  }

  let query = {
    parentId: dsId,
    company_id
  }
  if (search) {
    query.name = search
  }

  if (!_.isEmpty(tags)) {
    tags = tags.split(',')
    Object.assign(query, {
      tags: {
        $or: tags.map(r => {
          return {
            $contains: r
          }
        })
      }
    })
  }

  let q = {
    where: query,
    offset: offset,
    limit: limit,
    order: [ ['updatedAt', 'DESC'] ]
  }

  if (datasource_type !== 'all') {
    q.where.datasource_type = {
      $like: '%' + datasource_type + '%'
    }
  }

  if (!noauth) permissionControl(q, user)
  //前端携带该属性 返回禁用标签 否则该请求默认不返回禁用的标签
  if (!includeNotUsing) {
    q = immutateUpdate(q, 'where.params', () => {
      // 只有 isUsingTag === false 才隐藏
      return { $or: [ {isUsingTag: null}, {isUsingTag: true} ] }
    })
  }
   //前端携带该属性 返回脱敏标签 否则该请求默认不返回脱敏的标签
  if (!search && !includeDesensitiz) {
    //过滤脱敏标签
    q.where.name = {
      $notILike: '%__encode'
    }
  }
  let resp = await db.SugoDimensions.findAndCountAll(q)
  let result = resp.rows
  //判断是否需要排序/隐藏
  if (!noSort) {
    let myOrders = await db.SugoCustomOrders.findOne({
      where: {
        druid_datasource_id: dsId,
        user_id: null
      }
    })
    myOrders = _.isEmpty(myOrders) ? [] : myOrders.dimensions_order
    result = genSortedOrder(result, myOrders)

    if (useUserCustomOrder) {
      let myCustomOrders = await db.SugoCustomOrders.findOne({
        where: {
          druid_datasource_id: dsId,
          user_id: user.id
        }
      })
      result = genSortedOrder(result, myCustomOrders && myCustomOrders.dimensions_order || [])
    }
  }

  ctx.body = {
    total: resp.count,
    data: result
  }
}

//根据pid返回所有的维度json数据
const openList = async ctx => {
  let q = ctx.request.body || {}
  if (!q.parentId) {
    return returnError(ctx, 'parentId required')
  }
  let results = await db.SugoDimensions.findAll({
    where: q,
    attributes: ['id', 'name', 'title', 'type']
  })
  ctx.body = results.map(r => {
    r.type = DruidColumnTypeRevert[r.type + '']
    return r
  })
}

/**
 * 使用datasource_name查询所有维度，用于web sdk埋点
 * 维度只会返回name,type,title属性
 * @param ctx
 * @return {Promise.<*>}
 */
async function getDimensionsByDataSource(ctx) {
  const { token } = ctx.request.body || {}

  if (!token) {
    ctx.status = 400
    return ctx.body = 'dataSource required'
  }

  const ins = await ProjectService.getInfoWithSDKToken(token)

  if (!ins.success) {
    ctx.body = ins.message
  }

  return ctx.body = await sugoDatasourceService.getDimensionsForSDK(ins.result.id)
}

/**
 * 保存维度
 * @param {any} ctx
 * @param {any} transaction
 * @returns
 */
const createDimension = async (ctx, transaction) => {
  let body = ctx.q
  let { user } = ctx.session
  let { company_id, id } = user
  let parentId = ctx.params.id || 0
  let {
    name,
    title,
    type,
    role_ids,
    user_ids,
    tags,
    tag_desc,
    tag_value,
    sub_type,
    datasource_type,
    tag_extra,
    tag_type_id,
    params = {}
  } = body
  let uid = safeId()
  if (params.type === 'business') {
    uid = 'jdbc_' + uid
  }
  let defs = {
    id: uid,
    title,
    type,
    company_id,
    name,
    tag_desc,
    role_ids,
    user_ids,
    datasource_type,
    created_by: id,
    tag_extra,
    tags,
    params
  }
  let proj = await db.SugoProjects.findOne({
    where: {
      datasource_id: parentId
    }
  })
  //如果是创建uindex标签和维度
  if (_.includes(datasource_type, 'tag')) {
    let dimName = name// 默认存储名称已经转换过了
    //检查是否已经存在维度
    let existNames = await UindexDimensionService.getDimensions({
      datasource_name: proj.tag_datasource_name
    })
    existNames = _.get(existNames, 'dimensions') || []
    existNames = existNames.map(d => d.name)
    //如果不存在就加入维度
    if (!existNames.includes(dimName)) {
      await UindexDimensionService.addDimension({
        datasource_name: proj.tag_datasource_name,
        names: [dimName]
      })
    }
    defs.is_druid_dimension = true
    //更新字典表数据
    let items = buildTagItems(
      tag_value,
      name,
      proj,
      sub_type,
      company_id,
      id
    )
    await db.client.transaction(async transaction => {
      //删除旧记录
      await db.SugoTagDictionary.destroy({
        where: {
          company_id,
          name,
          project_id: proj.id
        },
        transaction
      })
      await db.SugoTagDictionary.bulkCreate(items, { transaction })
    })
  }

  //Search for a specific element or create it if not available
  let result = await db.SugoDimensions.findOrCreate({
    where: {
      name: name,
      parentId: parentId,
      company_id: company_id
    }, //根据parentId和name去重严重
    defaults: defs,
    transaction
  })

  let flag = result[1]
  if (!flag) {
    return returnError(ctx, '名字已经存在，换一个吧')
  }

  // 如果设置了标签分类，条件tag_type记录
  if (tag_type_id && tag_type_id !== KEY_NONE_TYPE) {
    // 增加标签分类记录
    await TagTypeService.getInstance().create({
      type: title || name,
      created_by: id,
      datasource_id: parentId,
      dimension_ids: [result[0].id],
      tag_tree_id: tag_type_id,
      company_id
    }, { transaction })
  }

    //如果选择了脱敏则新增一个维度
    if (_.get(result[0], 'tag_extra.is_Desensitiz') === '1') {
      let isExistEncode = await db.SugoDimensions.findOne({
        where: {
          name: name + '__encode',
          parentId,
          company_id
        }
      })
      if (!isExistEncode) {
        await db.SugoDimensions.create({
          name: name + '__encode',
          type: DIMENSION_TYPES['string'],
          datasource_type: 'tag',
          parentId,
          company_id,
          role_ids,
          created_by: id,
          params: { isUsingTag: true }
        }, {
          transaction
        })
      }
    }

  // 清除redis中缓存的维度
  await Storage.SDKDimension.del(proj.id)
  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(proj.datasource_name)
  if(proj.tag_datasource_name) {
    await removeProcessContextCacheForPlywood(proj.tag_datasource_name)
  }
  return defs
}

/** 业务表维度保存 */
const addDimension = async ctx => {
  let body = ctx.q
  let {
    name, params = {}, sourceName,
    datasource_type
  } = body
  let isUindex = body.isUindex || datasource_type === DimDatasourceType.tag
  let defs
  if (!name) {
    throw new Error('别闹，名字不能为空啊')
  }
  await checkLimit(ctx, 'dimension')
  if (params.type === 'business') {
    await checkLimit(ctx, 'businessdimension', { params: { type: 'business' } })
    let resInfo = await SugoDimensionsService.getBusinessInfo(params)
    if (!resInfo.success) {
      return returnError(ctx, resInfo.message)
    }
    await db.client.transaction(async transaction => {
      defs = await createDimension(ctx, transaction)
      let res = await SugoDimensionsService.lookup(defs.id, params, resInfo.data.sql, resInfo.data.settingInfo, isUindex)
      if (!res.success) {
        transaction.rollback()
        return returnError(ctx, res.message)
      }
      returnResult(ctx, defs)
    })
  } else {
    defs = await createDimension(ctx)
    returnResult(ctx, defs)
  }
  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(sourceName)
}

const updateDimension = async (ctx, transaction) => {
  let body = ctx.q
  let { id } = ctx.params
  if (!id) {
    throw new Error('别闹，id不能为空啊')
  }
  let {
    name,
    sourceName,
    type,
    sub_type,
    tag_value,
    tag_type_id
  } = body
  let update = _.pick(body, ['title', 'datasource_type', 'name', 'type', 'role_ids', 'user_ids', 'tags', 'params', 'tag_desc', 'tag_extra'])

  let { user } = ctx.session
  let { company_id, id: user_id } = user
  /** @type {DimensionModel} */
  let obj = await db.SugoDimensions.findOne({
    where: {
      id,
      company_id
    }
  })

  if (!obj) throw new Error('资源不存在')
  //如果有改name或者类型，则需要再检测druid
  if ((name && name !== obj.name) || (type >= 0 && obj.type !== type)) {
    //debug(name, obj.name, type, obj.type,'enter')
    //未修改类型，不需要检测是否有数据上报
    const druidDims = await sugoDatasourceService.getDruidDims(sourceName)
    if (druidDims[obj.name]) {
      throw new Error(
        `维度${obj.title || obj.name}已经有数据上报，不能修改类型`
      )
    } else if (sdkDefaultDims.includes(obj.name)) {
      throw new Error(
        `${obj.title || obj.name}是预定义维度，不能修改类型`
      )
    }
  }

  let result = await obj.update(update, { transaction })
  //如果选择了脱敏且不存在__encode记录则新增一个维度
  if (_.get(update,'tag_extra.is_Desensitiz') === '1') {
    let isExistEncode = await db.SugoDimensions.findOne({
      where: {
        name: name + '__encode',
        parentId: obj.parentId,
        company_id
      }
    })
    if (!isExistEncode) {
      await db.SugoDimensions.create({
        name: name + '__encode',
        type: DIMENSION_TYPES['string'],
        datasource_type: 'tag',
        parentId: obj.parentId,
        company_id,
        created_by: user_id,
        role_ids: obj.role_ids,
        params: { isUsingTag: true }
      }, {
          transaction
        })
    }
  }

  let proj = await db.SugoProjects.findOne({
    where: {
      datasource_id: obj.parentId
    }
  })
  if (_.includes(obj.datasource_type, 'tag') && typeof tag_value !== 'undefined') {
    //更新字典表数据
    let items = buildTagItems(
      tag_value,
      name,
      proj,
      sub_type,
      company_id,
      user_id
    )
    await db.client.transaction(async (transaction) => {
      // 如果是更新需要保留标签最近更新字段信息
      let recent_updated_at = null
      let tagDict = await db.SugoTagDictionary.findOne({
        where: {
          name,
          project_id: proj.id
        }
      })
      if (tagDict) {
        tagDict = tagDict.get({ plain: true })
        recent_updated_at = tagDict.recent_updated_at || null
      }
      // 删除旧记录
      await db.SugoTagDictionary.destroy({
        where: {
          company_id,
          name,
          project_id: proj.id
        },
        transaction
      })
      items = items.map(item => {
        return {
          ...item,
          recent_updated_at
        }
      })
      await db.SugoTagDictionary.bulkCreate(items, { transaction })
    })
  }

  // 如果设置了标签分类，条件tag_type记录
  if (tag_type_id) {
    if (tag_type_id === KEY_NONE_TYPE) {
      // 如果选择了未分类，则删除分类关联记录
      await TagTypeService.getInstance().remove({
        dimension_id: obj.id
      }, { transaction })
    } else {
      const count = await TagTypeService.getInstance().count({ dimension_id: obj.id })
      if (count > 0) {
        // 更新标签分类关联记录
        await TagTypeService.getInstance().__update({
          dimension_id: obj.id
        }, {
            tag_tree_id: tag_type_id,
            type: update.title || update.name
          }, transaction)
      } else {
        await TagTypeService.getInstance().create({
          type: update.title || update.name,
          created_by: user_id,
          datasource_id: obj.parentId,
          dimension_ids: [obj.id],
          tag_tree_id: tag_type_id,
          company_id
        }, { transaction })
      }
    }
  }

  // 清除redis中缓存的维度
  if (proj) {
    await Storage.SDKDimension.del(proj.id)
  }
  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(sourceName)
  if(proj.tag_datasource_name) {
    await removeProcessContextCacheForPlywood(proj.tag_datasource_name)
  }
  return { result, oldName: obj.name }
}

const checkSubTagCanNotEdit = async (ugs, dimName) => {
  // 确认子标签是否被用户分群使用
  let canNotEditUgs = ugs.filter(ug => recurFindFilter(ug.params.tagFilters, flt => flt.col === dimName))
  if (!_.isEmpty(canNotEditUgs)) {
    throw new Error(`此标签正在被用户分群 ${canNotEditUgs.map(ug => ug.title).join(', ')} 使用，不能修改或删除`)
  }
}

/** 业务表维度更新 */
const editDimension = async ctx => {
  let body = ctx.q
  let { id: dimId } = ctx.params
  if (!dimId) {
    throw new Error('别闹，id不能为空啊')
  }
  let originalDim = await db.SugoDimensions.findOne({
    where: { id: dimId },
    raw: true
  })
  if (body.tag_value) {
    // 确认标签是否被用户分群使用
    let ugs = await db.Segment.findAll({
      where: {
        company_id: originalDim.company_id,
        druid_datasource_id: originalDim.parentId,
      },
      raw: true
    })
    await checkSubTagCanNotEdit(ugs, originalDim.name)
  }

  let {
    sourceName,
    params = {},
    datasource_type
  } = body
  let isUindex = body.isUindex || datasource_type === DimDatasourceType.tag
  let res
  if (params.type === 'business') {
    let resInfo = await SugoDimensionsService.getBusinessInfo(params)
    if (!resInfo.success) {
      return returnError(ctx, resInfo.message)
    }
    await db.client.transaction(async transaction => {
      res = await updateDimension(ctx, transaction)
      let resUpdateLookUp = await SugoDimensionsService.lookup(originalDim.name, params, resInfo.data.sql, resInfo.data.settingInfo, isUindex)
      if (!resUpdateLookUp.success) {
        transaction.rollback()
        return returnError(ctx, resUpdateLookUp.message)
      }
      returnResult(ctx, res.result)
    })
  } else {
    res = await updateDimension(ctx)
    returnResult(ctx, res.result)
  }
  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(sourceName)
}

/** 删除 */
const deleteDimension = async ctx => {
  let { names, parentId, sourceName } = ctx.q

  if (!names || !_.isArray(names) || !names.length) return returnError(ctx, '维度名不能为空')
  let { user } = ctx.session
  let { company_id } = user

  // 确认标签是否被用户分群使用
  let originalDims = await db.SugoDimensions.findAll({
    where: {
      name: { $in: names },
      parentId: parentId,
      company_id
    },
    raw: true
  })
  let ugs = await db.Segment.findAll({
    where: {
      company_id,
      druid_datasource_id: parentId
    },
    raw: true
  })
  for (let dbDim of originalDims) {
    await checkSubTagCanNotEdit(ugs, dbDim.name)
  }

  // 清除redis中缓存的维度
  const project = await ProjectService.findByDataSourceId(parentId)
  if (project.success) {
    await Storage.SDKDimension.del(project.result.id)
  }

  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(sourceName)
  const tagDatasourceName = _.get(project, 'result.tag_datasource_name')
  if(tagDatasourceName) {
    await removeProcessContextCacheForPlywood(tagDatasourceName)
  }
  let res = await SugoDimensionsService.deleteDimension(parentId, sourceName, names, company_id)
  if (res.success) {
    return returnResult(ctx, res)
  } else {  
    return returnError(
      ctx,
      res.message
    )
  }

  //检测维度有没有数据上报
  // const druidDims = await sugoDatasourceService.getDruidDims(sourceName)
  // let exitedInDruidDims = []
  // names.forEach((name) => {
  //   if(druidDims[name]) {
  //     exitedInDruidDims.push(name)
  //   } else {
  //     sdkDefaultDims.includes(name) && exitedInDruidDims.push(name)
  //   }
  // })
  // if(exitedInDruidDims.length){
  //   return returnError(
  //     ctx,
  //     `维度${exitedInDruidDims.join(',')}已经有数据上报，不能删除`
  //   )
  // }

}

//同步维度
const sync = async ctx => {
  let id = ctx.params.id || ''
  let { company_id, id: created_by } = ctx.session.user

  if (!id) {
    throw new Error('别闹，id不能为空啊')
  }

  let datasource = await db.SugoDatasources.findOne({
    where: {
      id,
      company_id
    }
  })

  if (!datasource) {
    return returnError(ctx, '项目不存在', 404)
  }

  //同步操作
  let res = await sugoDatasourceService.syncDimension(id, company_id, created_by)

  // 清除redis中缓存的维度
  const project = await ProjectService.findByDataSourceId(id)
  if (project.success) {
    await Storage.SDKDimension.del(project.result.id)
  }
  // 清除redis中缓存的plywood-context缓存标识
  await removeProcessContextCacheForPlywood(datasource.name)
  if(datasource.tag_datasource_name) {
    await removeProcessContextCacheForPlywood(datasource.tag_datasource_name)
  }
  returnResult(ctx, res)
}

//获取druid里面的维度
const getDruidDimensions = async ctx => {
  let sourceName = ctx.params.name || ''
  if (!sourceName) {
    throw new Error('别闹，数据源名不能为空啊')
  }
  let { datasource_type } = ctx.query
  let queryEngine = datasource_type === DimDatasourceType.tag
    ? QUERY_ENGINE.UINDEX
    : QUERY_ENGINE.UINDEX
  let result = await sugoDatasourceService.getDruidDims(sourceName, queryEngine)
  returnResult(ctx, result)
}

const validFormula = async ctx => {

  try {
    let { formula, parentId } = ctx.q

    Expression.parse(formula)
    if (formula.indexOf('$') === -1) {
      return returnError(ctx, `表达式错误，未匹配到维度字段"${formula}"`, 200)
    }
    if (formula.indexOf('$main.count()') > -1) {
      return returnResult(ctx, null)
    }
    //let regex = /(\$[^main][A-Za-z\w_]{1,49})/gi;
    let regex = /(\$[\w_]+)/gi
    let results = _.without(formula.match(regex), '$main', '$NOW')
    if (results.length > 1) {
      throw new Error('目前不支持大于1个维度的公式')
    }
    var nameSet = new Set()
    for (let item of results) {
      nameSet.add(item.replace('$', ''))
    }
    //console.log(Array.from(nameSet));
    //查询匹配的到的维度字段且必须为非string的列
    let queryResult = await db.client.query('SELECT COUNT(*) as total FROM sugo_dimensions WHERE name IN(:names) and "parentId" = :parentId', {
      replacements: {
        names: Array.from(nameSet),
        parentId
      },
      type: db.client.QueryTypes.SELECT
    })

    if (queryResult[0].total < nameSet.size) { //如果查询出来的结果跟匹配的结果不同则表明有错误的维度信息
      return returnError(ctx, `表达式错误，表达式包含的维度必须是存在的维度name[${Array.from(nameSet)}]`, 200)
    }
    // TODO 解析expression验证括号内的字段信息
    returnResult(ctx)
  } catch (e) {
    returnError(ctx, e.message || e.stack, 200)
  }

}

//获取uindex维度对应的所有标签信息
const getDimensionTagInfo = async (ctx) => {
  let { name, project_id } = ctx.q
  let { company_id } = ctx.session.user
  let res = await db.SugoTagDictionary.findAll({
    where: {
      name,
      project_id,
      company_id
    }
  })
  returnResult(ctx, res)
}

export default {
  getDruidDimensions,
  getDimensions,
  openList,
  getDimensionTagInfo,
  addDimension,
  editDimension,
  deleteDimension,
  sync,
  validFormula,
  getDimensionsByDataSource
}
