import _ from 'lodash'
import { Response } from '../../utils/Response'
import config from '../../config'

let { ipWhiteList = '' } = config

/**
 * 项目数据接口认证(无限极，ip白名单控制)
 * */
export default async(ctx, next) => {
  const { url } = ctx.request
  if (/^(\/api\/v2\/uits)/.test(url) && !_.isEmpty(ipWhiteList)) {
    const req = ctx.req
    const clientIp = getClientIp(ctx, req)
    ipWhiteList = (_.isString(ipWhiteList) && ipWhiteList.split(',')) || (_.isArray(ipWhiteList) && ipWhiteList) || []
    if (!ipWhiteList.includes(clientIp)) {
      return ctx.body = Response.fail(`客户端IP【${clientIp}】不在白名单内, 联系管理员`)
    }
    return await next()
  }
  return await next()
}

function getClientIp(ctx, req) {
  return ctx.ip ||
  req.headers['x-forwarded-for'] ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress
}

