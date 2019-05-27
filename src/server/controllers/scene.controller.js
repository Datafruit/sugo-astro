/**
 * Created on 14/03/2017.
 */

import db from '../models'
import { returnResult } from '../utils/helper'
import { Response } from '../utils/Response'
import { defineTypes, PropTypes } from '../../common/checker'
import { SceneType } from '../../common/constants'

const SceneTypeValues = Object.keys(SceneType).map(k => SceneType[k])

const Checker = {
  Scene: {
    create: defineTypes({
      project_id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(SceneTypeValues).isRequired,
      params: PropTypes.object.isRequired
    }),
    update: defineTypes({
      id: PropTypes.string.isRequired,
      project_id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(SceneTypeValues).isRequired,
      params: PropTypes.object
    }),
    del: defineTypes({
      id: PropTypes.string.isRequired
    }),
    query: defineTypes({
      id: PropTypes.string.isRequired
    })
  },
  Collection: {
    SceneOfProjects: defineTypes({
      projects: PropTypes.array.isRequired
    })
  }
}

export default {
  create: async ctx => {
    const param = ctx.q
    const check = Checker.Scene.create(param)
    const resp = new Response()
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const { project_id, type, params } = param
    
    const project = await db.SugoProjects.find({
      where: {
        id: project_id,
        company_id
      }
    })
    
    if (!project) {
      resp.success = false
      resp.message = '项目不存在'
      return returnResult(ctx, resp.serialize())
    }
    
    let record = await db.SugoSceneData.find({
      where: { project_id }
    })
    
    if (record) {
      resp.success = false
      resp.message = '项目已有记录，不可再创建'
      return returnResult(ctx, resp.serialize())
    }
    
    record = await db.SugoSceneData.create({
      project_id,
      type,
      params,
      created_by: user_id
    })
    
    resp.result = record.get({ plain: true })
    return returnResult(ctx, resp.serialize())
  },
  
  update: async ctx => {
    const param = ctx.q
    const check = Checker.Scene.update(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const { id, project_id, type, params } = param
    
    const project = await db.SugoProjects.find({
      where: {
        id: project_id,
        company_id
      }
    })
    
    if (!project) {
      resp.success = false
      resp.message = '项目不存在'
      return returnResult(ctx, resp.serialize())
    }
    
    const record = await db.SugoSceneData.find({ where: { id, project_id } })
    
    if (!record) {
      resp.success = false
      resp.message = '记录不存在'
      return returnResult(ctx, resp.serialize())
    }
    
    const next = { type, params, project_id, update_by: user_id }
    await db.SugoSceneData.update(next, { where: { id } })
    
    resp.result = { ...record.get({ plain: true }), ...next }
    return returnResult(ctx, resp.serialize())
  },
  
  del: async ctx => {
    const param = ctx.q
    const check = Checker.Scene.del(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { company_id } = ctx.session.user
    const { id } = param
    const record = await db.SugoSceneData.find({ where: { id } })
    
    if (!record) {
      resp.success = false
      resp.message = '记录不存在'
      return returnResult(ctx, resp.serialize())
    }
    
    const project = await db.SugoProjects.find({
      where: {
        id: record.project_id,
        company_id
      }
    })
    
    if (!project) {
      resp.success = false
      resp.message = '没有操作权限'
      return returnResult(ctx, resp.serialize())
    }
    
    await db.SugoSceneData.destroy({ where: id })
    resp.result = param
    return returnResult(ctx, resp.serialize())
  },
  
  get: async ctx => {
    const param = ctx.q
    const check = Checker.Scene.query(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id } = param
    const { company_id } = ctx.session.user
    
    const record = await db.SugoSceneData.find({ where: { id } })
    
    if (!record) {
      resp.success = false
      resp.message = '记录不存在'
      return returnResult(ctx, resp.serialize())
    }
    
    const project = await db.SugoProjects.find({
      where: {
        id: record.project_id,
        company_id
      }
    })
    
    if (!project) {
      resp.success = false
      resp.message = '没有操作权限'
      return returnResult(ctx, resp.serialize())
    }
    
    resp.result = record.get({ plain: true })
    return returnResult(ctx, resp.serialize())
  },
  
  getSceneOfProjects: async ctx => {
    const param = ctx.q
    const check = Checker.Collection.SceneOfProjects(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { projects } = param
    
    // TODO Projects 权限检测
    const records = await db.SugoSceneData.findAll({
      where: {
        project_id: {
          $in: projects
        }
      }
    })
    
    resp.result = records.map(r => r.get({ plain: true }))
    return returnResult(ctx, resp.serialize())
  }
}

