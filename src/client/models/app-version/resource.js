/**
 * Created by asd on 17-7-12.
 */

import Resource from '../resource'

const $resource = {
  list: Resource.create('/app/sdk/get/app-versions'),
  create: Resource.create('/app/sdk/app-version/create'),
  update: Resource.create('/app/sdk/app-version/update'),
  listWithEventsCount: Resource.create('/app/sdk/app-version/list-with-events-count'),
  toggleAppVersionStatus: Resource.create('/app/sdk/app-version/toggle-appversion-status')
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
   * 创建app version
   * @param {{appid:String,app_version:String,status?:Number}} data
   * @return {Promise.<ResponseStruct>}
   */
  async create(data){
    return await $resource.create.post({}, data).json()
  },

  /**
   * 更新app version
   * @param data
   * @return {Promise<ResponseStruct<AppVersionModel>>}
   */
  async update(data){
    return await $resource.update.post({}, data).json()
  },

  /**
   * 获取埋点分析表的app-version列表
   * @param {String} token - analysis.id
   * @return {Promise.<ResponseStruct<Array<AppVersionModel>>>}
   */
  async list(token){
    const res = await $resource.list.get({}, { token }).json()
    return struct(true, res.rows, null)
  },

  /**
   * @param {String} token
   * @return {Promise<{app_versions:Array<AppVersionModel>, count:Array<{key:Number}>}>}
   */
  async listWithEventsCount(token){
    return await $resource.listWithEventsCount.get({}, { token }).json()
  },

  /**
   * 禁用启用app version
   * @param data
   * @return {Promise<ResponseStruct<AppVersionModel>>}
   */
  async toggleAppVersionStatus(data){
    return await $resource.toggleAppVersionStatus.post({}, data).json()
  }
}


