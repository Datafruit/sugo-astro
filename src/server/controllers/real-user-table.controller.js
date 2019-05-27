/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 */

import RealUserTable from '../services/real-user-table.service'

export default {

  /**
   * 创建用户表, POST
   * @param ctx
   * @return {Promise.<ResponseStruct.<RealUserTableModel>>}
   */
  async create(ctx) {
    const { name } = ctx.q
    const { company_id } = ctx.session.user || {}
    console.log('real-user-table.controller.create', name)
    return ctx.body = await RealUserTable.create(name, company_id)
  },

  /**
   * 更新name, POST
   * @param ctx
   * @return {Promise.<ResponseStruct.<{id: string, name: string, company_id: string}>>}
   */
  async updateName(ctx) {
    const { id, name } = ctx.q
    const { company_id } = ctx.session.user || {}
    return ctx.body = await RealUserTable.updateName(id, name, company_id)
  },

  /**
   * 查找单条记录, GET
   * @param ctx
   * @return {Promise.<ResponseStruct.<RealUserTableModel>>}
   */
  async findOne(ctx) {
    const { company_id } = ctx.session.user || {}
    return ctx.body = await RealUserTable.findOne(ctx.q.id, company_id)
  },

  /**
   * 查找company_id下所有记录
   * @param ctx
   * @return {Promise.<ResponseStruct.<RealUserTableModel[]>>}
   */
  async findAll(ctx) {
    const { company_id } = ctx.session.user || {}
    return ctx.body = await RealUserTable.findAll(company_id)
  },

  /**
   * 删除用户表
   * @param ctx
   * @return {Promise.<ResponseStruct<RealUserTableModel>>}
   */
  async destroy(ctx) {
    const { id } = ctx.q
    const { company_id } = ctx.session.user || {}
    return ctx.body = await RealUserTable.destroy(id, company_id)
  }
}
