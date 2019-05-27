const ctrl = 'controllers/project.controller'
const ctrlConfig = 'controllers/sugo-global-config.controller'
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '数据管理',
  group: '项目管理'
}

const routes = [
  {
    path: '/create',
    title: '新建项目',
    method: 'post',
    func: 'create'
  },
  {
    path: '/diy-sdk',
    title: '自定义sdk项目',
    method: 'post',
    func: 'diySdk'
  },
  {
    path: '/create-child',
    title: '新建子项目',
    method: 'post',
    func: 'createChildProject',
    requirePermission: true
  },
  {
    path: '/update',
    title: '更新项目',
    method: 'post',
    func: 'update'
  },
  {
    path: '/show/:project_id',
    title: '显示项目',
    method: 'get',
    func: 'show'
  },
  {
    path: '/hide/:project_id',
    title: '隐藏项目',
    method: 'get',
    func: 'hide'
  },
  {
    path: '/disable/:project_id',
    title: '禁用项目',
    method: 'get',
    func: 'disable'
  },
  {
    path: '/activate/:project_id',
    title: '启用项目',
    method: 'get',
    func: 'activate'
  },
  {
    path: '/delete/:project_id',
    title: '删除项目',
    method: 'get',
    requirePermission: true,
    func: 'deleteProject'
  },
  //  {
  //    path: '/delete/topic/:dataSource',
  //    title: 'deleteTopic',
  //    method: 'get',
  //    func: 'deleteTopic'
  //  },
  {
    path: '/list',
    title: '获取用户项目列表',
    method: 'get',
    func: 'projectList'
  },
  {
    path: '/tables',
    title: '获取项目下所有的分析表数据',
    method: 'get',
    func: 'tables'
  },
  {
    path: '/appid-list',
    title: '获取所有appid',
    method: 'get',
    func: 'getAppIdList'
  },
  {
    path: '/info',
    title: '获取项目信息',
    method: 'get',
    func: 'projectInfo'
  },
  {
    path: '/access',
    title: '接入数据源',
    method: 'post',
    func: 'accessDataSource'
  },
  {
    path: '/access/delete/:analysis_id',
    title: '删除数据源',
    method: 'get',
    func: 'deleteAccessData'
  },
  {
    path: '/access/dimensions',
    title: '配置数据源维度',
    method: 'post',
    func: 'createAccessDimensions'
  },
  {
    path: '/access/query/dimensions',
    title: '查询数据源维度',
    method: 'post',
    func: 'queryAccessDimensions'
  },
  {
    path: '/access/associate',
    title: '创建主表、维表关联关系',
    method: 'post',
    func: 'createAccessAssociation'
  },
  {
    path: '/access/association',
    title: '查询主表、维表关联关系',
    method: 'post',
    func: 'queryAccessAssociation'
  },
  {
    path: '/access/update-status',
    title: '更新sdk检查状态',
    method: 'put',
    func: 'updateAnalysisStatus'
  },
  {
    path: '/access/copy-project-events',
    title: '主分析表跨项目复制埋点事件记录',
    method: 'post',
    func: 'copyProjectEvents'
  },
  {
    /* SDK 相关的接口不改，不然用户没升级analytics就不能更新SDK
     * @author coinxu
     * @date 2018/01/08
     */
    path: '/access/delete-track-event-draft',
    title: '删除可视化配置事件草稿',
    method: 'delete',
    func: 'deleteTrackEventDraft'
  },
  {
    path: '/access/edit-track-event',
    title: '更改可视化配置事件',
    method: 'post',
    func: 'editTrackEvent'
  },
  {
    path: '/updateProjectRoles/:id',
    title: '修改项目权限',
    method: 'put',
    func: 'updateProjectRoles'
  },
  {
    path: '/access/create-app-version',
    title: '创建新App版本',
    method: 'post',
    func: 'createAppVersion'
  },
  {
    path: '/access-task/create',
    title: '创建数据接入task记录',
    method: 'post',
    func: 'createAccessTask'
  },
  {
    path: '/access-task/update',
    title: '更新数据接入task记录',
    method: 'post',
    func: 'updateAccessTask'
  },
  {
    path: '/access-task/list',
    title: '查询项目下的所有task',
    method: 'get',
    func: 'queryAccessTaskList'
  },
  {
    path: '/access-task/query',
    title: '查询数据接入task信息',
    method: 'get',
    func: 'queryAccessTask'
  },
  {
    path: '/access-task/create-and-run',
    title: '创建并运行task',
    method: 'post',
    func: 'createAndRunTask'
  },
  {
    path: '/access-task/stop',
    title: '停止运行task',
    method: 'post',
    func: 'stopTask'
  },
  {
    path: '/access-task/run',
    title: '运行task',
    method: 'post',
    func: 'runTask'
  },
  {
    path: '/access-task/query-with-status',
    title: '查询task并带上参数',
    method: 'post',
    func: 'queryTaskWithStatus'
  },
  {
    path: '/access-task/log',
    title: '查询日志',
    method: 'get',
    func: 'queryTaskLog'
  }, {
    path: '/associate-user-table',
    title: '关联用户表',
    method: 'post',
    func: 'associateRealUserTable'
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/toggle-visibility/:project_id',
    title: '显示/隐藏项目',
    method: 'post',
    func: 'create',
    requirePermission: true
  }, {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/toggle-data-input/:project_id',
    title: '运行/暂停项目',
    method: 'post',
    func: 'create',
    requirePermission: true
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/update-project-name',
    title: '更改项目名称',
    method: 'post',
    func: 'create',
    requirePermission: true
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/permission-grant',
    title: '授权设置',
    method: 'post',
    func: 'create',
    requirePermission: true
  },
  {
    path: '/query-supervisor',
    title: '查询supervisor配置',
    method: 'post',
    func: 'querySupervisor'
  },
  {
    path: '/query-uindex-spec',
    title: '查询uindexSpec配置',
    method: 'post',
    func: 'queryUindexSpec'
  },
  {
    path: '/update-supervisor',
    title: '配置supervisor',
    method: 'post',
    func: 'upDateSupervisor',
    requirePermission: true
  },
  {
    path: '/set-sdk-global-config',
    title: '设置所有项目排除经纬度',
    method: 'post',
    lib: ctrlConfig,
    func: 'setSdkGlobalConfig',
    requirePermission: false
  },
  {
    path: '/get-sdk-global-config',
    title: '获取项目排除经纬度',
    method: 'get',
    lib: ctrlConfig,
    func: 'getSdkGlobalConfig',
    requirePermission: false
  },
  {
    path: '/uindex-load-status',
    title: '获取Uinde数据加载完成进度状态',
    method: 'get',
    func: 'getUindexLoadStatus',
    requirePermission: false
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/project'
}
