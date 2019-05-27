const ctrl = 'controllers/page.controller'

const base = {
  requireLogin: false,
  requirePermission: false,
  lib: ctrl,
  method: 'get'
}

/***
 * 公用，独立页面路由配置， 不需要权限控制可直接访问的页面
 */
const routes = [
  {
    path: '/',
    title: '首页',
    func: 'login'
  },{
    path: '/verify-page',
    title: '注册码验证',
    func: 'verify'
  }, {
    path: '/reg',
    title: '注册页面',
    func: 'reg'
  }, {
    path: '/validate-email/:id',
    title: '验证邮件地址',
    func: 'validateEmailPage'
  }, {
    path: '/retrieve-password',
    title: '找回密码页面',
    func: 'retrievePasswordPage'
  }, {
    path: '/reset-password/:id',
    title: '重置密码页面',
    func: 'resetPasswordPage'
  }, {
    path: '/login',
    title: '登录页',
    func: 'login'
  }, {
    path: '/track',
    title: '埋点圈选',
    func: 'track'
  }, {
    path: '/heat',
    title: '埋点热图',
    func: 'heat'
  }, {
    path: '/livescreen/:livescreenId',
    title: '大屏展示',
    func: 'livescreen',
    requireLogin: true
  }, {
    path: '/live-screen-broadcast-terminal',
    title: '大屏投影终端',
    func: 'livescreenBroadcastTerminal',
    requireLogin: false
  }, {
    path: '/web-pty',
    title: 'web-pty',
    func: 'webPty',
    requireLogin: true
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : ''
}
