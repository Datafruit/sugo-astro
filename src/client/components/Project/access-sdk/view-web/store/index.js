/**
 * Created by asd on 17-7-11.
 */

import { Store, storeModelCreator, storeViewModelCreator, storeCollectionCreator } from 'sugo-store'

import Project, { Action as ProjectAction } from '../../../../../models/project'
import DataAnalysis, { Action as DataAnalysisAction } from '../../../../../models/data-analysis'

import VM, { Action as VMAction } from './view-model'
import { WEB_EDITOR_VIEW_STATE } from './constants'

/**
 * @param {String} type
 * @param {Object} [payload]
 * @return {{type: String, payload: Object}}
 */
function struc (type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} WebSDKAccessorState
 * @property {ProjectStoreModel} Project
 * @property {DataAnalysisStoreModel} DataAnalysis
 * @property {AccessWebSDKTractEventsCollection} TrackEvents
 * @property {AccessWebSDKTractEventsDraftCollection} TrackEventsDraft
 * @property {AccessWebSDKPageInfoDraftCollection} PageInfoDraft
 * @property {SDKEditorAndAccessorViewModel} vm
 */
export default class Accessor extends Store {
  constructor () {
    super()
    storeModelCreator([Project, DataAnalysis], this)
    storeViewModelCreator([VM], this)
    this.initialize()
  }

