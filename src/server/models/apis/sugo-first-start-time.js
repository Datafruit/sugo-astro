const sdkCtrl = 'controllers/sugo-first-start-time.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: sdkCtrl,
  group: 'SDK首次登陆'
}

const routes = [
   {
    path: '/get-device-count',
    title: '获取启动设备数',
    method: 'get',
    func: 'getDeviceCountForCutv'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sdk-first-start-time'
}
