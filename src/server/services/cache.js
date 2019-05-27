
import {redisGet, redisSetExpire} from '../utils/redis'
import CryptoJS from 'crypto-js'
import conf from '../config'
const redisExpireTime = conf.redisExpire || 60
const {disableCache} = conf

export default class Cache {

  static getCacheKey (ctx) {
    let keyObj = {
      url: ctx.path,
      query: ctx.query,
      body: ctx.request.body
    }
    let cacheKey = CryptoJS.MD5(JSON.stringify(keyObj)).toString()
    return cacheKey
  }

  static async getCache (ctx, key) {
    let cacheControl = ((ctx.headers || {})['cache-control'] || '').toLowerCase()
    if (
      disableCache ||
      ctx.query.nocache ||
      cacheControl.indexOf('no-cache') !== -1 ||
      cacheControl.indexOf('no-store') !== -1
    ) return null
    let cacheKey = key || Cache.getCacheKey(ctx)
    let cache = await redisGet(cacheKey)
    return cache
  }

  static async setCache (ctx, data, expireTime = redisExpireTime) {
    if (disableCache) return
    let cacheKey = ctx.request && ctx.path ? Cache.getCacheKey(ctx) : ctx //ctx可以直接是cacheKey
    await redisSetExpire(cacheKey, expireTime, data)
  }

}
