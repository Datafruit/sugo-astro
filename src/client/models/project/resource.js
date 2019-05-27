/**
 * Created on 10/05/2017.
 */

import Resource  from '../resource'

const $resource = {
  query: Resource.create('/app/project/info'),
  create: Resource.create('/app/project/create'),
  activate: Resource.create('/app/project/activate/:project_id'),
  disable: Resource.create('/app/project/disable/:project_id'),
  list: Resource.create('/app/project/list'),
  update: Resource.create('/app/project/update'),
  dimensions: Resource.create('/app/project/access/dimensions'),
  associateRealUserTable: Resource.create('/app/project/associate-user-table')
}

/**
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
    type: 'json',
    code: 200
  }
}

export default {

  /**
   * 查询项目记录
   * @param project_id
   * @return {Promise.<ResponseStruct>}
   */
  async query(project_id){
    const res = await $resource.query.get({}, { project_id }).json()
    // 将结果组装成标准ResponseStruct
    const ret = res.result
    return struct(ret.success, ret.model, ret.message || null)
  },

  /**
   * @param {String} name
   * @param {Number} type
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   *
   * @see {AccessDataType} - type
   */
  async create(name, type){
    return await $resource.create.post({}, { name, type }, {throwMessageWhenErrorStatus: true}).json()
  },

  /**
   * 启用项目
   * @param project_id
   * @return {Promise<ResponseStruct>}
   */
  async activate(project_id){
    const { result } = await $resource.activate.get({ project_id }, {}).json()
    return struct(result.success, result.model, result.message)
  },

  /**
   * 禁用项目
   * @param project_id
   * @return {Promise<ResponseStruct>}
   */
  async disable(project_id){
    const { result } = await $resource.disable.get({ project_id }, {}).json()
    return struct(result.success, result.model, result.message)
  },

  /**
   * 更新项目，只能更新name
   * @param {ProjectModel} model
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async update(model){
    const res = await $resource.update.post(null, model).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message || null)
  },

  /**
   * 查询项目列表
   * @return {Promise.<ResponseStruct<Array<ProjectModel>>>}
   */
  async list(){
    const res = await $resource.list.get({}, void 0).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message || null)
  },

  /**
   * 上报数据源维度
   * 1. 将维度写入 DimensionsHBase 中
   * 2. 更新数据源 supervisorJson 并激活项目
   *
   * @see {DimensionsHBaseModel}
   * @see {DataSourceModel}
   * @see {ProjectModel}
   * @see {PLATFORM} - platform
   * @see {DimensionModel}
   *
   * @param {Array<{type:String,name:String}>} dimensions
   * @param {String} analysis_id
   * @param {String} platform
   * @param {Boolean} [inDimTable=true] - 是否写入维度表
   * @return {Promise.<ResponseStruct<{dimensions:Array<DimensionsHBaseModel>, datasource_id:String}>>}
   */
  async postDimensions (dimensions, analysis_id, platform, inDimTable = true){
    return await $resource.dimensions.post({}, {
      dimensions,
      analysis_id,
      platform,
      inDimTable
    }).json()
  },

  /**
   * 关联用户表
   * @param {string} project_id
   * @param {string} real_user_table
   * @return {Promise.<ResponseStruct<{real_user_table:string}>>}
   */
  async associateRealUserTable(project_id, real_user_table) {
    return await $resource.associateRealUserTable.post(void 0, { project_id, real_user_table }).json()
  }
}
