/**
 * Created on 10/05/2017.
 */

import Resource from './resource'

export default {
  /**
   * @param {DruidQueryParams} param
   * @param {function} done
   * @return {Promise.<void>}
   */
  async query(param, done){
    const ret = await Resource.query(param)
    done({ result: ret })
  }
}

