import db from '../models'
import { decompressUrlQuery } from '../../common/sugo-utils'
import {returnResult, returnError} from '../utils/helper'
import _ from 'lodash'

/***
 * pivot 保证书签查询条件api接口
 */
const pivotMark = {
  /** 查询列表数据 */
  list: async ctx => {
    let body =  ctx.q
    let {user: { id : userId }} = ctx.session

    let query = _.defaultsDeep({
      where: {
        user_id: userId
      },
      order: [
        ['updatedAt', 'DESC']
      ]
    }, body)
    let result = await db.SugoPivotMarks.findAll(query)
    result = (result || []).map((obj, idx) => {
      let { id, name, queryParams } = obj
      return { id, name, queryParams, idx }
    })
    returnResult(ctx, result)
  },

  /** 创建query标签*/
  create: async ctx => {
    let {user} = ctx.session
    let {id} = user
    let { name, queryParams } = ctx.q
    if (!name || _.isEmpty(queryParams)) {
      return returnError(ctx, '保存失败，缺少参数')
    }
    // 检查同名
    let existedSameName = await db.SugoPivotMarks.findOne({
      where: {
        name: name,
        queryParams: {
          druid_datasource_id: queryParams.druid_datasource_id,
          params: {
            openWith: 'source-data-analytic' === queryParams.params.openWith ? 'source-data-analytic' : null
          }
        }
      }
    })
    if (existedSameName) {
      return returnError(ctx, '保存失败，存在同名的书签')
    }

    let res = await db.SugoPivotMarks.create({
      name,
      queryParams,
      user_id: id
    })
    returnResult(ctx, res)
  },

  /** 更新query标签*/
  update: async ctx => {
    let id = ctx.params.id || 0
    let { name, queryParams } = ctx.q
    if (!id || !queryParams || !name) {
      return returnError(ctx, '保存失败，缺少参数')
    }
    let {user} = ctx.session
    let user_id = user.id

    // 检查同名
    let existedSameName = await db.SugoPivotMarks.findOne({
      where: {
        id: {$ne: id},
        name: name,
        queryParams: {
          druid_datasource_id: queryParams.druid_datasource_id,
          params: {
            openWith: 'source-data-analytic' === queryParams.params.openWith ? 'source-data-analytic' : null
          }
        }
      }
    })
    if (existedSameName) {
      return returnError(ctx, '保存失败，存在同名的书签')
    }

    let res = await db.SugoPivotMarks.update(
      { name, queryParams },
      { where: {
        id,
        user_id
      } }
    )
    returnResult(ctx, res)
  },

  /** 删除query标签*/
  delete: async ctx => {
    let id = ctx.params.id || 0
    if (!id) {
      return ctx.body = returnError(ctx, '操作失败，缺少参数')
    }
    let {user} = ctx.session
    let user_id = user.id
    let res = await db.SugoPivotMarks.destroy( { where: { id, user_id } })
    returnResult(ctx, res)
  }

}

export default pivotMark
