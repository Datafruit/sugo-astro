/**
 * Created on 10/05/2017.
 */

import Resource from './resource'

export default {
  /**
   * @param {SceneDataModel} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async query(model, done){
    const ret = await Resource.query(model.id)
    done(ret.result)
  }
}
