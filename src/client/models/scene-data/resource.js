/**
 * Created on 10/05/2017.
 */

import Resource  from '../resource'
const $resource = {
  create: Resource.create('/app/scene/create'),
  update: Resource.create('/app/scene/update'),
  query: Resource.create('/app/scene/query'),
  del: Resource.create('/app/scene/delete'),
  collection: Resource.create('/app/scene/collection/projects')
}

export default {
  /**
   * 创建场景数据
   * scene.controller.create
   * @param {string} project_id
   * @param {number} type
   * @param {object} params
   * @return {Promise.<ResponseStruct>}
   */
  async create(project_id, type, params){
    return $resource.create.post(null, { project_id, type, params }).json()
  },

  /**
   * 更新场景数据
   * scene.controller.update
   * @param {string} id
   * @param {string} project_id
   * @param {number} type
   * @param {object} [params]
   * @return {Promise.<ResponseStruct>}
   */
  async update(id, project_id, type, params){
    return $resource.update.post(null, { id, project_id, type, params }).json()
  },

  /**
   * 查询场景数据
   * scene.controller.get
   * @param {string} id
   * @return {Promise.<ResponseStruct>}
   */
  async query(id){
    return $resource.query.get(null, { id }).json()
  },

  /**
   * 删除场景数据
   * scene.controller.del
   * @param {string} id
   * @return {Promise.<ResponseStruct>}
   */
  async del(id){
    return $resource.del.get(null, { id }).json()
  },

  /**
   * 查询一组项目的所有场景数据
   * @param {Array<string>} projects
   * @return {Promise.<Array<SceneDataModel>>}
   */
  async collection(projects){
    return $resource.collection.get(null, { projects }).json()
  }
}
