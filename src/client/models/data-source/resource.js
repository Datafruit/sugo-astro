/**
 * Created on 10/05/2017.
 */

import Resource  from '../resource'

const $resource = {
  list: Resource.create('/app/datasource/get/'),
  update: Resource.create('/app/datasource/update/:id'),
  getToken: Resource.create('/app/datasource/access/getToken/:type'),
  createToken: Resource.create('/app/datasource/access/createToken/:type'),
  updateSupervisorJsonTimeColumn: Resource.create('/app/datasource/updateSupervisorJsonTimeColumn')
}

/**
 * 将接口返回值处理成标准 ResponseStruct
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct (success, result, message) {
  return {
    success,
    result,
    message,
    code: 200,
    type: 'json'
  }
}

export default {
  /**
   * sugo-dimensions.controller.getDimensions
   * @return {Promise.<ResponseStruct>}
   */
  async list(){
    // TODO return ResponseStruct
    return await $resource.list.get({}, void 0).json()
  },

  /**
   * 更新model
   * @param {DataSourceStoreModel} model
   * @return {Promise.<ResponseStruct>}
   */
  async update(model){
    // TODO return ResponseStruct
    return await $resource.update.put({ id: model.id }, model, null).json()
  },

  /**
   * 查询token
   * @param type
   * @return {Promise<ResponseStruct>}
   */
  async getToken(type){
    const res = await $resource.getToken.get({ type }, void 0).text()
    return struct(true, res, null)
  },

  /**
   * 创建token
   * @param type
   * @return {Promise.<ResponseStruct>}
   */
  async createToken(type){
    const res = await $resource.createToken.get({ type }, void 0).text()
    return struct(true, res, null)
  },

  /**
   * 更新时间列
   * @param {String} datasource_id
   * @param {String} time_column
   * @param {String} [granularity]
   * @param {String} [format]
   * @return {Promise<ResponseStruct<String>>}
   */
  async updateSupervisorJsonTimeColumn(datasource_id, time_column, granularity, format){
    return await $resource.updateSupervisorJsonTimeColumn.post({}, {
      datasource_id,
      time_column,
      granularity,
      format
    }).json()
  }
}
