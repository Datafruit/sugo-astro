import { utils } from 'next-reader'
const short_id = utils.short_id



/** 项目相关Action */
const ProjectActionTypes = {
  ProfileList: short_id(),              // 项目列表
  AddProject: short_id(),               // 添加项目
  UpdateProject: short_id(),
  HideProject: short_id(),
  ShowProject: short_id(),
  DisableProject: short_id(),           // 禁用项目
  ActivateProject: short_id(),          // 禁用项目
  DeleteProject: short_id(),            // 删除项目
  Profile: short_id(),                  // 项目信息
  CreateProjectModal: short_id(),       // 创建项目面板状态
  AddDataSources: short_id(),           // 增加数据源
  DeleteDataSources: short_id(),        // 删除数据源
  UpdateDataSources: short_id(),        // 更新数据源
  UpdatingDataSources: short_id(),      // 更新数据源
  AddRoles: short_id(),                 // 更新数据源
  SetPage: short_id(),                  // 更新page
  CreateAuthorizationModal: short_id(), // 更新数据源
  projectSettingModal: short_id(),      // 设置按钮
  ProjectCheckModal: short_id(),        // 设置按钮
  updateSupervisorStatus: short_id(),   // 查询supervisor状态
  saveSupervisorConfig: short_id(),     // 保存查询的 supervisor 配置
  setSdkGlobalConfig: short_id(),    // 设置sdk项目下发配置排除维度
  getUserGroups: short_id()     // 获取所有用户分群
}

/** 接入项目数据相关Action */
const ProjectAccessActionTypes = {
  ProjectInit: short_id(),              // 项目初始化
  AccessList: short_id(),               // 项目接入数据信息列表
  DimensionsList: short_id(),           // 项目维度信息
  OverviewData: short_id(),             // 数据预览
  AddAssociation: short_id(),           // 添加关联关系
  RemoveAssociation: short_id()         // 移除关联关系
}

/** 消息类型 */
const MessageTypes = {
  Notification: short_id(),             // 通知
  InterfaceError: short_id()            // 请求接口出错
}

export {
  ProjectActionTypes,
  ProjectAccessActionTypes,
  MessageTypes
}
