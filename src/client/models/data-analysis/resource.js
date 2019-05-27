/**
 * Created on 10/05/2017.
 */

import Resource  from '../resource'

const $resource = {
  create: Resource.create('/app/project/access'),
  del: Resource.create('/app/project/access/delete/:analysis_id'),
  list: Resource.create('/app/project/tables'),
  updateStatus: Resource.create('/app/project/access/update-status')
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
   * 创建接入表
   * @param {DataAnalysisModel} model
   * @return {Promise.<ResponseStruct>}
   */
  async create(model){
    const { name, type, access_type, project_id, params } = model
    const data = { name, type, access_type, project_id, params }
    if (model.partitions) data.partitions = model.partitions
    const res = await $resource.create.post({}, data).json()
    return struct(res.success, res.model, res.message)
  },

  /**
   * 更新接入表
   * @param {DataAnalysisModel} model
   * @return {Promise.<ResponseStruct>}
   */
  async update(model){
    const { id, name, type, access_type, project_id, params } = model
    const data = { id, name, type, access_type, project_id, params }
    const res = await $resource.create.post({}, data).json()
    return struct(res.success, res.result, res.message)
  },

  /**
   * 删除接入表
   * @param {DataAnalysisModel} model
   * @return {Promise.<ResponseStruct>}
   */
  async del(model){
    const res = await $resource.del.get({ analysis_id: model.id }, void 0).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message)
  },

  /**
   * 获取项目下所有接入表
   * @param {String} project_id
   * @return {Promise.<ResponseStruct>}
   */
  async list(project_id){
    const res = await $resource.list.get({}, { project_id }).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message)
  },

  /**
   * 这个接口有点检测SDK专用的意思
   * @param {{id:String, status:Number, package_name?: *}} props
   * @return {Promise.<ResponseStruct>}
   */
  async updateStatus(props){
    const res = await $resource.updateStatus.put({}, props).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message)
  }
}
