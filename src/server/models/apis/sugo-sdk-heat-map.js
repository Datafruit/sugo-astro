const sdkCtrl = 'controllers/sdk-heat-map.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: sdkCtrl,
  group: 'SDK埋点热图'
}

const routes = [
  {
    path: '/list',
    title: '获取热图列表',
    method: 'get',
    func: 'getHeatMap'
  }, {
    path: '/save',
    title: '保存热图配置',
    method: 'post',
    func: 'creatHeatMap'
  }, {
    path: '/delete',
    title: '保存热图配置',
    method: 'get',
    func: 'deleteHeatMap'
  }, {
    path: '/get/:id',
    title: '保存热图配置',
    method: 'get',
    func: 'getHeatMapById'
  }, {
    path: '/get-web-list',
    title: '获取Web热图列表',
    method: 'get',
    func: 'getHeatMapsForWeb'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sdk/heat-map'
}
