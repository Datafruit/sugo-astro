/**
 * Created on 10/05/2017.
 */

import Resource from './resource'

export default {

  /**
   * 更新model
   * @param {DataSourceStoreModel} model
   * @param {function} done
   */
  async update(model, done){
    const res = await Resource.update(model)
    done(res.success ? res.result : {})
  }
}
