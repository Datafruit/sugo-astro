/**
 * Created on 10/05/2017.
 */

import Resource  from '../resource'

const $resource = {
  list: Resource.create('/app/dimension/get/:id'),
  update: Resource.create('/app/dimension/update/:id'),

  sync: Resource.create('/app/dimension/sync/:datasource_id')
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
   * sugo-dimensions.controller.getDimensions
   * @param {string} datasource_id
   * @return {Promise.<ResponseStruct>}
   */
  async list(datasource_id){
    const res = await $resource.list.get({ id: datasource_id }).json()
    return struct(true, res.data, null)
  },

  /**
   * 更新model
   * @param {DimensionModel} model
   * @return {Promise.<ResponseStruct>}
   */
  async update(model){
    return $resource.update.put({ id: model.id }, model, null).json()
  },

  /**
   * 同步维度
   * @param datasource_id
   * @return {ResponseStruct<{updatedDims:Array<Object>, addedDims:Array<Object>}>}
   */
  async sync(datasource_id){
    // {updatedDims: [{id:String,name:String,type:String}], addedDims:[]}
    const res = await $resource.sync.post({ datasource_id }, {}).json()
    return struct(true, res.result, null)
  }
}
