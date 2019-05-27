const ctrl = 'controllers/utils.controller'
const ctrlUser = 'controllers/user.controller'

const base = {
  requireLogin: false,
  requirePermission: false,
  lib: ctrl,
  method: 'post'
}

const routes = [
  {
    path: '/common/send-cellcode',
    title: '发送验证码',
    func: 'sendCellcode'
  }, {
    path: '/common/validate-cellcode',
    title: '验证验证码',
    func: 'validateCellcode'
  }, {
    path: '/common/validate-email',
    title: '验证邮件地址是否可用',
    func: 'validateEmail'
  }, {
    path: '/common/validate-company-name',
    title: '验证邮件地址是否可用',
    func: 'validateCompanyName'
  }, {
    path: '/common/validate-cellphone',
    title: '验证手机号码是否可用',
    func: 'validateCellphone'
  }, {
    path: '/common/apply-reset-password',
    title: '申请重置密码',
    func: 'applyResetPassword'
  }, {
    path: '/common/reset-password',
    title: '重置密码',
    lib: ctrlUser,
    func: 'resetPassword'
  }, {
    path: '/common/reg',
    title: '注册用户',
    lib: ctrlUser,
    func: 'reg'
  }, {
    path: '/common/verify',
    title: '产品激活',
    func: 'verify'
  }, {
    path: '/app/request-jwt-sign',
    title: '请求 jwt 签名',
    lib: ctrlUser,
    method: 'post',
    func: 'requestJWTSign',
    requireLogin: true
  }, {
    path: '/app/request-jwt-sign',
    title: '请求 jwt 签名',
    lib: ctrlUser,
    method: 'get',
    func: 'requestJWTSign',
    requireLogin: true
  }, {
    path: '/app/qr-image',
    title: '生成任意二维码',
    method: 'get',
    lib: ctrl,
    func: 'genQrImage',
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