  /**
   * @param {Object|Array<Object>} actionOrActions
   * @return {Promise<WebSDKAccessorState>}
   */
  async dispatchAsync (actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * 初始化时，更新ProjectModel与DataAnalysisModel
   * @param {ProjectModel} project
   * @param {DataAnalysisModel} analysis
   * @param {Boolean} [query=false] - 如果为true，则会去查analysis所属的AppVersionModel
   * @return {Accessor}
   */
  init (project, analysis, query) {
    this.dispatch(struc(ProjectAction.change, { ...project }))
    this.dispatch(struc(DataAnalysisAction.change, { ...analysis }), () => {
      if (query) this.dispatch(struc(VMAction.queryAppVersion))
    })
    return this
  }

  /**
   * 检测安装状态
   * @return {Accessor}
   */
  check () {
    this.dispatch(struc(VMAction.check))
    return this
  }

  /**
   * 用户输入app_version时更新
   * @param appVersion
   * @return {Accessor}
   */
  setAppVersion (appVersion) {
    this.dispatch(struc(VMAction.change, { appVersion }))
    return this
  }

  /**
   * 设置创建AppVersion Modal状态
   * @param visibleAppVersionCreatorModal
   * @return {Accessor}
   */
  setCreateAppVersionModal (ModalVisible) {
    this.dispatch(struc(VMAction.change, { ModalVisible }))
    return this
  }

  setIsImporting (isImporting) {
    this.dispatch(struc(VMAction.change, { isImporting }))
    return this
  }

  setUploadedFilename (payload) {
    this.dispatch(struc(VMAction.change, {
      uploadedFile: payload
    }))
  }

  startImporting (payload) {
    this.dispatch(struc(VMAction.startImporting, payload))
  }

/**
 * 设置将要导入数据的版本号
 * @param visibleAppVersionCreatorModal
 * @return {Accessor}
 */
  setUploadVersion (appVersion) {
    this.dispatch(struc(VMAction.change, { uploadVersion: appVersion }))
    return this
  }

  /**
   * 新建AppVersion
   * @return {Accessor}
   */
  createAppVersion () {
    this.dispatch(struc(VMAction.createAppVersion))
    return this
  }

  /**
   * 切换AppVersion状态
   * @param id
   * @return {Accessor}
   */
  toggleAppVersionStatus (id) {
    this.dispatch(struc(VMAction.toggleAppVersionStatus, { id }))
    return this
  }

  clearMessage () {
    this.dispatch(struc(VMAction.change, { message:null }))
  }

  /**
   * @param {String} app_version
   * @param {String} id
   * @return {Accessor}
   */
  updateAppVersion (app_version, id) {
    this.dispatch(struc(VMAction.updateAppVersion, { app_version, id }))
    return this
  }

  /**
   * 打开复制事件modal
   * @param {String} app_version_id
   * @return {Accessor}
   */
  openCopyEventsModal (app_version_id) {
    const { DataAnalysis, vm, Project } = this.getState()
    const record = vm.appVersionsModels.find(r => r.id === app_version_id)

    if (!record) {
      return this
    }

    const open = state => {
      return this.dispatch(struc(VMAction.change, {
        copyEventsComponentProps: {
          current: {
            projectId: Project.id,
            analysisId: DataAnalysis.id,
            analysisName: DataAnalysis.name,
            accessType: DataAnalysis.access_type,
            projectName: Project.name,
            appVersion: record.app_version
          },
          projects: state.vm.projects,
          visible: true,
          refreshAppVersion: () => {
            console.log(arguments)
          },
          onCancel: () => {
            return complete => {
              if (complete) {
                console.log('complete')
              }
              this.dispatch(struc(VMAction.change, { copyEventsComponentProps: null }))
            }
          }
        }
      }))
    }

    if (!vm.projects) {
      this.dispatch(struc(VMAction.queryProjectsList), open)
    } else(
      open({ vm })
    )

    return this
  }

  /**
   * 部署埋点
   * @param {string} app_version
   */
  deployAppEvents (app_version) {
    this.dispatch(struc(VMAction.deployAppEvents, {
      app_id: this.state.DataAnalysis.id,
      app_version: app_version || '0'
    }))
  }

  /**
   * 导出部署版本事件
   * @param id - app version id
   * @return {Accessor}
   */
  downloadEvents (id) {
    this.dispatch(struc(VMAction.downloadEvents, { id }))
    return this
  }

  /**
   * 批量导出部署版本事件
   * @param id - app version id
   * @return {Accessor}
   */
  batchExport (id, appid) {
    this.dispatch(struc(VMAction.batchExport, { id, appid }))
    return this
  }

  /**
   * 批量导入部署版本事件
   * @param id - app version id
   * @return {Accessor}
   */
  batchImport (id, appid) {
    this.dispatch(struc(VMAction.batchImport, { id, appid }))
    return this
  }

  /**
   * 更新视图状态
   * @param {number} view_state
   * @return {Accessor}
   */
  setViewState (view_state) {
    return this.dispatch(struc(VMAction.change, { view_state }))
  }

  /**
   * 过滤事件列表
   * @param {AccessWebAppEventsFilter} filter
   * @return {Accessor}
   */
  filterEvents (filter) {
    return this.dispatch(struc(VMAction.filterEvents, filter))
  }
  
  /**
   * 过滤页面
   * @param {AccessWebAppEventsFilter} filter
   * @return {Accessor}
   */
  filterPages (filter) {
    return this.dispatch(struc(VMAction.filterPages, filter))
  }
  
  /**
   * 过滤页面分类
   * @param {AccessWebAppEventsFilter} filter
   * @return {Accessor}
   */
  filterCategories (filter) {
    return this.dispatch(struc(VMAction.filterCategories, filter))
  }

  /**
   * 列出应用事件面板
   * @param {AppVersionModel} AppVersion
   * @return {Accessor}
   */
  listAppVersionEvents (AppVersion) {
    const query =  {
      pageSize: 20,
      pageIndex: 1,
      app_id: AppVersion.appid,
      app_version: AppVersion.app_version,
      state: "DEPLOYED",
      event_bindings_version: AppVersion.event_bindings_version,
      lastDeployedOn: AppVersion.last_deployed_on
    }
    return this.dispatch([
      struc(VMAction.filterPages, query),
      struc(VMAction.filterEvents, query),
      struc(VMAction.filterCategories, query),
      struc(VMAction.pagesForFilterEvents, query),
      struc(VMAction.change, { view_state: WEB_EDITOR_VIEW_STATE.EVENTS_LIST })
    ])
  }

  /**
   * 搜索版本列表
   * @param {String} searchKey
   * @return {Accessor}
   */
  filterAppVersion (searchKey) {
    this.dispatch(struc(VMAction.searchKey, { searchKey }))
    return this
  }

  /**
   * 页面过滤
   */
  getAppEventPages(page) {
    return this.dispatch(struc(VMAction.pagesForFilterEvents, {page}))
  }
}
