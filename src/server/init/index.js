import _ from 'lodash'
import db, { initDb } from '../models'
import appInit from './app-init'
import { initDruid, removeProcessContextCacheForPlywood } from '../utils/druid-middleware'
import { checkUpdate } from '../update'
import { initMonitor, initTagHQL, initEventTasks, initActTasks } from './task-init'
import { checkDbRoleRoute } from '../models/apis'
import CONFIG from '../config'
import initDefaultSDKConfig from './init-default-sdk-info'
import { getMacaddress } from '../utils/helper'
import c2k from 'koa2-connect'
import listener from '../listener'
import proxyMiddleware from 'http-proxy-middleware'
import * as WebSocket from './track-websocket.js'
import websocketInit from '../websocket'
// ## extension
import { install } from '../utils/install'
// TODO 改为通过配置引入
import SDKJavaScript from 'sugo-sdk-js'
import {initTempLookupCleanTask} from '../services/temp-lookups.service'
import {initAutoUpdateUserGroupTask} from '../services/segment.service'
import {initCutvCustomMadeReportTask} from '../services/cutv-report.service'
import { initCleanHqlImportFile } from '../services/sugo-tag-hql-import-file.service'
import SugoUserTagUpdateTaskServ from '../services/sugo-user-tag-update-task.service'
import Router from 'koa-router'
import * as pty from 'web-pty'

export default async function init() {
  await getMacaddress() // cache mac address
  await initDb()
  const sql = require('../models').default
  const clusterId = Number(process.env.NODE_APP_INSTANCE || 0)
  if (clusterId === 0) { // 集群模式时，只在第一个进程执行升级脚本
    await checkUpdate(sql)
  }
  await checkDbRoleRoute(sql)
  let extraLocal = {}
  if (CONFIG.shouldInitSugoSDKProject) {
    extraLocal = await initDefaultSDKConfig(sql)
  }
  if (CONFIG.druid) {
    await initDruid()
    // 清除redis中plywood-context缓存标识
    await removeProcessContextCacheForPlywood()
  }
  
  const menus = CONFIG.site.menus
  const { cutvCustomReportScheduleSwitch = false } = CONFIG
  // 没有监控告警不启动task监控
  const menuPaths = _.flatMap(menus, m => _.map(m.children, p => p.path))
  if (menuPaths.includes('/console/monitor-alarms')){
    initMonitor()
  }
  // 没有用户画像不启动task任务
  if (menuPaths.includes('/console/tag-dict')){
    initTagHQL()
    initTempLookupCleanTask()
  }
  if (menuPaths.includes('/console/marketing-events')) {
    initEventTasks()
  }
  if (menuPaths.includes('/console/marketing-acts')) {
    initActTasks()
  }
  if (_.includes(menuPaths, '/console/usergroup')) {
    initAutoUpdateUserGroupTask()
  }
  if (_.includes(menuPaths, '/console/tag-data-manage')) {
    SugoUserTagUpdateTaskServ.getInstance().initAutoUpdateUserTagTask()
    initCleanHqlImportFile()
  }
  if (_.includes(menuPaths, '/console/custom-made-reportform') && cutvCustomReportScheduleSwitch) {
    initCutvCustomMadeReportTask()
  }

  let app = await appInit(extraLocal)

  // install extensions
  await install(app, db, CONFIG.site, SDKJavaScript)

  if (_.isString(CONFIG.activeExtendModules) && CONFIG.activeExtendModules.indexOf('sugo-analytics-extend-nh') > -1) {
    await install(app, db, CONFIG.site, require('sugo-analytics-extend-nh').default)
  }

  await listener.trigger()

  return app
}

/**
 *  初始化websocket以及socket.io服务
 * @param {*} app
 */
export const initSocketServer = (app) => {

  // 初始化可视化埋点所需websocket对象
  WebSocket.createServer()

  let proxyUrls = ['/webconn', '/conn']
  let socket_port = CONFIG.site.sdk_ws_port
  let socketIoServer
  // 如果包含流量分析菜单则需要启动对应依赖的socket.io服务
  if (_.flatMap(CONFIG.site.menus, m => _.map(m.children, p => p.path)).includes('/console/traffic-analytics')) {
    socketIoServer = websocketInit(app)
    proxyUrls.push('/socket.io')
    socket_port = (socket_port - 1) || 8886
  }

  // 读取sdk_ws_url协议（ws或者wss，根据环境决定)
  const protocol = CONFIG.site.sdk_ws_url.split(':')[0] || 'ws'
  const sdkTarget = `${protocol}://localhost:${CONFIG.site.sdk_ws_port}`
  const defaultTarget = `${protocol}://localhost:${socket_port}`

  // 将socket.io服务端端口代理到主服务端口
  const socketProxy = proxyMiddleware(proxyUrls, {
    target: defaultTarget,
    changeOrigin: true, // needed for virtual hosted sites
    router: (req) => {
      const currUrl = req.url
      if (['/webconn', '/conn'].some(url => currUrl.indexOf(url) > -1)) { // sdk可视化埋点websocket
        return sdkTarget
      } else if (currUrl.indexOf('/socket.io') > -1) { // 流量分析socket.io代理
        return defaultTarget
      }
    }
  })

  app.use(c2k(socketProxy))
  socketProxy.socketIoServer = socketIoServer
  return socketProxy
}

/**
 *  初始化web-pty(webshell)
 * @param {*} app
 * @param {*} server 
 */
export const initWebpty = (app, server, ioServer) => {
  const ptyStaticRouter = new Router()
  // 设置静态资源路径，同express
  ptyStaticRouter.all('/res/pty/:type', pty.res.koa)
  app
    .use(ptyStaticRouter.routes())
    .use(ptyStaticRouter.allowedMethods())
  pty.mkpty(server, ioServer)
}
