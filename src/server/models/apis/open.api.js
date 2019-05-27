/**
 * 统一对外开放api（排除权限过滤)
 */
const dsController = 'controllers/sugo-datasources.controller'
const usergroupCtrl = 'controllers/usergroups.controller'
const sdkCtrl = 'controllers/sugo-sdk.controller'
const desktopCtrl = 'controllers/sugo-desktop.controller'
const sliceCtrl = 'controllers/slices.controller'
const livefeedCtrl = 'controllers/sugo-livefeeds.controller'
const uploadedFilesCtrl = 'controllers/uploaded-files.controller'
const projectCtrl = 'controllers/project.controller'
const dimensionCtrl = 'controllers/sugo-dimensions.controller'
const plyql = 'controllers/plyql.controller'
const tagType = 'controllers/tag-type.controller'
const projectApply = 'controllers/sugo-project-apply.controller'

const base = {
  requireLogin: false,
  requirePermission: false
}

/**
 * 配置不需要登录验证的路由
 */
const routes = [
  {
    path: '/json/list',
    title: '提供api给调度（获取所以的数据源json)',
    method: 'get',
    lib: dsController,
    requireLogin: false,
    func: 'list'
  }, {
    path: '/plyql/sql',
    title: '/plyql/sql',
    method: 'post',
    lib: plyql,
    func: 'queryBySQL'
  }, {
    path: '/access/get-gzfile',
    title: '生成数据源接入客户端采集文件',
    method: 'get',
    lib: dsController,
    func: 'generateAccessFile'
  }, {
    path: '/get/usergroup',
    title: '/get/usergroup',
    method: 'get',
    lib: usergroupCtrl,
    func: 'get'
  }, {
    path: '/update-usergroup',
    title: '/update-usergroup',
    method: 'post',
    lib: usergroupCtrl,
    func: 'apiUpdate'
  }, {
    path: '/query-usergroup',
    title: '/query-usergroup',
    method: 'get',
    lib: usergroupCtrl,
    func: 'remoteRead'
  }, {
    path: '/sdk/decide',
    title: '/decide',
    method: 'get',
    lib: sdkCtrl,
    func: 'decide'
  }, {
    path: '/sdk/decide-event',
    title: '获取吗埋点事件',
    method: 'get',
    lib: sdkCtrl,
    func: 'decideTrackEvent'
  }, {
    path: '/sdk/decide-dimesion',
    title: '获取维度',
    method: 'get',
    lib: sdkCtrl,
    func: 'decideDimension'
  }, {
    path: '/sdk-wx-mini/dimensions',
    title: '微信小程序获取维度',
    method: 'get',
    lib: sdkCtrl,
    func: 'getDimensionsForWX'
  }, {
    path: '/sdk/desktop/decide',
    title: '获取webSDK事件绑定列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'decide'
  }, {
    path: '/sdk/desktop/vtrack-events',
    title: 'web可视化埋点获取事件绑定列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'vtrackEvents'
  }, {
    path: '/sdk/desktop/page-categories',
    title: 'web可视化埋点页面分类列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'findAllPageCategories'
  },
  
  {
    path: '/sdk/desktop/page-categories-deployed',
    title: 'web可视化埋点已部署页面分类列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'findAllDeployedPageCategories'
  }, {
    path: '/sdk/desktop/page-categories/save',
    title: '创建web可视化埋点页面分类',
    method: 'post',
    lib: desktopCtrl,
    func: 'savePageCategories'
  }, {
    path: '/sdk/desktop/page-info-list',
    title: '查询token所属的所有页面信息记录',
    method: 'get',
    lib: desktopCtrl,
    func: 'getEntirePageInfoByToken'
  }, {
    path: '/sdk/desktop/page-info-list-deployed',
    title: '查询token所属已部署的所有页面信息记录',
    method: 'get',
    lib: desktopCtrl,
    func: 'getEntireDeployedPageInfoByToken'
  }, {
    path: '/sdk/desktop/vtrack-events-draft',
    title: 'web可视化埋点获取事件草稿绑定列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'vtrackEventsDraft'
  }, {
    path: '/sdk/desktop/vtrack-events-draft/create',
    title: 'web可视化埋点保存草稿事件表',
    method: 'post',
    lib: desktopCtrl,
    func: 'saveVtrackEventsDraft'
  }, {
    /* SDK 相关的接口不改，不然用户没升级analytics就不能更新SDK
     * @author coinxu
     * @date 2018/01/08
     */
    path: '/sdk/desktop/vtrack-events-draft/delete',
    title: 'web可视化埋点删除草稿事记录',
    method: 'delete',
    lib: desktopCtrl,
    func: 'deleteEventDraft'
  }, {
    path: '/sdk/desktop/vtrack-events/deploy',
    title: '部署web可视化配置',
    method: 'post',
    lib: desktopCtrl,
    func: 'deployEvent'
  }, {
    path: '/sdk/desktop/save-page-info',
    title: '保存PC埋点页面参数设置',
    method: 'post',
    lib: desktopCtrl,
    func: 'savePageInfoDraft'
  }, {
    path: '/sdk/desktop/dimensions',
    title: '获取项目维度',
    method: 'post',
    func: 'getDimensionsByDataSource',
    lib: dimensionCtrl
  }, {
    path: '/query-druid',
    title: '查询单图数据',
    method: 'get',
    func: 'queryDruidData',
    lib: sliceCtrl
  }, {
    path: '/druidDistinct/:dataSourceName/:columnName',
    title: '查询单图数据TOPN',
    method: 'get',
    func: 'queryDruidDistinct',
    lib: sliceCtrl
  }, {
    path: '/sugo-livefeeds/get',
    title: '查询实时大屏详情',
    method: 'get',
    func: 'get',
    lib: livefeedCtrl
  }, {
    path: '/uploaded-files/get',
    title: '查询上传文件',
    method: 'get',
    func: 'getFiles',
    lib: uploadedFilesCtrl
  }, {
    path: '/slices/:id',
    title: '获取单图详情',
    method: 'get',
    func: 'querySliceForPublic',
    lib: sliceCtrl
  }, {
    path: '/datasources/list',
    title: '获取所以的数据源json提供给后台api',
    method: 'get',
    lib: dsController,
    func: 'list'
  }, {
    path: '/slices/list/:dataSourceName',
    title: '查询所有单图列表提供给后台api',
    method: 'get',
    func: 'querySliceListForPublic',
    lib: sliceCtrl
  }, {
    path: '/slices/query-druid',
    title: '通过单图params参数查询druid数据提供给后台api',
    method: 'post',
    func: 'queryDruidDataForApi',
    lib: sliceCtrl
  },
  {
    path: '/dimension',
    title: '给后台api查询维度',
    method: 'post',
    func: 'openList',
    lib: dimensionCtrl
  }, {
    path: '/project/associations',
    title: '项目维度关联关系',
    method: 'get',
    func: 'queryProjectAccessAssociation',
    lib: projectCtrl
  }, {
    path: '/dimensions/:projectId',
    title: '维度接口api给数据清洗使用',
    method: 'get',
    func: 'getDimsionsForApi',
    lib: dsController
  }, {
    path: '/sdk/heat',
    title: '/heat',
    method: 'get',
    lib: sdkCtrl,
    func: 'heat'
  }, {
    path: '/plyql/get-query',
    title: '获取单图查询参数的druid查询json',
    method: 'post',
    lib: plyql,
    func: 'getDruidQuery'
  }, {
    path: '/plyql/health',
    title: '检查plyql服务是否正常',
    func: 'health',
    lib: plyql,
    method: 'get'
  }, {
    path: '/plyql/lucene',
    title: '使用 lucene 查询 druid',
    method: 'get',
    lib: plyql,
    func: 'queryByLucene'
  }, {
    path: '/tag-manger/update-tag-table',
    title: '更新标签相关表名称',
    func: 'updateTagTable',
    lib: tagType,
    method: 'get'
  }, {
    path: '/sdk/get-first-login-time',
    title: '/decide',
    method: 'get',
    lib: sdkCtrl,
    func: 'getFirstLoginTime'
  }, {
    path: '/sdk/desktop/get-first-login-time',
    title: '获取webSDK事件绑定列表',
    method: 'get',
    lib: desktopCtrl,
    func: 'getFirstLoginTime'
  },
  {
    path: '/v2/uits/project-apply',
    title: '无限极埋点项目申请接口',
    method: 'post',
    lib: projectApply,
    func: 'create'
  },
  {
    path: '/v2/uits/project-accredit',
    title: '无限极埋点项目申请接口',
    method: 'post',
    lib: projectApply,
    func: 'createUser'
  },{
    path: '/sdk/get-first-start-time',
    title: '/decide',
    method: 'get',
    lib: sdkCtrl,
    func: 'getFirstStartTime'
  },{
    path: '/v2/list-all-tindex-and-uindex',
    title: '获取所有tindex和uindex的datasourceName和projectName',
    method: 'get',
    lib: projectCtrl,
    func: 'listAllTindexAndUindexsDatasourceNameAndProjectName'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'api'
}
