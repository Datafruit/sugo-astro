/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/29
 * @description 允许CROS响应头
 */

export default async function (ctx, next) {
  if (/\.(png|jpg|svg|ttf|woff|eot|txt|zip)/.test(ctx.path)) {
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.set('Access-Control-Allow-Credentials', 'true')
    ctx.set('Access-Control-Allow-Methods', 'GET')
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  }
  
  await next()
}
