/**
 * Created by asd on 17-7-11.
 */

import Action from './action'
import Actions from './actions'
import { WEB_EDITOR_VIEW_STATE, TRACK_EVENT_STATE } from './constants'

/**
 * 事件列表过滤项
 * @typedef {Object} AccessWebAppEventsFilter
 * @property {?string} [name]
 * @property {?string} [page]
 * @property {?string} [state]
 */

/**
 * 页面有三个状态
 * normal - 显示docs
 * checking - 检测状态
 * @typedef {Object} SDKEditorAndAccessorViewModel
 * @property {Boolean} checking  - 检测状态中
 * @property {Boolean} check_end - 检测结束
 * @property {Boolean} installed - 是否已安装
 *
 * @property {Array<AppVersionModel>} appVersionsModels
 * @property {Array<AppVersionModel>} visibleAppVersionModels - 当前显示的app version
 * @property {Boolean} ModalVisible          - 显示创建app version modal
 * @property {String} appVersion                              - 输入的app version
 *
 * @property {Object} copyEventsComponentProps                - 复制事件组件属性
 * @property {Array<ProjectModel>|null} projects              - 项目列表
 *
 * @property {number} view_state                              - 视图状态
 * @property {String} searchKey                               - 搜索
 *
 * @property {Array<{value:string,key:number,name:string}>} appEventState   - 事件状态可选列表
 * @property {Array<string>} appEventPages                                  - 所有事件页面汇总
 * @property {AccessWebAppEventsFilter} appEventsFilter                     - 事件列表过滤条件
 * @property {Object} deployedMap                                           - 已部署事件
 * @property {Object} appCategories                                         - 过滤后的页面分类
 * @property {Object} appPages                                              - 页面集合
 * @property {Object} appBaseCategories                                     - 页面分类
 * @property {Object} appPagesFilter                                        - 页面过滤条件
 * @property {Object} deployedPageMap                                       - 已部署页面信息
 *
 * @property {?{type:string, message:string}} message         - 异常信息
 */
const Def = {
  // accessor
  checking: false,
  check_end: false,
  installed: false,

  // editor
  appVersionsModels: [],
  visibleAppVersionModels: [],
  ModalVisible: false,
  isImporting: false,
  appVersion: '',

  // copy events
  copyEventsComponentProps: null,
  projects: null,

  view_state: WEB_EDITOR_VIEW_STATE.EDITOR,
  searchKey: '',

  // events list
  appEvents: [],
  appPages: [],
  appEventPages: [],
  appCategories: [],
  appEventState: [
    { value: 'DEPLOYED', key: TRACK_EVENT_STATE.DEPLOYED, name: '已部署' },
    { value: 'DRAFT', key: TRACK_EVENT_STATE.DRAFT, name: '未部署' }
  ],
  appEventsFilter: {},
  appPagesFilter: {},
  appCategoriesFilter: {},
  deployedMap: {},
  deployedPageMap: {},
  message: null,
  uploadVersion: null,
  uploadedFile: {
    isUploaded: false,
    filename: '无'
  }
}

/**
 * @param {SDKEditorAndAccessorViewModel} state
 * @param {Object} action
 * @param {Function} next
 * @return {Object}
 */
function scheduler (state, action, next) {
  const { type, payload } = action
  switch (type) {

    case Action.check:
      return Actions.checkAnalysis(this.store, next)

    case Action.createAppVersion:
      return Actions.createAppVersion(state, this.store, next)

    case Action.queryAppVersion:
      return Actions.queryAppVersions(state, this.store, next)

    case Action.queryProjectsList:
      return Actions.queryProjectsList(state, this.store, next)

    case Action.toggleAppVersionStatus:
      return Actions.toggleAppVersionStatus(state, payload.id, this.store, next)

    case Action.updateAppVersion:
      return Actions.updateAppVersion(
        state,
        payload.app_version,
        payload.id,
        this.store,
        next
      )

    case Action.deployAppEvents:
      return Actions.deployAppEvents(payload.app_id, payload.app_version, state, this.store, next)

    case Action.downloadEvents:
      return Actions.downloadEvents(state, payload.id, this.store, next)

    case Action.startImporting:
      return Actions.startImporting(state, payload, this.store, next)

    case Action.batchExport:
      return Actions.batchExport(state, payload.id, this.store, next)
  
    case Action.batchImport:
      return Actions.batchImport(state, payload.id, this.store, next)

    case Action.setUploadedFilename:
      return Actions.setUploadedFilename(state, this.store, payload.name, next)

    case Action.searchKey:
      return Actions.searchKey(state, payload.searchKey, this.store, next)

    case Action.filterEvents:
      return Actions.filterEvents(state, this.store, payload, next)

    case Action.filterPages:
      return Actions.filterPages(state, this.store, payload, next)

    case Action.filterCategories:
      return Actions.filterCategories(state, this.store, payload, next)
    case Action.pagesForFilterEvents:
      return Actions.pagesForFilterEvents(state, payload, next)
    case Action.change:
      return {
        ...state,
        ...payload
      }

    default:
      return state
  }
}

export default {
  name: 'vm',
  state: { ...Def },
  scheduler
}

export {
  Action
}
