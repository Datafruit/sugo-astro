/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 */

import Resource  from '../resource'

const $resource = {
  create: Resource.create('/app/real-user/create'),
  updateName: Resource.create('/app/real-user/update-name'),
  findOne: Resource.create('/app/real-user/find-one'),
  findAll: Resource.create('/app/real-user/find-all'),
  destroy: Resource.create('/app/real-user/destroy')
}

export default {
  /**
   * @param {string} name
   * @return {Promise<ResponseStruct<RealUserTableModel>>}
   */
  async create(name) {
    return await $resource.create.post(void 0, { name }).json()
  },

  /**
   * @param {string} id
   * @param {string} name
   * @return {Promise<ResponseStruct<{id:string,name:string,company_id:string}>>}
   */
  async updateName(id, name) {
    return await  $resource.updateName.post(void 0, { id, name }).json()
  },

  /**
   * 查找单条记录
   * @param id
   * @return {Promise.<ResponseStruct.<RealUserTableModel>>}
   */
  async findOne(id) {
    return await  $resource.findOne.get(void 0, { id }).json()
  },

  /**
   * 查找该用户所属company_id所有记录
   * @return {Promise.<ResponseStruct.<RealUserTableModel[]>>}
   */
  async findAll() {
    return await $resource.findAll.get(void 0, void 0).json()
  },

  /**
   * 删除用户表
   * @param {string} id
   * @return {Promise.<ResponseStruct<RealUserTableModel>>}
   */
  async destroy(id){
    return await $resource.destroy.post(void 0, { id }).json()
  }
}
