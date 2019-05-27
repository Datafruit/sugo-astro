/** ---------------------- Define Interface ---------------------- */

/**
 * @typedef {Object} Response
 * @property {boolean} success
 * @property {?*} model
 * @property {?string} message
 */

// # 创建项目
/**
 * - url: `/app/project/create`
 * - method: `POST`
 * - params
 *   - name `String`
 * - response
 *   - id
 *   - name
 *   - datasource_name
 *   - company_id
 *   - status
 */

// # 暂停项目
/**
 * - url: `/app/project/stop`
 * - method: `GET`
 * - params
 *   - project_id:String
 * - response
 *   - success: Boolean
 */

// # 启动项目
/**
 * - url: `/app/project/run`
 * - method: `GET`
 * - params
 *   - project_id:String
 * - response
 *   - success: Boolean
 */

// # 删除项目
/**
 * - url: `/app/project/delete:project_id`
 * - method: `GET`
 * - response
 *   - success
 */

// # 获取用户项目列表
/**
 * - url: `/app/project/list`
 * - method: `GET`
 * @see {Project}
 * - response: {Array<Project>}
 */

// # 获取项目下所有的分析表数据
/**
 * - url: `/app/project/tables`
 * - method: `GET`
 * - params
 *   - analysis_id `String`
 */

// # 获取项目信息
/**
 * - url: `/app/project/info`
 * - method: `GET`
 * - params
 *   - project_id: String
 */

// # 接入数据源
/**
 * - url: `/app/project/access`
 * - method: `POST`
 * - param
 *   - [id]  如果填写了id,则表示更新某一记录,如果该记录不存在,则创建
 *   - name
 *   - type
 *   - package_name
 *   - access_type
 *   - project_id
 *   - status
 *   - params
 * @see {DataAnalysis}
 * - response: {DataAnalysis}
 */

// # 删除数据源
/**
 * - url: `/app/project/access/delete:analysis_id`
 * - method: `POST`
 * - param
 *   - [id]  如果填写了id,则表示更新某一记录,如果该记录不存在,则创建
 *   - name
 *   - type
 *   - package_name
 *   - access_type
 *   - project_id
 *   - status
 *   - params
 * @see {DataAnalysis}
 * - response: {DataAnalysis}
 */

// # 配置数据源维度
/**
 * - url: `/app/project/access/dimensions`
 * - method: `POST`
 * - params
 *   - dimensions: {Array<{{name:String, type:Number}}>}
 *   - analysis_id
 *   - platform
 * - response
 *   - dimensions
 *   - datasource_id
 */

// # 查询维度
/**
 * - url : `/app/access/query/dimensions`
 * - method: `POST`
 * - params:
 *   - analysis_ids:Array<String>
 * @see {DimensionsHBase}
 * - response:
 *   - model: {Array<DimensionsHBase>}
 */

// # 创建主表、维表关联关系
/**
 * - url: `/app/project/access/association`
 * - method: `POST`
 * - params
 *   - analysis_id
 *   - main_dimension
 *   - associate_dimension
 * @see{DimensionAssociation}
 * - response:
 *   - model: {Array<DimensionAssociation>}
 */

// # 查询主表、维表关联关系
/**
 * - url : `/app/project/access/association`
 * - method `POST`
 * - params:
 *   - analysis_id
 *   - associate: {Array<String>}
 * @see{DimensionAssociation}
 * - response:
 *   - model: {Array<DimensionAssociation>}
 */

// # 创建supervisor
/**
 * - url: `/app/project/create/supervisor`
 * - method: `POST`
 * - params:
 *   - platform: String
 *   - dimensions: {Array<Object>}
 *   - dataSource: String
 * - response
 *   - id
 */

// # 关闭supervisor
/**
 * - url: `/app/project/shutdown/`
 * - method: `post`
 * - params:
 *   - id
 *   - taskId
 * - response:
 *   - success
 *   - message
 */

// # 内网上报维度
/**
 * - url: `/app/project/post/dimensions?type=type&locate=locate&analysis=analysis`
 * - method: `POST`
 * - body: Array<Object>
 */

// # 内网查询主、维表关联关系
/**
 * - url `/app/project/associations?project_id=project_id`
 * - method: `get`
 * - response: {Object}
 *   - analysis_id:{Array}
 *     - [type|main_dimensions, type|associate_dimension]
 */

/** ---------------------- Define Interface end ---------------------- */
import _ from 'lodash'

export const Interface = {
  info: '/info',
  // 获取用户项目列表
  list: '/list',
  // 获取数据源维度
  tables: '/tables',
  // 创建项目
  create: '/create',
  // 创建子项目
  createChild: '/create-child',
  //更新
  update: '/update',
  // 删除项目
  delete: '/delete',
  show: '/show',
  hide: '/hide',
  disable: '/disable',
  activate: '/activate',
  // 接入数据源
  access: '/access',
  // 删除数据源
  deleteAccess: '/access/delete',
  // 配置数据源维度
  dimensions: '/access/dimensions',
  // 查询维表关联关系
  association: '/access/association',
  // 创建维表关联关系
  associate: '/access/associate',
  // 查询维度
  queryDimensions: '/access/query/dimensions',
  // 复制项目之间主分析表的事件列表记录
  copyProjectEvents: '/access/copy-project-events',
  // 创建新App版本
  createAppVersion: '/access/create-app-version',
  // 查询 supervisor 配置
  querySupervisor: '/query-supervisor',
  // 查询uindexSpec 配置
  queryUindexSpec: '/query-uindex-spec',
  // update supervisor config
  upDateSupervisor: '/update-supervisor',
  // 所有项目排除经纬度
  setSdkGlobalConfig: '/set-sdk-global-config',
  // 所有项目排除经纬度
  getSdkGlobalConfig: '/get-sdk-global-config',
  // 获取所有用户分群
  getUserGroups: '/usergroup/get',
  /** 获取uindex数据源加载状态（数据是否加载完成） */
  uindexLoadStatus: '/uindex-load-status'
}

_.forOwn(Interface, (v, n) => { 
  if(n === 'getUserGroups') {
    Interface[n] = `/app${v}`
  } else {
    Interface[n] = `/app/project${v}`
  }
})
