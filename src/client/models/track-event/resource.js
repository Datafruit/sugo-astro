/**
 * Created by asd on 17-7-12.
 */
import Resource from '../resource'

const $resource = {
  list: Resource.create('/app/sdk/get/track-events'),
  screenshot: Resource.create('/app/sdk/get/event-screenshot'),
  bulkEdit: Resource.create('/app/project/access/edit-track-event'),
  deploy: Resource.create('/app/sdk/deployevent'),
  eventList:Resource.create('/app/sdk/get/track-events-paging')
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
   * 获取已部署事件列表
   * @param {{token:String, app_version:Number, event_bindings_version:Number}} query
   * @return {Promise.<ResponseStruct<Array<TrackEventModel>>>}
   */
  async list(query){
    const res = await $resource.list.get({}, query).json()
    return struct(true, res.data, null)
  },
  /**
   * 获取已部署事件列表
   * @param {{token:String, app_version:Number, event_bindings_version:Number}} query
   * @return {Promise.<ResponseStruct<Array<TrackEventModel>>>}
   */
  async eventList(query){
    return await $resource.eventList.get({}, query).json()
  },

  /**
   * @param {{id:String,app_version:Number,token:String,event_bindings_version:Number}} query
   * @return {Promise.<ResponseStruct>}
   */
  async screenshot(query){
    const res = await $resource.screenshot.get({}, query).json()
    return struct(true, res.result, null)
  },

  /**
   * 批量更新记录
   * @param {Array<TrackEventModel>} params
   * @return {Promise.<ResponseStruct>}
   */
  async bulkEdit(params){
    const res = await $resource.bulkEdit.post({}, { params }).json()
    return struct(true, res, null)
  },

  /**
   * 部署事件
   * @param {{token:String,app_version:Number}} data
   * @return {Promise.<ResponseStruct>}
   */
  async deploy(data){
    const res = await $resource.deploy.post({}, data, { timeout: 5 * 60 * 1000 }).json()
    const ret = res.result
    return struct(ret.success, null, null)
  }
}
