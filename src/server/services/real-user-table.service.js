/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 */

import db from '../models'
import { Response } from '../utils/Response'
import validator from '../../common/model-validator/RealUserTable'
import { get } from '../utils/logger'
import { getRedisClient } from '../utils/redis'
import { passValid, mapValues } from './base.service'

const Logger = get('RealUserTable')

export default class RealUserTableService {

  /**
   * @param {string} name
   * @param {string} company_id
   * @return {Promise.<ResponseStruct<RealUserTableModel>>}
   */
  static async create (name, company_id) {
    const valid = validator.valid({ name, company_id })
    if (!passValid(valid)) {
      const message = mapValues(valid)
      Logger.error('create: %s', message)
      return Response.fail(message[0])
    }

    // 检测name是否重复
    let ins = await db.RealUserTable.findOne({
      where: {
        name
      }
    })

    if (ins) {
      return Response.fail(`名称: [${name}] 已存在`)
    }

    ins = await db.RealUserTable.create({ name, company_id })

    return Response.ok(ins.get({ plain: true }))
  }

  /**
   * @param {string} id
   * @param {string} name
   * @param {string} company_id
   * @return {Promise.<ResponseStruct<{id:string,name:string,company_id:string}>>}
   */
  static async updateName (id, name, company_id) {
    const props = { id, name, company_id }
    const valid = validator.valid(props)
    if (!passValid(valid)) {
      const message = mapValues(valid)
      Logger.error('RealUserTable.updateName: %s', message)
      return Response.fail(message[0])
    }

    const [affectedCount] = await db.RealUserTable.update({ name }, {
      where: {
        id,
        company_id
      }
    })

    return affectedCount > 0 ? Response.ok(props) : Response.fail('操作失败')
  }

  /**
   * 查找单条记录
   * @param {string} id
   * @param {string} company_id
   * @return {Promise.<ResponseStruct<RealUserTableModel>>}
   *
   * @see {RealUserTableModel.id}
   * @see {RealUserTableModel.company_id}
   */
  static async findOne (id, company_id) {
    const valid = validator.valid({ id, company_id })
    if (!passValid(valid)) {
      const message = mapValues(valid)
      Logger.error('RealUserTable.findOne: %s', message)
      return Response.fail(message[0])
    }

    const ins = await db.RealUserTable.findOne({
      where: {
        id,
        company_id
      }
    })

    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  }

  /**
   * 查找company_id所属的所有用户表
   * @param {string} company_id
   * @return {Promise.<ResponseStruct<RealUserTableModel[]>>}
   *
   * @see {RealUserTableModel.company_id}
   */
  static async findAll (company_id) {
    const message = validator.validOne('company_id', company_id)
    if (message !== null) {
      Logger.error('findAll: %s', message)
      return Response.fail(message)
    }

    const ins = await db.RealUserTable.findAll({
      where: {
        company_id
      }
    })

    return Response.ok(ins.map(r => r.get({ plain: true })))
  }

  /**
   * @param {string} id
   * @param {string} company_id
   * @return {Promise.<ResponseStruct<RealUserTableModel>>}
   */
  static async destroy (id, company_id) {
    const res = await this.findOne(id, company_id)
    if (!res.success) {
      return res
    }

    const redis = await getRedisClient()
    const length = await redis.hlen(id)

    if (length > 0) {
      return Response.fail(`用户表 [${res.result.name}] 已写入数据,不可删除`)
    }

    if (length === 0) {
      await db.RealUserTable.destroy({
        where: {
          id
        }
      })
    }

    return Response.ok(res.result)
  }
}

