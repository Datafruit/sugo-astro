/**
 * Created by xj on 17-9-26.
 */
import Resource from '../resource'

const $resource = {
  delPageInfo: Resource.create('/app/sdk/delete-page-info-draft'),          //删除页面信息
  getDimensionsByToken: Resource.create('/app/sdk/get-dimensionsbytoken'),  //获取维度信息
  draftPageList: Resource.create('/app/sdk/get/page-info-draft'),           //获取页面信息列表
  draftEventList: Resource.create('/app/sdk/get/track-events-draft'),       //获取事件列表
  eventList: Resource.create('/app/sdk/get/track-events'),                  //已部署获取事件列表
  getAppVersion: Resource.create('/app/sdk/get/app-versions'),              //获取app版本信息
  savePageInfo: Resource.create('/app/sdk/save-page-info'),                 //保存页面信息
  eventScreenshot: Resource.create('/app/sdk/get/event-screenshot-draft'),  //获取事件截图
  saveEvent: Resource.create('/app/sdk/saveevent'),                         //保存事件
  copyEvents: Resource.create('/app/sdk/copyevents'),                       //复制事件
  deployEvent: Resource.create('/app/sdk/deployevent'),                     //部署事件
  getCategory: Resource.create('/app/sdk/get-category'),                    //获取基础信息
  getPageInfo: Resource.create('/app/sdk/get/page-info-draft'),             //获取基础信息
  savePageCategories: Resource.create('/api/sdk/desktop/page-categories/save'),//保存页面分类
  getPageCategories: Resource.create('/api/sdk/desktop/page-categories'),        //获取页面分类
  getPageCategoriesPaging: Resource.create('/app/sdk/get/page-categories-paging'),
  startImporting: Resource.create('/app/sdk/sdk-start-importdata'),
  saveHeatMap: Resource.create('/app/sdk/heat-map/save'),
  getHeatMap: Resource.create('/app/sdk/heat-map/list'),
  deleteHeatMap: Resource.create('/app/sdk/heat-map/delete')
}


/**
 * 将接口返回值处理成标准 ResponseStruct
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct(success, result, message) {
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
   * 删除页面信息
   * 
   * @param {any} data 
   * @returns 
   */
  async delPageInfo(data) {
    const res = await $resource.delPageInfo.post({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 获取维度
   * 
   * @param {any} query 
   * @returns 
   */
  async getDimensionsByToken(query) {
    const res = await $resource.getDimensionsByToken.get({}, query).json()
    return struct(true, res.result, null)
  },
  /**
   * 获取页面信息列表
   * 
   * @param {any} query 
   * @returns
   */
  async draftPageList(query) {
    const res = await $resource.draftPageList.get({}, query).json()
    return res
  },
  /**
   * 获取事件列表
   * 
   * @param {any} query 
   * @returns 
   */
  async draftEventList(query) {
    const res = await $resource.draftEventList.get({}, query).json()
    return struct(true, res.data, null)
  },
  /**
   * 获取已部署事件列表
   * 
   * @param {any} query 
   * @returns 
   */
  async eventList(query) {
    const res = await $resource.eventList.get({}, query).json()
    return struct(true, res.data, null)
  },
  /**
   * 获取版本号
   * 
   * @param {any} data
   * @returns 
   */
  async getAppVersion(query) {
    const res = await $resource.getAppVersion.get({}, query).json()
    return struct(true, res.rows, null)
  },
  /**
   * 保存页面信息
   * 
   * @param {any} data 
   * @returns 
   */
  async savePageInfo(data) {
    const res = await $resource.savePageInfo.post({}, data).json()
    return struct(true, res.rows, null)
  },
  /**
   * 获取事件图片
   *
   * @param {any} data
   * @returns 
   */
  async eventScreenshot(data) {
    const res = await $resource.eventScreenshot.get({}, data).json()
    return res
  },
  /**
   * 保存事件
   * 
   * @param {any} data 
   * @returns 
   */
  async saveEvent(data) {
    const res = await $resource.saveEvent.post({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 复制事件
   *
   * @param {any} data
   * @returns
   */
  async copyEvents(data) {
    const res = await $resource.copyEvents.post({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 部署事件
   *
   * @param {any} data
   * @returns
   */
  async deployEvent(data) {
    const res = await $resource.deployEvent.post({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 获取基础信息
   *
   * @param {any} data
   * @returns
   */
  async getCategory(data) {
    const res = await $resource.getCategory.get({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 获取页面信息
   *
   * @param {any} data
   * @returns
   */
  async getPageInfo(data) {
    const res = await $resource.getPageInfo.get({}, data).json()
    return struct(true, res.result, null)
  },
  /**
   * 保存页面分类
   *
   * @param {any} data
   * @returns
   */
  async savePageCategories(data) {
    return await $resource.savePageCategories.post({}, data).json()
  },
  /**
   * 获取页面分类
   * 
   * @param {any} data 
   * @returns 
   */
  async getPageCategories(data) {
    return await $resource.getPageCategories.get({}, data).json()
  },
  /**
   * 获取页面分类
   * 
   * @param {any} data 
   * @returns 
   */
  async getPageCategoriesPaging(data) {
    return await $resource.getPageCategoriesPaging.get({}, data).json()
  },
  /**
   * 写入导入数据
   * 获取页面分类
   * 
   * @param {any} data 
   * @returns 
   */
  async startImporting(data) {
    return await $resource.startImporting.post({}, data).json()
  },
  async getHeatMap(data) {
    return await $resource.getHeatMap.get({}, data).json()
  },
  /**
   * 获取页面分类
   * 
   * @param {any} data 
   * @returns 
   */
  async saveHeatMap(data) {
    return await $resource.saveHeatMap.post({}, data).json()
  },
  /**
   * 获取页面分类
   * 
   * @param {any} data 
   * @returns 
   */
  async deleteHeatMap(data) {
    return await $resource.deleteHeatMap.post({}, data).json()
  }
}
