import Redlock from 'redlock'
import Redis from 'ioredis'
import timestring from 'timestring'
import _ from 'lodash'
import config from '../config'
import { compose } from 'throwback'
import { parseExpression } from 'cron-parser'
import { err } from '../utils/log'
import { isClass } from 'common/sugo-utils'
import { getMacaddress } from '../utils/helper'
import { getHosts } from '../utils/RedisServer'

// 默认超时30秒:
const JOB_TTL = 30000
// redis key前缀
const JOB_PREFIX = 'sugo:scheduler'
// 定时调度任务的执行内容处理服务层（执行任务声明文件）
const JOB_TASK_PATH = './scheduler-job.service'
const env = process.env.NODE_ENV

/**
 * redis分布式定时任务调度服务层
 * 可解决PM2多进程，节点部署定时任务重复执行问题
 * @export
 * @class RedisSchedule
 */
export default class RedisSchedule {

  constructor({ connection = config.redis, prefix = JOB_PREFIX, ttl = JOB_TTL, tz = 'Asia/Shanghai', disableRedisConfig } = {}) {
    const DB_NUMBER = (connection && connection.db) || 0
    this.prefix = env !== 'production' ? `${prefix}:${getMacaddress()}` : prefix
    this.ttl = ttl
    this.tz = tz
    let clientConfig
    if (connection.clusterMode) { // 集群模式
      let { host } = connection.host
      host = getHosts(host)
      clientConfig = { ...connection, host }
    } else if(connection.sentinels) { // 哨兵模式
      let { sentinels } = connection
      sentinels = getHosts(sentinels)
      clientConfig = { ...connection, sentinels }
    } else { // 普通模式
      clientConfig = connection
    }
    this.client = new Redis(clientConfig)
    this.subscriber = new Redis(clientConfig)
    this.redlock = new Redlock([this.client], { retryCount: 0 })

    this.qas = []

    // 开启redis的键空间通知
    if (!disableRedisConfig) {
      // E：表示 keyevent 事件，有这个字母表示会往 __keyevent@<db>__ 频道推消息。
      // x: 过期事件：某个key刚好过期的这个时间点触发的事件
      this.subscriber.config('SET', 'notify-keyspace-events', 'Ex')
    }

    // 订阅一个key过期的通知频道DB:
    this.subscriber.once('connect', () => {
      this.subscriber.select(DB_NUMBER, (e) => {
        if (e) {
          err('subscribe redis DB_NUMBER: ', DB_NUMBER)
          err(e.stack)
          return
        }
        this.subscriber.subscribe(`__keyevent@${DB_NUMBER}__:expired`)
      })
    })

    // 收到过期消息处理
    this.subscriber.on('message', (channel, message) => {
      // Check to make sure that the message is a job run request:
      if (!message.startsWith(`${this.prefix}:work:`)) return

      const jobName = message.startsWith(`${this.prefix}:work:demand:`)
        ? message.replace(`${this.prefix}:work:demand:`, '')
        : message.replace(`${this.prefix}:work:`, '')
      this.getJobs().then(jobs => {
        const curJob = jobs[jobName]
        if (curJob && (curJob.every || curJob.cron)) {
          // Attempt to perform the job. Only one worker will end up getting assigned
          // the job thanks to distributed locking via redlock.
          this.doWork(jobName, curJob)
          // Schedule the next run. We do this in every instance because it's
          // just a simple set command, and is okay to run on top of eachother.
          if (curJob.every || curJob.cron) {
            // 循环执行： 设置下一次执行任务
            this.scheduleRun(jobName, curJob)
          }
        }
      })
    })
  }

  // 服务层单例模式
  static getInstance(opts) {
    if (!this.instance) {
      this.instance = new RedisSchedule({...opts})
    }
    return this.instance
  }

  quit() {
    return Promise.all([
      this.client.del(this.getJobsKey()),
      this.subscriber.quit(),
      this.client.quit()
    ])
  }

  /**
   * @typedef {Object} Definition
   * @property {string} every 基于timestring的时间表达式（与cron不能同时存在, 优先启用every配置)
   * @property {string} cron cron表达式
   * @property {date} currentDate cron表达式的生效时间
   * @property {date} endDate cron表达式的结束时间
   * @property {string} path 定时任务回调类文件路径（相当于redis-schedule.service.js文件的路径)
   * @property {string} func 定时任务回调函数名称
   * @property {any} data 传递给回调函的数据参数
   * @property {int} counter 任务执行计数器
   */

  /**
   * @description 添加定时任务
   * @param {string} name
   * @param {Definition} definition
   * @memberof RedisSchedule
   */
  async addJob(name, definition) {
    let jobs = await this.getJobs()
    if (definition.counter === void 0) {
      definition.counter = 0
    }
    jobs[name] = definition
    // 缓存全局所有定时任务key
    await this.client.set(this.getJobsKey(), JSON.stringify(jobs))
    if (definition.every || definition.cron) {
      return this.scheduleRun(name, definition)
    }
    return null
  }

  /**
   * 取消定时任务
   * @param {any} name 
   * @returns
   * @memberof RedisSchedule
   */
  async cancelJob(name) {
    let jobs = await this.getJobs()
    // 删除对象中的对应的key
    jobs = _.omit(jobs, name)
    const res1 = await this.delJob(name)
    const res2 = await this.client.set(this.getJobsKey(), JSON.stringify(jobs))
    return [res1, res2]
  }

