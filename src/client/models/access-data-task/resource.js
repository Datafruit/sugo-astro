/**
 * Created by asd on 17-7-17.
 */

import Resource from '../resource'

const $resource = {
  create: Resource.create('/app/project/access-task/create'),
  update: Resource.create('/app/project/access-task/update'),
  list: Resource.create('/app/project/access-task/list'),
  query: Resource.create('/app/project/access-task/query'),

  // task
  createAndRun: Resource.create('/app/project/access-task/create-and-run'),
  stop: Resource.create('/app/project/access-task/stop'),
  run: Resource.create('/app/project/access-task/run'),
  queryWithStatus: Resource.create('/app/project/access-task/query-with-status')
}

export default {
  /**
   * 创建接入task记录
   * @param {Object} model
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async create (model){
    const { project_id, params, status } = model
    return await $resource.create.post({}, { project_id, params, status }).json()
  },

  /**
   * 更新task记录
   * @param {Object} model
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async update(model) {
    return await $resource.update.post({}, model).json()
  },

  /**
   * 查询项目下的所有task
   * @param project_id
   * @return {Promise<ResponseStruct<Array<AccessDataTaskModel>>>}
   */
  async list(project_id){
    return await $resource.list.get({}, { project_id }).json()
  },

  /**
   * 查询单条记录
   * @param {String} id
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async query(id){
    return await $resource.query.get({}, { id }).json()
  },

  /**
   * @param {AccessDataTaskModel} model
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async createAndRun(model){
    return await $resource.createAndRun.post({}, model).json()
  },

  /**
   * @param {AccessDataTaskModel} model
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async stop(model){
    return await $resource.stop.post({}, { id: model.id }).json()
  },

  /**
   * @param {AccessDataTaskModel} model
   * @return {Promise<ResponseStruct<AccessDataTaskModel>>}
   */
  async run(model){
    return await $resource.run.post({}, { id: model.id }).json()
  },

  /**
   * 查询列表并更新状态
   * @param project_id
   * @return {Promise<ResponseStruct<Array<AccessDataTaskModel>>>}
   */
  async queryWithStatus(project_id){
    return await $resource.queryWithStatus.post({}, { project_id }).json()
  }
}
