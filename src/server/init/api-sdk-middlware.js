/** 设置sdk上报允许跨域响应头信息 */
export default async (ctx, next) => {
  const path = ctx.path
  //console.log(path)
  if (/^\/api\/sdk\/desktop/.test(path)) {
    ctx.set('Access-Control-Allow-Origin', ctx.get('Origin'))
    ctx.set('Access-Control-Allow-Credentials', 'true')
    ctx.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE')
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  }
  return await next()
}
