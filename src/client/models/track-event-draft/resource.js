/**
 * Created by asd on 17-7-12.
 */
import Resource from '../resource'

const $resource = {
  list: Resource.create('/app/sdk/get/track-events-draft'),
  pageList: Resource.create('/app/sdk/get-page-info-track-event'),
  screenshot: Resource.create('/app/sdk/get/event-screenshot-draft'),
  del: Resource.create('/app/project/access/delete-track-event-draft'),
  delPageDraft: Resource.create('/app/project/access/delete-track-event-draft'),
  deploy: Resource.create('/api/sdk/desktop/vtrack-events/deploy'),
  copyAppEvents: Resource.create('/app/sdk/desktop/copy_events')
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
   * 获取指定版本事件列表
   * @param {{token:String, app_version:Number}} query
   * @return {Promise.<ResponseStruct<Array<TrackEventDraftModel>>>}
   */
  async list(query){
    const res = await $resource.list.get({}, query).json()
    return struct(true, res.data, null)
  },

  /**
   * 查询指定版本的某一部署版本记录
   * @param {{token:String,app_version:String,event_bindings_version:Number}} query
   * @return {Promise.<ResponseStruct>}
   */
  async pageList(query){
    const res = await $resource.pageList.get({}, query).json()
    return struct(true, res.result, null)
  },

  /**
   * @param {{id:String,app_version:Number,token:String}} query
   * @return {Promise.<ResponseStruct>}
   */
  async screenshot(query){
    const res = await $resource.screenshot.get({}, query).json()
    return struct(true, res.result, null)
  },

  /**
   * 删除记录
   * @param ids
   * @return {Promise.<ResponseStruct<Array<TrackEventDraftModel>>>}
   */
  async del(ids){
    const res = await $resource.del.del({}, { ids }).json()
    return struct(true, res.result, null)
  },

  /**
   * 删除同版本的draft记录
   * @param {{token:String, appVersion:Number}} data
   * @return {Promise.<ResponseStruct>}
   */
  async delPageDraft(data){
    const res = await $resource.delPageDraft.post({}, data).json()
    return struct(true, res, null)
  },

  /**
   * @param {string} app_id
   * @param {string} app_version
   * @return {Promise.<ResponseStruct>}
   */
  async deployAppEvents(app_id, app_version){
    const res = await $resource.deploy.post({}, { token: app_id, app_version }).json()
    return struct(!!res, res, res ? null : 'deploy fault')
  },

  /**
   * @param {CopyEventStruct} source
   * @param {CopyEventStruct} target
   * @param {string} regulation
   * @return {Promise.<ResponseStruct>}
   */
  async copyAppEvents(source, target, regulation){
    return await $resource.copyAppEvents.get({}, { source, target, regulation }).json()
  }
}