  async clearJobs() {
    return await this.client.del(this.getJobsKey())
  }

  async delJob(name) {
    await this.client.del(this.getDemandKey(name))
    return await this.client.del(this.getJobKey(name))
  }

  async delJobByName(name) {
    const keys = await this.client.keys(`*${name}*`)
    for(let i = keys.length; i >= 0; i --) {
      await this.client.del(keys[i])
    }
  }

  async updateJobCounter(name) {
    let jobs = await this.getJobs()
    let definition = jobs[name]
    definition.counter = (definition.counter || 0) + 1
    jobs[name] = definition
    await this.client.set(this.getJobsKey(), JSON.stringify(jobs))
    return definition.counter
  }

  async updateJobProps(name, key, value) {
    let jobs = await this.getJobs()
    let definition = jobs[name]
    if (!definition) {
      return
    }
    definition = _.set(definition, key, value)
    jobs[name] = definition
    await this.client.set(this.getJobsKey(), JSON.stringify(jobs))
  }

  async getJobs() {
    let jobs = await this.client.get(this.getJobsKey())
    if (!jobs) jobs = '{}'
    return JSON.parse(jobs)
  }

  listen(fn) {
    this.qas.push(fn)
  }

  demand(name) {
    this.scheduleRun(name)
  }

  // Semi-privates:

  getJobKey(name) {
    return `${this.prefix}:work:${name}`
  }

  getDemandKey(name) {
    return `${this.prefix}:work:demand:${name}`
  }

  getLockKey(name) {
    return `${this.prefix}:lock:${name}`
  }

  getJobsKey() {
    let s = `${this.prefix}:work:jobs`
    // debug('redis job key: ' + s)
    return s
  }

  doWork(name, curJob) {
    // const ttlTimeout = this.convertTimeout(curJob)
    return this.redlock.lock(this.getLockKey(name), this.ttl).then((lock) => {
      // Call the QA functions, then finally the job function. We use a copy of
      // the job definition to prevent pollution between scheduled runs.
      return this.getJobs().then(jobs => {
        const fn = compose(this.qas)
        const response = fn(name, { ...jobs[name] }, async (_, definition) => {
          const scriptPath = definition.path || JOB_TASK_PATH
          let processor
          try {
            processor = require(scriptPath)
          } catch(e) {
            err('Failed to load scheduler-job module', scriptPath)
            err(e.stack)
            return
          }
          const func = definition.func || 'monitorAlarms'
          try {
            if (processor.default.getInstance) {
              await processor.default.getInstance()[func].call(null, definition, lock)
            } else {
              const Clazz = processor.default || processor
              const instance = isClass(Clazz) ? new Clazz() : Clazz
              // 支持class内部this调用
              instance[func].bind(instance)
              await instance[func](definition, lock)
            }
          } catch(e) {
            err('Failed to call scheduler-job function', scriptPath, '-', func, '-', name)
            err(e.stack)
          }
        })
        const end = () => {
          // 释放锁
          debug(curJob.counter, 'redis unlock ==> ', name)
          return lock.unlock()
        }
        return response.then(end, end)
      })
    }, () => (
      // If we fail to get a lock, that means another instance already processed the job.
      // We just ignore these cases:
      null
    ))
  }

  /**
   * @description 将cron表达式转换为key过期时间(毫秒)
   * @param {Definition} definition
   * @memberOf RedisSchedule
   */
  convertTimeout(definition) {
    let timeout
    // 解析时间为毫秒数
    if (definition.every) {
      const typeOfEvery = typeof definition.every
      if (typeOfEvery === 'string') {
        // Passed a human interval:
        timeout = timestring(definition.every, 'ms')
      } else if (typeOfEvery === 'number') {
        // Passed a ms interval:
        timeout = definition.every
      } else {
        throw new Error(`Unknown interval of type "${typeOfEvery}" passed to addJob.`)
      }
    } else if (definition.cron) {
      const options = { iterator: false, tz: this.tz }
      let flag = false
      if (definition.currentDate && definition.endDate) {
        options.currentDate = definition.currentDate
        options.endDate = definition.endDate
        flag = true
      }
      const iterator = parseExpression(definition.cron, options)
      const nextCronTimeout = () => iterator.next().getTime() - Date.now()
      let cronTimeout = nextCronTimeout()
      if (flag) { // 需要递归校验到结束时间为止
        while (cronTimeout < 0) { // 获取未过期的执行时间
          try {
            cronTimeout = nextCronTimeout()
          } catch (e) {
            break
          }
        }
        timeout = cronTimeout
      } else {
        timeout = cronTimeout > 0 ? cronTimeout : nextCronTimeout()
      }
    }
    return timeout
  }

  scheduleRun(name, definition) {
    // If there's no definition passed, it's a demand, let's schedule as tight as we can:
    if (!definition) {
      return this.client.set(this.getDemandKey(name), name, 'PX', 1, 'NX')
    }
    // 转换timeout时间为毫秒
    const timeout = this.convertTimeout(definition)
    // if (timeout < 0) { // 定时任务已过期
    //   throw new Error('expire time')
    // }
    // multi 标记一个事务块的开始, 最后由 EXEC 命令原子性(atomic)地执行。
    // PX milliseconds - 设置指定的到期时间(以毫秒为单位)
    // NX 仅在键不存在时设置键
    return this.client.set(this.getDemandKey(name), name, 'PX', timeout, 'NX')
  }
}
