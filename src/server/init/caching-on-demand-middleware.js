/**
 * Created by heganjie on 2019/01/23.
 * 按需缓存中间件
 * 避免多端同时访问大屏/看板而导致频繁查询 druid。
 *
 * 通过 query 的 sCache，cCache 控制缓存时间
 * sCache=秒数/PT1H，表示在服务器缓存多久，为 0 则不缓存，默认为 0
 * cCache=秒数/PT1H，表示在浏览器缓存多久，为 0 则不缓存，默认为 0
 * key 为 url 的 md5，如果是 post 则为 url + body 的 md5
 */

import cache from '../services/cache'
import moment from 'moment'
import _ from 'lodash'

// 未登录人员最长缓存时间不超过一个小时，防止 redis 被攻击撑爆
const maxSCacheForAnonymous = moment.duration('PT1H').asSeconds()

export default function withOnDemandCachingMiddleware(app) {
  
  let middleware = async (ctx, next) => {
    let {sCache = '0', cCache = '0'} = ctx.query
  
    if (sCache && sCache !== '0') {
      ctx.markProgress(`Read cache from redis (${sCache})`)
      let cacheData = await cache.getCache(ctx)
      if (cacheData) {
        ctx.body = cacheData
        return
      }
      ctx.markProgress('Loading final data')
    }
  
    let res = await next()
    let isNoErr = 200 <= ctx.status && ctx.status < 300
    if (!isNoErr) {
      return res
    }
    
    // 如果此时已经存在 Cache-Control: max-age=0 / no-cache / no-store 则表示此响应不希望被缓存，跳过缓存逻辑
    let respCacheCtrl = ctx.response.get('Cache-Control')
    if (
      respCacheCtrl
      && (_.includes(respCacheCtrl, 'max-age=0')
      || _.includes(respCacheCtrl, 'no-cache')
      || _.includes(respCacheCtrl, 'no-store'))
    ) {
      return res
    }
    if (cCache && cCache !== '0') {
      let cCacheInSeconds = isFinite(cCache) ? +cCache : moment.duration(cCache).asSeconds()
      ctx.set('Cache-Control', `private,max-stale=0,max-age=${cCacheInSeconds}`)
    }
  
    if (sCache && sCache !== '0' && ctx.body) {
      let sCacheInSeconds = isFinite(sCache) ? +sCache : moment.duration(sCache).asSeconds()
      let isLoggedIn = !_.isEmpty(ctx.session.user)
      let expireTime = isLoggedIn ? sCacheInSeconds : Math.min(sCacheInSeconds, maxSCacheForAnonymous)
      cache.setCache(ctx, ctx.body, expireTime).catch(err => console.error(err))
    }
    return res
  }

  app.use(middleware)
}
