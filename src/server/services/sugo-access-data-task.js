/**
 * Created by asd on 17-7-17.
 */

import _ from 'lodash'
import db from '../models'
import Conf from '../config'
import FetchKit from '../utils/fetch-kit'

import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { ACCESS_DATA_TASK_STATUS } from '../../common/constants'
import { get } from 'http'

const ACCESS_DATA_TASK_STATUS_VALUES = _.values(ACCESS_DATA_TASK_STATUS)
const supervisorHost = Conf.druid.supervisorHost

const $checker = {
  create: defineTypes({
    project_id: PropTypes.string.isRequired,
    datasource_name: PropTypes.string.isRequired,
    status: PropTypes.oneOf(ACCESS_DATA_TASK_STATUS_VALUES).isRequired,
    params: PropTypes.object.isRequired
  }),

  update: defineTypes({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf(ACCESS_DATA_TASK_STATUS_VALUES),
    params: PropTypes.object
  }),

  findOne: defineTypes({
    id: PropTypes.string.isRequired
  }),

  findAll: defineTypes({
    project_id: PropTypes.string.isRequired
  })
}

class Service {
  /**
   * 插入记录
   * @param {Object} model
   * @return {Promise.<ResponseStruct<AccessDataTaskModel>>}
   */
  static async updateOrCreate (model) {

    debug('--------updateOrCreate-------------', JSON.stringify(model, null, 2))

    if (model.id) {
      return this.update(model)
    }

    const checked = $checker.create(model)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { project_id, datasource_name, status, params, task_id } = model

    const ins = await db.SugoAccessDataTask.create({
      project_id,
      datasource_name,
      status,
      params,
      task_id
    })

    return Response.ok(ins.get({ plain: true }))
  }

  /**
   * 更新记录
   * 只能更新status或params
   * @param {Object} model
   * @return {Promise.<ResponseStruct<Object>>}
   */
  static async update (model) {
    const checked = $checker.update(model)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    // TODO 安全考虑，不能更新id、datasource_id、datasource_name字段
    const { id, ...other } = model
    const [affectedCount] = await db.SugoAccessDataTask.update(other, {
      where: {
        id
      }
    })
    return affectedCount > 0 ? Response.ok(model) : Response.fail('更新失败')
  }

  /**
   * 使用查询单条记录
   * @param id
   * @return {Promise.<ResponseStruct<AccessDataTaskModel>>}
   */
  static async findOne (id) {
    const checked = $checker.findOne({ id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoAccessDataTask.findOne({ where: { id } })
    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  }

  /**
   * 查询项目下的所有task
   * @param project_id
   * @return {Promise.<ResponseStruct<AccessDataTaskModel>>}
   */
  static async findAll (project_id) {
    const checked = $checker.findAll({ project_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const arr = await db.SugoAccessDataTask.findAll({ where: { project_id } })
    return Response.ok(arr.map(ins => ins.get({ plain: true })))
  }

  static async runTask (config) {
    const res = await FetchKit.post(`${supervisorHost}/druid/indexer/v1/task`, config)
    return Response.ok(res)
  }

  static async stopTask (taskid) {
    const res = await FetchKit.post(`${supervisorHost}/druid/indexer/v1/task/${taskid}/shutdown`)
    return Response.ok(res)
  }

  /**
   * @typedef {Object} TaskStatus
   * @property {String} id
   * @property {String} createdTime
   * @property {String} queueInsertionTime
   * @property {{host:String, port:number}} location
   * @property {Number} status
   */

  /**
   * 获取Waiting状态的task
   * @return {Promise.<ResponseStruct<Array<TaskStatus>>>}
   */
  static async getWaitingTasks () {
    const res = await FetchKit.get(`${supervisorHost}/druid/indexer/v1/waitingTasks`)
    return Response.ok(res)
  }

  /**
   * 获取Pending状态的task
   * @return {Promise.<ResponseStruct<Array<TaskStatus>>>}
   */
  static async getPendingTasks () {
    const res = await FetchKit.get(`${supervisorHost}/druid/indexer/v1/pendingTasks`)
    return Response.ok(res)
  }

  /**
   * 获取Running状态的task
   * @return {Promise.<ResponseStruct<Array<TaskStatus>>>}
   */
  static async getRunningTasks () {
    const res = await FetchKit.get(`${supervisorHost}/druid/indexer/v1/runningTasks`)
    return Response.ok(res)
  }

  /**
   * 根据TaskId获取状态
   * @property {String} taskId
   * @return {Promise.<ResponseStruct<Array<TaskStatus>>>}
   */
  static async getTaskStatusByTaskId (taskId) {
    const res = await FetchKit.get(`${supervisorHost}/druid/indexer/v1/task/${taskId}/status`)
    return Response.ok(res)
  }

  /**
   * @typedef {Object} CompletedTaskStatus
   * @property {String} id
   * @property {String} status
   * @property {String} duration
   * @property {String} createdTime
   * @property {String} topic
   * @property {String} offsets
   */

  /**
   * 获取Completed状态的task
   * @return {Promise.<ResponseStruct<Array<CompletedTaskStatus>>>}
   */
  static async getCompleteTasks () {
    const res = await FetchKit.get(`${supervisorHost}/druid/indexer/v1/completeTasks`)
    return Response.ok(res)
  }

  /**
   * 获取所有Task及状态信息
   * @return {Promise.<ResponseStruct<Array<{id:String,status:Number,createdTime:String}>>>}
   */
  static async getAllTasks () {
    const { result: RUNNING } = await this.getRunningTasks()
    const { result: WAITING } = await this.getWaitingTasks()
    const { result: PENDING } = await this.getPendingTasks()
    const { result: COMPLETED } = await this.getCompleteTasks()

    const collection = [
      { list: RUNNING, status: ACCESS_DATA_TASK_STATUS.RUNNING },
      { list: WAITING, status: ACCESS_DATA_TASK_STATUS.WAITING },
      { list: PENDING, status: ACCESS_DATA_TASK_STATUS.PENDING }
    ]
    const result = []

    collection.forEach(one => one.list.forEach(r => result.push({
      id: r.id,
      status: one.status,
      createdTime: r.createdTime
    })))

    // 完成状态需要特殊处理
    // 完成状态包含两种状态：SUCCESS 与 FAILED
    COMPLETED.forEach(r => result.push({
      id: r.id,
      status: ACCESS_DATA_TASK_STATUS[r.status],
      createdTime: r.createdTime
    }))

    return Response.ok(result)
  }

    /**
   * 获取所有活动状态Task及状态信息
   * @return {Promise.<ResponseStruct<Array<{id:String,status:Number,createdTime:String}>>>}
   */
  static async getActiveTasks () {
    const { result: RUNNING } = await this.getRunningTasks()
    const { result: WAITING } = await this.getWaitingTasks()
    const { result: PENDING } = await this.getPendingTasks()

    return [
      ...RUNNING,
      ...WAITING,
      ...PENDING
    ]
  }

  /**
   * 查询task日志
   * @param task_id
   *
   * @param {Number} [size]
   * @return {Promise.<ResponseStruct<ReadableStream|String>>}
   */
  static async queryTaskLog (task_id, size) {
    const url = `${supervisorHost}/druid/indexer/v1/task/${task_id}/log${size ? `?offset=-${size}` : ''}`
    return new Promise(resolve => get(url, res => {
      resolve(Response.ok(res))
    }))
  }
}

export default Service
