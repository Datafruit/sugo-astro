/**
 * Created by asd on 17-7-17.
 */

import Resource from './resource'
import { ACCESS_DATA_TASK_STATUS } from '../../../common/constants'

export default {
  /**
   * @param {AccessDataTaskStoreModel} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async create(model, done){
    const {
      project_id,
      params,
      status = ACCESS_DATA_TASK_STATUS.RUNNING
    } = model

    const res = await Resource.create({ project_id, params, status })
    done(res.success ? res.result : { message: res.message })
  },

  async update(model, done){
    const { status, params } = model
    const res = await Resource.update({ status, params })
    done(res.success ? res.result : {})
  },

  /**
   * @param {AccessDataTaskStoreModel} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async query(model, done){
    const res = await Resource.query(model.id)
    done(res.success ? res.result : { message: res.message })
  },

  /**
   * @param {AccessDataTaskStoreModel}  model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async createAndRun(model, done){
    const res = await Resource.createAndRun(model)
    done(res.success ? res.result : { message: res.message })
  },

  /**
   * @param {AccessDataTaskStoreModel} model
   * @param {Function} done
   * {Promise.<void>}
   */
  async stop(model, done){
    const res = await Resource.stop(model)
    done(res.success ? res.result : { message: res.message })
  },

  /**
   * @param {AccessDataTaskStoreModel} model
   * @param {Function} done
   * {Promise.<void>}
   */
  async run(model, done){
    const res = await Resource.stop(model)
    done(res.success ? res.result : { message: res.message })
  }
}
