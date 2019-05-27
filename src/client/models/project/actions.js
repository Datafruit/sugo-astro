/**
 * Created on 10/05/2017.
 */

import Resource from './resource'

export default {

  /**
   * 查询项目记录
   * @param project_id
   * @param done
   * @return {Promise.<void>}
   */
  async query(project_id, done){
    const ret = await Resource.query(project_id)
    done(ret.success ? ret.result : { message: ret.message })
  },

  /**
   * 创建项目，返回更新结果
   * @param {ProjectStoreModel} model
   * @param {Number} type
   * @param done
   * @return {Promise.<void>}
   *
   * @see {AccessDataType} - type
   */
  async create(model, type, done){
    const res = await Resource.create(model.name, type)
    done(res.success ? res.result : { message: res.message })
  },

  /**
   * 更新项目
   * @param {ProjectStoreModel} model
   * @param {Function} done
   * @return {Promise.<Object>}
   */
  async update(model, done){
    const ret = await Resource.update(model)
    done(ret.success ? ret.result : { message: ret.message })
  }
}
