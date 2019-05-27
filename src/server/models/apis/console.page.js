/**
 * @author WuQic<chao.memo@gmail.com>
 * @description 该文件是配置所有/console/xxx的路由
 */

import {OverviewInDashboard} from './overview'
import { readdirSync } from 'fs'
import { resolve } from 'path'

const base = {
  lib: 'controllers/page.controller',
  func: 'console',
  requireLogin: true,
  requirePermission: true,
  method: 'get',
  class: '图表',
  group: '管理页面'
}

/**
 * @description 读取指定目录的console-page配置
 * @param {any} dirname
 * @returns
 */
function readPageApiFiles(directory  = './console-pages') {
  const files = readdirSync(resolve(__dirname, directory))
  let pageApis  = []
  pageApis = files.reduce((res, f) => {
    return res.concat(require(resolve(__dirname, directory, f)).default)
  }, [])
  return pageApis
}

const otherPages = readPageApiFiles()

/**
 * 平台所有需要权限控制的路由配置
 */
const routes = [
  {
    path: '/slices',
    title: '访问单图列表',
    class: '多维分析',
    group: '单图',
    newRoleDefaultPermission: true
  }, {
    path: '/analytic',
    class: '多维分析',
    group: '多维分析',
    title: '访问多维分析',
    newRoleDefaultPermission: true
  }, {
    path: '/analytic/inspect-source-data',
    class: '多维分析',
    group: '多维分析',
    title: '数据查看/下载',
    newRoleDefaultPermission: true
  }, {
    path: '/source-data-analytic',
    class: '日志分析',
    group: '日志分析',
    title: '访问日志分析'
  }, {
    path: '/insight',
    class: '用户运营',
    requirePermission: false,
    group: '用户细查',
    title: '用户细查'
  }, {
    path: '/subscribe',
    title: '订阅',
    class: '图表',
    group: '我的订阅'
  }, {
    path: '/overview',
    newRoleDefaultPermission: true,
    class: '图表',
    ...(OverviewInDashboard
      ? {
        title: '访问概览看版',
        group: '数据看板'
      }
      : {
        title: '访问概览',
        group: '概览'
      })
  }, {
    path: '/dimension',
    title: '访问维度列表',
    group: '维度管理',
    class: '数据管理',
    newRoleDefaultPermission: true
  }, {
    path: '/measure',
    title: '访问指标列表',
    class: '数据管理',
    group: '指标管理',
    newRoleDefaultPermission: true
  },
  //  {    path: '/datasource',    title: '数据源列表',    group: '数据源管理'  },
  {
    path: '/retention',
    title: '访问留存',
    class: '用户运营',
    group: '留存分析'
  }, {
    path: '/retention/:retentionId',
    requirePermission: false,
    title: '访问留存',
    class: '用户运营',
    group: '留存分析'
  }, {
    path: '/funnel',
    title: '访问漏斗',
    class: '用户运营',
    group: '漏斗分析'
  }, {
    path: '/funnel/:funnelId',
    requirePermission: false,
    title: '漏斗列表',
    group: '漏斗分析'
  }, {
    path: '/funnel/:funnelId/editing',
    requirePermission: false,
    title: '编辑漏斗',
    group: '漏斗分析'
  }, {
    path: '/company',
    title: '访问企业列表',
    class: '管理中心',
    group: '企业管理'
  }, {
    path: '/company/new',
    title: '新建企业',
    class: '管理中心',
    group: '企业管理'
  }, {
    path: '/company/:companyId',
    title: '编辑企业信息',
    class: '管理中心',
    group: '企业管理'
  }, {
    path: '/dashboards',
    title: '访问数据看版',
    class: '图表',
    group: '数据看板',
    newRoleDefaultPermission: true
  }, {
    path: '/dashboards/new',
    title: '新建数据看板',
    class: '图表',
    group: '数据看板',
    requirePermission: false
  }, {
    path: '/dashboards/overview',
    title: '概览看版',
    group: '数据看板',
    requirePermission: false // 这个权限通过 /console/overview 控制
  }, {
    path: '/dashboards/:dashboardId',
    title: '数据看板详情',
    group: '数据看板',
    requirePermission: false
  }, {
    path: '/security/user',
    title: '访问用户列表',
    class: '管理中心',
    group: '用户管理',
    newRoleDefaultPermission: true
  }, {
    path: '/security/role',
    title: '访问用户组列表',
    class: '管理中心',
    group: '用户组管理',
    newRoleDefaultPermission: true
  }, {
    path: '/security/role/new',
    title: '新建用户组',
    class: '管理中心',
    group: '用户组管理'
  }, {
    path: '/security/role/:roleId',
    title: '用户组详情',
    class: '管理中心',
    group: '用户组管理',
    requirePermission: false
  }, {
    path: '/usergroup',
    title: '访问分群列表',
    class: '用户运营',
    group: '用户分群'
  }, {
    path: '/usergroup/new',
    title: '新建用户分群',
    class: '用户运营',
    group: '用户分群',
    requirePermission: false
  }, {
    path: '/usergroup/:usergroupId',
    title: '用户分群详情',
    requirePermission: false,
    group: '用户分群'
  }, {
    path: '/usergroup/:ugId/users',
    title: '用户列表',
    requirePermission: false,
    group: '用户分群'
  }, {
    path: '/inspect-user/:id',
    class: '用户运营',
    group: '用户分群',
    title: '查看用户详情'
  }, {
    path: '/segment-expand',
    title: '访问用户扩群列表',
    class: '用户运营',
    group: '用户扩群'
  }, {
    path: '/segment-expand/new',
    title: '新建用户扩群',
    class: '用户运营',
    group: '用户扩群'
  }, {
    path: '/segment-expand/:seId',
    title: '用户扩群详情',
    class: '用户运营',
    group: '用户扩群'
  }, {
    path: '/',
    title: '管理后台首页',
    common: true,
    class: '图表',
    group: '我的订阅'
  }, {
    path: '/track/:token',
    title: 'SDK',
    requirePermission: false
  }, {
    path: '/track/event-list/:version',
    title: 'sdk可视化配置事件列表',
    requirePermission: false
  }, {
    path: '/track/choose-website-track/:token',
    title: '可视化埋点-选择web埋点页面',
    requirePermission: false
  }, {
    path: '/heat-entry/:token',
    title: '埋点热图入口',
    requirePermission: false
  }, {
    path: '/profile',
    title: '编辑个人信息',
    class: '管理中心',
    group: '用户管理',
    newRoleDefaultPermission: true
  }, {
    path: '/company-info',
    title: '公司信息',
    requirePermission: false
  }, {
    path: '/project',
    title: '访问项目列表',
    class: '数据管理',
    group: '项目管理',
    newRoleDefaultPermission: true
  }, {
    path: '/project/create',
    title: '创建项目',
    class: '数据管理',
    group: '项目管理'
  }, {
    path: '/project/:id',
    title: '数据接入',
    class: '数据管理',
    group: '项目管理'
  }, {
    path: '/access-tools',
    title: '数据导入工具',
    class: '数据管理',
    group: '数据导入工具'
  }, {
    path: '/access-tools/create/:id',
    title: '创建数据导入',
    class: '数据管理',
    group: '项目管理',
    requirePermission: false
  }, {
    path: '/access-tools/edit/:id',
    title: '配置数据导入',
    class: '数据管理',
    group: '项目管理',
    requirePermission: false
  }, {
    path: '/project/datasource-settings',
    title: '访问场景数据设置',
    class: '数据管理',
    group: '场景数据设置',
    newRoleDefaultPermission: true
  }, {
    path: '/loss-predict',
    title: '访问流失预测',
    class: '用户运营',
    group: '流失预测'
  }, {
    path: '/loss-predict/file-histories',
    title: '访问历史文件记录',
    class: '用户运营',
    group: '流失预测'
  }, {
    path: '/loss-predict/file-histories/:fileId',
    requirePermission: false,
    title: '文件详情',
    group: '流失预测'
  }, {
    path: '/loss-predict/:modelId',
    requirePermission: false,
    title: '预测模型结果',
    group: '流失预测'
  }, {
    path: '/loss-predict/:modelId/predictions',
    title: '访问历史预测记录',
    class: '用户运营',
    group: '流失预测'
  }, {
    path: '/loss-predict/:modelId/predictions/:predictionId',
    requirePermission: false,
    title: '预测结果',
    group: '流失预测'
  }, {
    path: '/loss-predict/:modelId/begin-training',
    requirePermission: false,
    title: '开始训练',
    group: '流失预测'
  }, {
    path: '/loss-predict/:modelId/begin-predict',
    class: '用户运营',
    title: '使用模型进行预测',
    group: '流失预测'
  }, {
    title: '访问路径分析',
    path: '/path-analysis',
    requirePermission: true,
    class: '用户运营',
    group: '路径分析'
  }, {
    title: '访问智能分析',
    path: '/pio-projects',
    class: '智能分析',
    group: '智能分析'
  }, {
    title: '新建智能分析',
    path: '/pio-projects/new',
    class: '智能分析',
    group: '智能分析',
    requirePermission: false
  }, {
    title: '智能分析详情',
    path: '/pio-projects/:projectId',
    class: '智能分析',
    group: '智能分析',
    requirePermission: false
  }, {
    title: '访问监控告警',
    path: '/monitor-alarms',
    class: '日志分析',
    group: '监控告警'
  }, {
    title: '新建监控告警',
    path: '/monitor-alarms/create',
    requirePermission: false,
    group: '新建监控告警'
  }, {
    title: '更新监控告警',
    path: '/monitor-alarms/update/:id',
    requirePermission: false,
    group: '更新监控告警'
  }, {
    title: '访问异常记录',
    path: '/monitor-alarms/exceptions/:id',
    class: '日志分析',
    group: '监控告警'
  }, {
    title: '访问操作日志',
    path: '/operate-log',
    class: '管理中心',
    group: '操作日志查询'
  }, {
    title: '访问错误码管理',
    path: '/error-code',
    class: '日志分析',
    group: '监控告警'
  }, {
    path: '/rfm',
    title: '访问RFM客户细分列表',
    class: '用户运营',
    group: 'RFM客户细分'
  }, {
    path: '/rfm/:projectId/:id/info',
    title: 'RFM客户细分详细',
    class: '用户运营',
    group: 'RFM客户细分'
  }, {
    path: '/rfm/:id/new',
    title: '新增RFM客户细分',
    class: '用户运营',
    group: 'RFM客户细分'
  }, {
    path: '/app/rfm/delete',
    title: '删除RFM客户细分',
    class: '用户运营',
    group: 'RFM客户细分'
  }, {
    path: '/traffic-analytics',
    title: '访问流量分析',
    class: '用户运营',
    group: '流量分析'
  }, {
    path: '/traffic-analytics/new',
    requirePermission: false,
    title: '新建流量分析',
    group: '流量分析'
  }, {
    path: '/traffic-analytics/:modelId',
    requirePermission: false,
    title: '查看流量分析',
    group: '流量分析'
  }, {
    path: '/traffic-analytics/:modelId/editing',
    requirePermission: false,
    title: '编辑流量分析',
    group: '流量分析'
  }, {
    path: '/behavior-analytics',
    class: '用户运营',
    title: '行为事件分析',
    group: '行为事件分析'
  }, {
    path: '/behavior-analytics/:modelId',
    class: '用户运营',
    title: '行为事件分析',
    group: '行为事件分析',
    requirePermission: false
  }, {
    title: '实时大屏列表',
    path: '/livescreen',
    class: '图表',
    group: '实时大屏'
  },{
    title: '访问大屏投影',
    path: '/screen-control',
    class: '图表',
    group: '大屏投影'
  },{
    title: '编辑实时大屏',
    path: '/livescreen/:id',
    class: '图表',
    group: '实时大屏',
    requirePermission: false
  },{
    path: '/user-action-analytics',
    group: '事件分析',
    class: '用户运营',
    title: '访问事件分析'
  }, {
    path: '/user-action-analytics/:sliceId',
    class: '用户运营',
    group: '事件分析',
    requirePermission: false,
    title: '编辑单图'
  }, {
    path: '/business-db-setting',
    class: '数据管理',
    group: '业务表管理',
    title: '访问业务表管理'
  }, {
    path: '/publish-manager',
    class: '数据管理',
    group: '发布分享',
    title: '访问发布管理'
  },
  {
    path: '/data-api',
    class: '数据管理',
    group: '数据 API',
    title: '访问数据 API 管理页'
  }, {
    path: '/tag-dict',
    class: '用户画像',
    group: '标签体系',
    title: '访问标签体系'
  }, {
    path: '/tag-users',
    class: '用户画像',
    group: '标签体系',
    title: '标签用户列表',
    requirePermission: false
  }, {
    path: '/tag-users/:id',
    class: '用户画像',
    group: '标签体系',
    title: '查看标签用户详情'
  }, {
    path: '/tag-group',
    class: '用户画像',
    group: '标签体系',
    title: '组合用户画像',
    requirePermission: false
  },
  {
    path: '/tag-macroscopic',
    class: '用户画像',
    group: '宏观画像',
    title: '访问宏观画像'
  },
  {
    path: '/tag-system-manager',
    class: '用户画像',
    group: '标签体系管理',
    title: '访问标签体系管理'
  }, {
    path: '/tag-data-manage',
    class: '用户画像',
    group: '标签数据管理',
    title: '访问标签数据管理'
  }, {
    path: '/tag-value-enhance',
    class: '用户画像',
    group: '价值升档',
    title: '价值升档管理'
  }, {
    path: '/monitor-alarms/notify-templates-management',
    class: '日志分析',
    group: '监控告警',
    title: '访问通知模版管理',
    requirePermission: true
  }, {
    path: '/monitor-alarms/contacts-management',
    class: '日志分析',
    group: '监控告警',
    title: '访问通讯录管理',
    requirePermission: true
  },
  {
    path: '/task-schedule-manager',
    class: '任务调度',
    group: '任务调度',
    title: '访问任务调度管理'
  },
  {
    path: '/task-schedule-manager/:nodeKey',
    class: '任务调度',
    group: '任务调度',
    title: '访问任务调度管理',
    requirePermission: false
  },
  {
    path: '/task-schedule-list/scheduling',
    class: '任务调度',
    group: '任务调度',
    title: '调度列表'
  },
  {
    path: '/task-schedule-list/stream',
    class: '任务调度',
    group: '任务调度',
    title: '正在执行'
  },
  {
    path: '/task-schedule-list/history',
    class: '任务调度',
    group: '任务调度',
    title: '执行历史'
  },
  { path:'/task-schedule-list/dbconnectmanager',
    class:'任务调度',
    group:'任务调度',
    title:'数据库连接管理'

  },

  {
    path: '/microcosmic-portrait/:id',
    class: '用户画像',
    group: '微观画像',
    title: '访问微观画像'
  },
  {
    path: '/microcosmic-portrait',
    class: '用户画像',
    group: '微观画像',
    title: '查询微观画像'
  },
  {
    path: '/scenes',
    title: '访问场景分析',
    class: '图表',
    group: '场景分析',
    newRoleDefaultPermission: true
  },
  {
    path: '/scenes/financial',
    title: '理财/存款',
    class: '图表',
    group: '场景分析',
    newRoleDefaultPermission: true
  },
  {
    path: '/scenes/loan',
    title: '贷款',
    class: '图表',
    group: '场景分析',
    newRoleDefaultPermission: true
  },
  {
    path: '/scenes/use',
    title: '使用分析',
    class: '图表',
    group: '场景分析',
    newRoleDefaultPermission: true
  },
  {
    path: '/heat-map',
    class: '热力图分析',
    group: '行为分析',
    title: '访问热力图分析'
  },
  {
    path: '/web-heat-map',
    class: '热力图分析',
    group: '行为分析',
    title: 'Web热力图分析'
  },
  {
    path: '/custom-made-reportform',
    title: '定制报表',
    class: '图表',
    group: '定制报表'
  },
  {
    path: '/live-screen-case',
    title: '大屏案例',
    class: '图表',
    group: '大屏案例'
  },{
    path: '/live-screen-case/:id',
    title: '查看大屏案例',
    class: '数据管理',
    group: '查看大屏案例'
  }
].concat(
  otherPages
)

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'console'
}
