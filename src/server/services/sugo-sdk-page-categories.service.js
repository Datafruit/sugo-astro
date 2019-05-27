/**
 * @Author sugo.io<asd>
 * @Date 17-8-16
 */

import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import db from '../models'
import _ from 'lodash'
import { get }  from '../utils/logger'

const Logger = get('SDKPageCategories')

const $checker = {
  create: defineTypes({
    name: PropTypes.string.isRequired,
    appid: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired,
    regulation: PropTypes.string.isRequired
  }),

  bulkSave: defineTypes({
    models: PropTypes.array.isRequired,
    token: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired
  }),

  update: defineTypes({
    id: PropTypes.string.isRequired,
    appid: PropTypes.string,
    app_version: PropTypes.string,
    regulation: PropTypes.string
  }),

  findOne: defineTypes({
    id: PropTypes.string.isRequired
  }),

  findAll: defineTypes({
    appid: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired
  })
}

export default {
  /**
   * 创建记录
   * @param {String} name
   * @param {String} appid
   * @param {String} app_version
   * @param {String} regulation
   * @return {Promise.<ResponseStruct>}
   */
  async create(name, appid, app_version, regulation){
    const fields = {
      name,
      appid,
      app_version,
      regulation
    }
    const checked = $checker.create(fields)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const [ins] = await db.SDKPageCategoriesDraft.findOrCreate({
      where: { ...fields },
      defaults: fields
    })

    return Response.ok(ins.get({ plain: true }))
  },

  /**
   * 创建、更新多条记录
   * @param {Array<>} models
   * @param token
   * @param app_version
   * @return {Promise.<*>}
   */
  async bulkSave(models, token, app_version) {
    Logger.info(
      'bulkSave \nparams->models %j. \nparams->token %s \nparams->app_version %s',
      models, token, app_version
    )
    const checked = $checker.bulkSave({
      models,
      token,
      app_version
    })

    if (!checked.success) {
      Logger.error('bulkSave params check fault: %s', checked.message)
      return Response.fail(checked.message)
    }

    return await db.client.transaction(async transaction => {

      // 查询原有的数据与现在的数据相比较，确定哪些应该被删除，哪些应该被更新
      const records = await db.SDKPageCategoriesDraft.findAll({
        where: {
          app_version,
          appid: token
        }
      })

      const plain = records.map(r => r.get({ plain: true }))
      const toDel = plain.filter(r => !_.find(models, c => r.name === c.name && r.regulation === c.regulation))
      const toSave = models.filter(r => !_.find(toDel, c => r.name === c.name && r.regulation === c.regulation))

      // del
      if (toDel.length > 0) {
        Logger.info('bulkSave to delete: %j', toDel)
        await db.SDKPageCategoriesDraft.destroy({
          where: {
            id: {
              $in: toDel.map(r => r.id)
            }
          },
          transaction
        })
      }

      // save
      let categories = []
      for (let mod of toSave) {
        const fields = {
          name: mod.name,
          appid: mod.appid,
          app_version: mod.app_version,
          regulation: mod.regulation
        }
        const [ins] = await db.SDKPageCategoriesDraft.findOrCreate({
          where: { ...fields },
          defaults: fields,
          transaction
        })

        categories.push(ins.get({ plain: true }))

        if (!ins) {
          transaction.rollback()
          Logger.error('bulkSave fault to create: %j', fields)
          return Response.fail('操作失败')
        }
      }
      return Response.ok(categories)
    })
  },

  /**
   * 更新操作
   * @param {Object} fields
   * @return {Promise.<ResponseStruct>}
   */
  async update(fields){
    const checked = $checker.update(fields)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { id, ...props } = fields

    const [affectedCount] = await db.SDKPageCategoriesDraft.update(props, {
      where: {
        id
      }
    })

    return affectedCount > 0 ? Response.ok(fields) : Response.fail('操作失败')
  },

  /**
   * 查找appid对应的app_version所有记录
   * @param {String} appid
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  async findAll(appid, app_version, isBatchExport){
    const where = { appid, app_version }
    const checked = $checker.findAll(where)

    if (!checked.success) {
      return Response.fail(checked.message)
    }
    
    const query = !isBatchExport ? { where } : { where, attributes: ['name', 'regulation'] }
    const ins = await db.SDKPageCategoriesDraft.findAll(query)

    return Response.ok(ins.map(r => r.get({ plain: true })))
  },

  /**
   * 查找已部署的记录
   * @param {String} appid
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  async findAllDeployed(appid, app_version){
    const where = { appid, app_version }
    const checked = $checker.findAll(where)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SDKPageCategories.findAll({ where })

    return Response.ok(ins.map(r => r.get({ plain: true })))
  },
   /**
   * 使用appid分页查询页面信息
   * @param {String} token
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  async getPageCategoriesPaging(query) {
    let { app_id, name, state, pageSize, pageIndex, app_version, event_bindings_version, lastDeployedOn } = query
    
    let res 
    const limit = pageSize
    const offset = (pageIndex - 1) * pageSize
    let where = {
      appid: app_id,
      app_version: app_version
    }
    if(name) {
      where.name = {
        $iLike: `%${name}%`
      }
    }

    if (state === 'DEPLOYED') {
      res = await db.SDKPageCategories.findAndCountAll ({
        where:{
          ...where,
          event_bindings_version
        },
        limit,
        offset
       })
    } else {
      if(!lastDeployedOn || lastDeployedOn === null ) {
        lastDeployedOn = "1970-01-01T00:00:00.000Z"
      }
      res = await db.SDKPageCategoriesDraft.findAndCountAll ({
        where:{
          ...where,
          updated_at: {
            $gt: lastDeployedOn
          }
        },
        limit,
        offset
       })
    }
  
    return Response.ok({
      data: res.rows,
      totalCount: res.count
    })
  }
}

