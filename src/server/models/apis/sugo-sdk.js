const sdkCtrl = 'controllers/sugo-sdk.controller'
const desktopCtrl = 'controllers/sugo-desktop.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: sdkCtrl,
  group: 'SDK埋点'
}

const routes = [
  {
    path: '/get/app-versions',
    title: '获取应用版本列表',
    method: 'get',
    func: 'getAppVersions'
  }, {
    path: '/get/track-events',
    title: '获取可视化配置事件列表',
    method: 'get',
    func: 'getTrackEvents'
  }, {
    path: '/get/track-events-draft',
    title: '获取可视化配置事件草稿列表',
    method: 'get',
    func: 'getTrackEventsDraft'
  }, {
    path: '/get/track-events-paging',
    title: '获取可视化配置事件草稿列表',
    method: 'get',
    func: 'getTrackEventsPaging'
  }, {
    path: '/get/page-info-paging',
    title: '分页查询页面列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'getPageInfoPaging'
  }, {
    path: '/get/page-categories-paging',
    title: '按部署状态查询web可视化埋点页面分类列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'getPageCategoriesPaging'
  }, {
    path: '/get/page-info-draft',
    title: '/get/page-info-draft',
    method: 'get',
    func: 'getPageInfoDraft'
  }, {
    path: '/get/page-info',
    title: '/get/page-info',
    method: 'get',
    func: 'getPageInfo'
  }, {
    path: '/snapshot',
    title: '/snapshot',
    method: 'post',
    func: 'snapshot'
  }, {
    path: '/saveevent',
    title: '/saveevent',
    method: 'post',
    func: 'saveEvent'
  }, {
    path: '/save-page-info',
    title: '/savepageinfo',
    method: 'post',
    func: 'savePageInfo'
  }, {
    path: '/deployevent',
    title: '/deployevent',
    method: 'post',
    lib: sdkCtrl,
    func: 'deployEvent'
  }, {
    path: '/get/event-screenshot',
    title: '/get/event-screenshot',
    method: 'get',
    func: 'getEventSreenshot'
  }, {
    path: '/get/event-screenshot-draft',
    title: '/get/event-screenshot-draft',
    method: 'get',
    func: 'getEventSreenshotDraft'
  }, {
    path: '/qrCode',
    title: '/qrCode',
    method: 'get',
    func: 'qrCode'
  }, {
    path: '/copyevents',
    title: '/copyevents',
    method: 'post',
    func: 'copyEvents'
  }, {
    path: '/desktop/track-websites',
    title: '获取可视化埋点启动页面列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'getTrackWebsites'
  }, {
    path: '/desktop/copy_events',
    title: '复制应用事件',
    method: 'get',
    lib: desktopCtrl,
    func: 'copyAppEvents'
  },
//  {
//    path: '/desktop/upgrade_page_field',
//    title: '更新事件<页面>字段',
//    method: 'get',
//    lib: desktopCtrl,
//    func: 'upgradeAppEventsPageField'
//  },
  {
    path: '/delete-all-track-event-page-info-draft',
    title: '清空当前版本号相同的草稿事件/页面',
    method: 'post',
    lib: sdkCtrl,
    func: 'deleteAllTrackEventDraftAndPageInfo'
  }, {
    path: '/delete-page-info-draft',
    title: '删除草稿页面',
    method: 'post',
    lib: sdkCtrl,
    func: 'deletePageInfoDraft'
  }, {
    path: '/update-app-version-status',
    title: '更新埋点版本状态',
    method: 'post',
    lib: sdkCtrl,
    func: 'updateAppVersionStatus'
  }, {
    path: '/get-data-analysis-list',
    title: '获取分析表的列表',
    method: 'get',
    lib: sdkCtrl,
    func: 'getDataAnalysisList'
  }, {
    path: '/merge-track-event-draft',
    title: '合并事件',
    method: 'post',
    lib: sdkCtrl,
    func: 'mergeTrackEventDraft'
  }, {
    path: '/get-page-info-track-event',
    title: '获取可视化埋点页面与事件信息',
    method: 'get',
    lib: sdkCtrl,
    func: 'getPageInfoAndTrackEvent'
  }, {
    path: '/get-dimensionsbytoken',
    title: '获取项目维度',
    method: 'get',
    lib: sdkCtrl,
    func: 'getDimensionsByToken'
  }, {
    path: '/get-category',
    title: '获取页面分类',
    method: 'get',
    lib: sdkCtrl,
    func: 'getCategory'
  }, {
    path: '/app-version/create',
    title: '创建新的app version记录',
    method: 'post',
    lib: sdkCtrl,
    func: 'createAppVersion'
  }, {
    path: '/app-version/update',
    title: '更新app version记录',
    method: 'post',
    lib: sdkCtrl,
    func: 'updateAppVersion'
  }, {
    path: '/app-version/list-with-events-count',
    title: '查询app version记录及已部署事件总数',
    method: 'get',
    func: 'listWithEventsCount'
  }, {
    path: '/app-version/toggle-appversion-status',
    title: '启用禁用appversion',
    method: 'post',
    func: 'toggleAppVersionStatus'
  }, {
    path: '/sdk-upload-importfile',
    title: '上传项目导入文件',
    method: 'post',
    func: 'sdkUploadImportFile'
  }, {
    path: '/sdk-start-importdata',
    title: '开始写入导入文件',
    method: 'post',
    func: 'sdkStartImportdata'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sdk'
}
