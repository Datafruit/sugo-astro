import db from '../models'
import _ from 'lodash'
import {checkLimit} from '../utils/resouce-limit'
import { permissions, commonPermissions } from '../models/apis'
import { returnError, returnResult } from '../utils/helper'
import roleService from '../services/role.service'
import {getDataSourcesByIds} from '../services/sugo-datasource.service'
import {getDimensionsByIds} from '../services/sugo-dimensions.service'
import {getMeasuresByIds} from '../services/sugo-meaures.service'

//获取用户组
const getRoles = async (ctx) => {
  let {user} = ctx.session
  let {company_id} = user
  let {query = {}, noRoute = false} = ctx.q || {}
  if (!query.order) query.order = [ ['updated_at', 'DESC'] ]
  if(!noRoute) {
    query.include = [{
      model: db.SugoRoleRoute
    }]
    query.attributes = {
      include: [
        [
          db.client.literal(
            '(select count(*) from sugo_user_role where "role_id"="SugoRole".id)'
          ),
          'user_count'
        ]
      ]
    }
  }

  query.where = query.where || {}
  query.where.company_id = company_id
  let rows = await db.SugoRole.findAll(query)

  returnResult(
    ctx,
    rows.map(r => {
      return {
        ...r.get({plain: true}),
        permissions: r.SugoRoleRoutes.map(sr => sr.route_id)
      }
    })
  )
}

//权限列表
const getPermissions = ctx => {
  ctx.body = {
    result: permissions,
    code: 0
  }
}

//新增用户组
const addRole = async (ctx) => {

  let {
    role = {}
  } = ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  let {name, dataPermissions, funcPermissions} = role
  if (!name) {
    return returnError(ctx, '用户组名称不能为空')
  }
  await checkLimit(ctx, 'role')
  let permissionList = funcPermissions.concat(
    commonPermissions.map(p => p.id)
  )
  permissionList = _.uniq(permissionList)

  //创建
  role.created_by_fk = id
  role.changed_by_fk = id
  role.company_id = company_id
  delete role.id
  role.type = 'user-created'
  let where = {
    company_id,
    name
  }

  let res = await db.client.transaction(async (transaction) => {

    //创建用户组
    let [result, isCreate] = await db.SugoRole.findOrCreate({
      where,
      defaults: role,
      transaction
    })
    if (result && isCreate === false) {
      throw new Error('用户组名称重复了，换一个吧')
    }

    let roleId = result.id

    //更新功能权限
    await roleService.funcAuth({
      roleId,
      transaction,
      permissionList
    })

    //更新数据权限
    await roleService.dataAuth({
      ...dataPermissions,
      company_id,
      roleId,
      transaction
    })

    return result

  })

  return returnResult(ctx, res)

}

//更新用户组
const editRole = async ctx => {

  let {
    id, update
  } = ctx.q
  let {user} = ctx.session
  let {company_id, id: userId} = user

  if (!id) {
    return returnError(ctx, 'id不能为空')
  }

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  let inDb = await db.SugoRole.findOne(query1)

  //判断是否重复
  if (!inDb) {
    return returnError(ctx, '找不到用户组', 404)
  } else if (inDb.type === 'built-in') {
    return returnError(ctx, '不允许编辑这个用户组', 404)
  }

  //检测名称重复
  let {name} = update
  if (name) {
    let dup = await db.SugoRole.findOne({
      where: {
        company_id,
        id: {
          $ne: id
        },
        name
      }
    })
    if (dup) {
      return returnError(ctx, '用户组名称重复了，换一个吧')
    }
  }


  //创建
  let role = _.pick(update, ['name', 'description'])
  role.changed_by_fk = userId

  let res = await db.client.transaction(async (transaction) => {

    //更新用户组
    await db.SugoRole.update(role, {
      where: {
        id,
        company_id
      },
      transaction
    })

    //更新功能权限
    let {dataPermissions, funcPermissions} = update
    if (funcPermissions) {
      let permissionList = funcPermissions.concat(
        commonPermissions.map(p => p.id)
      )
      permissionList = _.uniq(permissionList)
      await roleService.funcAuth({
        roleId: id,
        transaction,
        permissionList
      })
    }

    //更新数据权限
    if (dataPermissions) {
      await roleService.dataAuth({
        ...dataPermissions,
        company_id,
        roleId: id,
        transaction
      })
    }

    return 'ok'

  })

  returnResult(ctx, res)

}

