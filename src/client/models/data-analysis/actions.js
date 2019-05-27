/**
 * Created on 10/05/2017.
 */

import Resource from './resource'

export default {

  /**
   * 创建分析表
   * @param {DataAnalysisStoreModel} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async create(model, done){
    const ret = await Resource.create(model)
    done(ret.success ? ret.result : { message: ret.message })
  },

  /**
   * 更新分析表
   * @param {DataAnalysisStoreModel} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async update(model, done){
    const ret = await Resource.update(model)
    done(ret.success ? ret.result : { message: ret.message })
  },

  /**
   * 删除记录
   * @param {DataAnalysisStoreModel} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async del(model, done){
    const ret = await Resource.del(model)
    done(ret.success ? ret.result : [])
  }
}