//删除用户组
const deleteRole = async ctx => {

  let {
    id
  } = ctx.q
  let {user} = ctx.session
  let {company_id} = user

  if (!id) {
    return returnError(ctx, 'id不能为空')
  }

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  let inDb = await db.SugoRole.findOne(query1)

  //判断是否重复
  if (!inDb) {
    return returnError(ctx, '找不到用户组', 404)
  } else if (inDb.type === 'built-in') {
    return returnError(ctx, '不允许删除这个用户组')
  }

  //查找关联用户
  let count = await db.SugoUserRole.count({
    where: {
      role_id: id
    }
  })

  if (count) {
    return returnError(ctx, `不允许删除这个用户组, 因为还有${count}个用户属于这个用户组`)
  }

  let isShareDashBoard = await db.SugoRoleDashboard.findAll({
    where: {
      role_id: id
    },
    raw: true
  })
  if (!_.isEmpty(isShareDashBoard)) {
    await db.SugoRoleDashboard.destroy({
      where: {
        role_id: id
      }
    })
  }

  let query2 = {
    where: {
      role_id: id
    }
  }
  let res
  await db.client.transaction(async (t) => {
    let target = {
      transaction: t
    }
    await db.SugoRoleSlice.destroy(query2, target)
    await db.SugoRoleRoute.destroy(query2, target)
    res = await db.SugoRole.destroy(query1, target)
  })

  returnResult(ctx, res)
}

export async function addRoleLogExplain(log, {apiIdDict}) {
  let {datasourceIds, dimensionIds, measureIds} = log.body.role.dataPermissions || {}
  let dataSources = _.isEmpty(datasourceIds) ? [] : await getDataSourcesByIds(datasourceIds)
  let dbDims = _.isEmpty(dimensionIds) ? [] : await getDimensionsByIds(dimensionIds)
  let dbMeasures = _.isEmpty(measureIds) ? [] : await getMeasuresByIds(measureIds)
  let dimGroup = _.groupBy(dbDims, 'parentId')
  let measureGroup = _.groupBy(dbMeasures, 'parentId')
  return [
    `${log.username} 创建了用户组 ${log.body.role.name}，其功能权限为：`,
    _(log.body.role.funcPermissions).map(path => apiIdDict[path])
      .groupBy(api => api ? api.class + '-' + api.group : 'missing')
      .omitBy((v, k) => k === 'missing')
      .mapValues(apis => apis.map(a => a.title).join('，'))
      .thru(groupDict => _.keys(groupDict).map(g => g + '：' + groupDict[g]).join('\n'))
      .value(),
    `其数据权限为： ${_.isEmpty(dataSources) ? '（无权限）' : ''}`,
    ..._.flatMap(dataSources, dbDs => {
      let dbDims = dimGroup[dbDs.id], dbMeasures = measureGroup[dbDs.id]
      return [
        `授权访问数据源 ${dbDs.title || dbDs.name}，以及其维度 ${_.size(dbDims)} 个，指标 ${_.size(dbMeasures)} 个`,
        `维度分别是：${dbDims.map(d => d.title || d.name).join('，')}`,
        `指标分别是：${dbMeasures.map(m => m.title || m.name).join('，')}`
      ]
    })
  ].join('\n')
}

export async function editRoleLogExplain(log, {apiIdDict}) {
  let {datasourceIds, dimensionIds, measureIds} = log.body.update.dataPermissions || {}
  let dataSources = _.isEmpty(datasourceIds) ? [] : await getDataSourcesByIds(datasourceIds)
  let dbDims = _.isEmpty(dimensionIds) ? [] : await getDimensionsByIds(dimensionIds)
  let dbMeasures = _.isEmpty(measureIds) ? [] : await getMeasuresByIds(measureIds)
  let dimGroup = _.groupBy(dbDims, 'parentId')
  let measureGroup = _.groupBy(dbMeasures, 'parentId')
  return [
    `${log.username} 将用户组 ${log.body.update.name} 的功能权限修改为：`,
    !log.body.update.funcPermissions ? '（无变更）' : _(log.body.update.funcPermissions)
      .map(path => apiIdDict[path])
      .groupBy(api => api ? api.class + '-' + api.group : 'missing')
      .omitBy((v, k) => k === 'missing')
      .mapValues(apis => apis.map(a => _.get(a,'title')).join('，'))
      .thru(groupDict => _.keys(groupDict).map(g => g + '：' + groupDict[g]).join('\n'))
      .value(),
    `数据权限修改为： ${_.isEmpty(dataSources) ? '（无变更）' : ''}`,
    ..._.flatMap(dataSources, dbDs => {
      let dbDims = dimGroup[dbDs.id], dbMeasures = measureGroup[dbDs.id]
      return [
        `授权访问数据源 ${dbDs.title || dbDs.name}，以及其维度 ${_.size(dbDims)} 个，指标 ${_.size(dbMeasures)} 个`,
        `维度分别是：${dbDims.map(d => d.title || d.name).join('，')}`,
        `指标分别是：${dbMeasures.map(m => m.title || m.name).join('，')}`
      ]
    })
  ].join('\n')
}

export default {getRoles, deleteRole, addRole, editRole, getPermissions}
