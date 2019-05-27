/* eslint-disable react/jsx-no-target-blank */
import './style.styl'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { Link, browserHistory } from 'react-router'
import { Table, Button, Popconfirm, Badge, Popover, Tooltip, Modal } from 'antd'
import Icon from '../Common/sugo-icon'
import Bread from '../Common/bread'
import Loading from '../../components/Common/loading'
import { CreateProject } from './create-project'
import { Authorization } from './authorization'
import { SupervisorSettingModal } from './supervisor-setting-modal'
import { ShowConfigModal } from './show-config-modal'
import { ProjectStatus, ProjectState, AccessDataType } from '../../../common/constants'
import { EditableCell } from '../Common/editable-table'
import { catchMessage } from './store/message/catch-message'
import { checkPermission, Auth } from '../../common/permission-control'
import createStore from './store'
import ChildProjectModal from './create-child-project'
import classnames from 'classnames'
import helpLinkMap from 'common/help-link-map'
import Search from '../Common/search'
import AssociateUserTable from './associate-user-table'
import SdkReportSet from './sdk-report-set'
import TagSettingModal from './tag-setting-modal'
import DropOption from '../Common/DropOption'

const canCreateProject = checkPermission('get:/console/project/create')
const canCreateChildProject = checkPermission('post:/app/project/create-child')
const canViewProject = checkPermission('get:/console/project/:id')
const canToggleVisibility = checkPermission('post:/app/project/toggle-visibility/:project_id')
const canToggleDataInput = checkPermission('post:/app/project/toggle-data-input/:project_id')
const canEditProjectName = checkPermission('post:/app/project/update-project-name')

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/project']

const datasourceSettingPath = '/console/project/datasource-settings'
const hasDataSettingMenu = _.some(window.sugo.menus, m => {
  return _.some(m.children, c => c.path === datasourceSettingPath)
})

const typeNameDict = {
  [AccessDataType.File]: '文件接入',
  [AccessDataType.Log]: '日志接入',
  [AccessDataType.SDK]: 'SDK',
  [AccessDataType.Tag]: '标签接入',
  [AccessDataType.MySQL]: 'MySQL 表查询'
}

// ## 添加消息捕获
// 1. 使用装饰器
// 2. 见 componentWillReceiveProps
@catchMessage
class Main extends React.Component {

  constructor(props, context) {
    super(props, context)
    const store = this.store = createStore()

    store.subscribe(() => {
      let newState = create_state(store)
      let cp = this.state.childProject
      if (cp) {
        newState.childProject = newState.project.find(p => p.id === cp.id) || null
      }
      this.setState(newState)
    })

    this.state = create_state(store)

    function create_state(store) {
      const state = store.getState()
      return _.assign({}, state.Message, state.Project, {
        childProject: null,
        search: ''
      })
    }
  }

  componentDidMount() {
    this.store.actions.Project.getProject()
    this.store.actions.Project.findAllUseTables()
    this.store.actions.Project.getSdkGlobalConfig()
    this.store.actions.Project.getUserGroups()
  }

  // ## 添加消息捕获
  // 2. 外部更新时清洗掉以前的消息
  UNSAFE_componentWillReceiveProps() {
    // 清洗掉 message
    return this.store.actions.Message.clean()
  }

  createDeleteBehavior(id) {
    return () => this.store.actions.Project.deleteProject(id)
  }

  createHideBehavior(id, ds_id, ds_name, from_ds) {
    return () => this.store.actions.Project.hideProject(id, ds_id, ds_name, from_ds)
  }

  createShowBehavior(id, ds_id, ds_name, from_ds) {
    return () => this.store.actions.Project.showProject(id, ds_id, ds_name, from_ds)
  }

  createDisableBehavior(id) {
    return () => this.store.actions.Project.disableProject(id)
  }

  createActivateBehavior(id) {
    return () => this.store.actions.Project.activateProject(id)
  }

  createAuthorizationBehavior(project) {
    return () => this.store.actions.Project.openAuthorizationModal(project)
  }

  onFinishEditProjectName = async (title, record) => {
    const prev = record.name
    if (title === prev) return this
    this.store.actions.Project.update({ id: record.id, name: title })
  }

  createSettingBehavior(p) {
    this.store.actions.Project.openProjectSettingModal(p)
  }

  showUindexSpec(p) {
    this.store.actions.Project.openProjectCheckModal(p)
  }

  openChildProjModal = () => {
    this.childProjectModal.show()
  }

  openNewChildProjectModal = () => {
    this.setState({
      childProject: null
    }, this.openChildProjModal)
  }

  renderChildNewButton = () => {
    return canCreateChildProject
      ? (
        <Button
          type="primary"
          icon="plus"
          className="mg1l iblock"
          onClick={this.openNewChildProjectModal}
        >新建子项目</Button>
      )
      : null
  }

  showSdkReportSet = (project) => {
    const { sdkGlobalConfig } = this.state
    if (project) {
      const { sdk_ban_report, sdk_position_config, sdk_submit_click_point } = _.get(project, 'extra_params', {})
      this.setState({ displaySdkReportSet: true, sdkReportSetData: { sdk_ban_report, sdk_position_config, sdk_submit_click_point }, selectProject: project })
    } else {
      this.setState({ displaySdkReportSet: true, sdkReportSetData: sdkGlobalConfig, selectProject: {} })
    }
  }

  hideSdkReportSet = () => {
    this.setState({ displaySdkReportSet: false })
  }


  showTagSet = (project) => {
    this.setState({ displayTagSet: true , selectProject: project})
  }

  hideTagSet = () => {
    this.setState({ displayTagSet: false })
  }

  renderSdkGlobalConfigButton() {
    if (!window.sugo.enableSdkDecideGlobalConfig) {
      return null
    }
    return (
      <Button
        type="primary"
        className="mg1r iblock"
        onClick={() => this.showSdkReportSet()}
      >SDK采集设置</Button>
    )
  }

  renderSdkReportSet = () => {
    const { displaySdkReportSet, selectProject, sdkReportSetData } = this.state
    const actions = this.store.actions.Project
    return (
      <SdkReportSet
        displaySdkReportSet={displaySdkReportSet}
        showSdkReportSet={this.showSdkReportSet}
        hideSdkReportSet={this.hideSdkReportSet}
        project={selectProject}
        data={sdkReportSetData}
        saveProjectConfig={actions.update}
        saveGlobalConfig={actions.setSdkGlobalConfig}
      />
    )
  }

  update = async (obj) => {
    const actions = this.store.actions.Project
    await actions.update(obj)
    await actions.getUserGroups()
  }

  renderTagSet = () => {
    const { displayTagSet, selectProject={}, project, userGroups } = this.state
    // const actions = this.store.actions.Project
    return (
      <TagSettingModal
        displayTagSet={displayTagSet}
        hideTagSet={this.hideTagSet}
        projectList={project}
        project={selectProject}
        saveProject={this.update}
        userGroups={userGroups}
      />
    )
  }

  openEditChildProj = id => {
    return () => {
      const { project: projects, dataSources } = this.state
      let childProject = _.find(projects, { id }) || {}
      let ds = _.find(dataSources, { id: childProject.datasource_id })
      childProject.filter = childProject.filter || ds.filter
      this.setState({
        childProject
      }, this.openChildProjModal)
    }
  }

  //编辑子项目专用的ui
  editChildProjCell = record => {
    const { name, id } = record
    return (
      <span>
        {name}
        <Icon
          type="sugo-edit"
          className="mg1l mg1t font12 color-grey pointer fright mg1r"
          onClick={this.openEditChildProj(id)}
        />
      </span>
    )
  }

  renderDelProject = (proj) => {
    let { type = 'user-created', id, name } = proj
    if (type === 'built-in') return null
    return (
      <Auth auth="/app/project/delete/:project_id">
        <Popconfirm
          placement="left"
          title={(
            <div>
              <p>{`确定删除项目【${name}】吗？`}</p>
              <p className="color-red">
                注意：与项目关联的维表、指标、维度、单图、分群、留存和漏斗都会被删除
              </p>
            </div>
          )}
          onConfirm={this.createDeleteBehavior(id)}
        >
          <Icon
            type="sugo-trash"
            className="color-grey font14 pointer hover-color-red mg1l"
          />
        </Popconfirm>
      </Auth>
    )
  }

  renderSetProjectConfig = (proj) => {
    switch (proj.access_type) {

      case AccessDataType.MySQL:
      return null;

      case AccessDataType.Tag:
      return (
        <Auth auth="post:/app/project/update-supervisor">
          <Tooltip title="查看配置">
            <Icon
              type="setting"
              className="color-grey font14 pointer hover-color-red mg1l"
              onClick={() => this.showUindexSpec(proj)}
            />
          </Tooltip>
        </Auth>
      );

      default: 
      return (
        <Auth auth="post:/app/project/update-supervisor">
          <Tooltip title="配置supversior">
            <Icon
              type="setting"
              className="color-grey font14 pointer hover-color-red mg1l"
              onClick={() => this.createSettingBehavior(proj)}
            />
          </Tooltip>
        </Auth>
      )
    }
  }

  /**
   * `Table.dataSource`
   * @see {Project}
   * @return {*[]}
   */
  createTableColumns() {
    const { project, realUserTables, dataSources, uindexLoadStatus } = this.state
    const Actions = this.store.actions.Project
    const UserTableMap = _.keyBy(realUserTables, r => r.id)

    const dataSourcesIdDict = _.keyBy(dataSources, dbDs => dbDs.id)
    return [{
      title: '可见状态',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status > b.status ? 1 : -1,
      render: (status, proj) => {

        let {
          id,
          name,
          datasource_id,
          datasource_name,
          from_datasource
        } = proj
        const show = status === ProjectStatus.Show
        let icon = (
          <Tooltip
            title={
              !canToggleVisibility
                ? '你没有权限切换项目的可见性'
                : show ? '点击隐藏这个项目' : '点击取消隐藏项目'
            }
          >
            <Icon
              type={show ? 'sugo-visible' : 'sugo-invisible'}
              className={
                classnames(
                  'font18',
                  show ? 'color-purple' : 'color-grey',
                  canViewProject
                    ? 'pointer'
                    : ''
                )
              }
            />
          </Tooltip>
        )
        if (!canToggleVisibility) {
          return icon
        }

        return (
          <Popconfirm
            title={<p>{`${show ? '隐藏' : '显示'}【${name}】`}</p>}
            placement="left"
            onConfirm={
              show
                ? this.createHideBehavior(
                  id, datasource_id, datasource_name, from_datasource
                )
                : this.createShowBehavior(
                  id, datasource_id, datasource_name, from_datasource
                )
            }
          >
            {icon}
          </Popconfirm>
        )
      }
    }, {
      title: '项目名称',
      dataIndex: 'name',
      align: 'left',
      key: 'name',
      sorter: (a, b) => a.name > b.name ? 1 : -1,
      render: (name, record) => {
        if (record.parent_id) {
          return this.editChildProjCell(record)
        }
        if (!canEditProjectName) {
          return name
        }
        return (
          <EditableCell
            showEditIcon
            editable
            value={name}
            limit={50}
            field={record}
            onChange={this.onFinishEditProjectName}
          />
        )
      }
    }, {
      title: '项目ID',
      align: 'left',
      dataIndex: 'datasource_id',
      key: 'datasource_id',
      sorter: (a, b) => a.datasource_name > b.datasource_name ? 1 : -1,
      render: (dsId, proj) => {
        const dbDs = dataSourcesIdDict[dsId]
        const text = dbDs && dbDs.name || proj.datasource_name
        const { access_type } = proj
        const isTagProject = access_type === AccessDataType.Tag
        let status = 'default'
        let title = '数据未加载'
        if (isTagProject) { // uindex项目增加数据加载完成进度显示
          status = 'success'
          title = '数据已加载完成'
          const process = uindexLoadStatus[text] || 0
          if (process < 100) {
            status = process === 0 ? 'default' : 'warning'
            title = process === 0 ? '数据未加载' : `数据已加载${process}%`
          }
        }
        return (
          <span>
            {
              isTagProject ?
                (
                  <Tooltip title={title}>
                    <Badge status={status} style={{marginRight: 3}} />
                  </Tooltip>
                ) : null
            }
            {text}
          </span>
        )
      }
    }, {
      title: '接入方式',
      align: 'left',
      key: 'access_type',
      sorter: (projA, projB) => {
        return projA.access_type - projB.access_type
      },
      render: (ff, proj) => {
        let { id, state, parent_id, name, type, access_type } = proj
        const active = state === ProjectState.Activate
        const showRunButton = canToggleDataInput && !parent_id && type !== 'built-in'
        let typeName = typeNameDict[proj.access_type]
        let sdkTip = null
        if (proj.access_type === AccessDataType.SDK) {
          let extra_params = _.get(proj, 'extra_params', {})
          extra_params = _.isEmpty(extra_params) ? this.state.sdkGlobalConfig : extra_params

          sdkTip = !_.isEmpty(extra_params)
            ? (
              <Popover
                content={<div>
                  <div>采集数据：{_.get(extra_params, 'sdk_ban_report', '1') === '0' ? '禁用' : '启用'}</div>
                  <div>采集地理位置间隔时间：{_.get(extra_params, 'sdk_position_config', '').toString() === '0' ? '不采集' : `${extra_params.sdk_position_config}分钟`}</div>
                </div>}
                trigger="hover"
              >
                <Icon type="exclamation-circle" className="color-grey mg1l" />
              </Popover>
            )
            : null
        }

        if (proj.access_type === AccessDataType.MySQL || proj.access_type === AccessDataType.Tag) {
          // MySQL 项目不能启动/暂停
          return (
            <div className="relative">
              <span className="iblock">{typeName}</span>
            </div>
          )
        }
        return (
          <div className="relative">
            <span className="iblock width50">{typeName}{sdkTip}</span>
            {showRunButton
              ? (
                <Popconfirm
                  title={(
                    <div>
                      <p>{active ? '暂停' : '运行'}【{name}】</p>
                      {active ?
                        <p className="color-red">注意：暂停禁用后，将不可再上报数据</p> : null}
                      {!active ?
                        <p className="color-red">运行项目后，可上报数据到该项目</p> : null}
                    </div>
                  )}
                  onConfirm={
                    active
                      ? this.createDisableBehavior(id)
                      : this.createActivateBehavior(id)
                  }
                >
                  <span className="inline width60 alignleft">
                    <span
                      className={
                        classnames(
                          'mg1l iblock',
                          active ? 'color-green' : 'color-grey',
                        )
                      }
                    >
                      {active ? '采集中' : '已暂停'}
                    </span>
                    <Tooltip
                      title={active ? '暂停项目数据接入' : '恢复项目数据接入'}
                    >
                      <Icon
                        type={
                          active ? 'sugo-pause' : 'sugo-play'
                        }
                        className="color-grey pointer font14 mg1r iblock proj-control-icon hover-color-main"
                      />
                    </Tooltip>
                  </span>
                </Popconfirm>
              )
              : (
                <span
                  className={
                    classnames(
                      'inline width60 alignleft',
                      active ? 'color-green' : 'color-grey',
                    )
                  }
                >
                  <span className="iblock mg1l">{active ? '采集中' : '已暂停'}</span>
                </span>
              )
            }
          </div>
        )
      }
    }, {
      title: '父项目',
      dataIndex: 'parent_id',
      key: 'parent_id',
      sorter: (a, b) => a.parent_id > b.parent_id ? 1 : -1,
      render: (id, rec) => {
        if (rec.parentName) return rec.parentName
        let proj = _.find(project, { id }) || { name: '无' }
        return proj.name
      }
    }, {
      title: (
        <div>
          <Tooltip
            placement="top"
            title="用户库用于为每个项目存储登录用户的信息.若多个项目共用同一套用户系统,只需创建并使用同一个用户库即可."
          >
            <Icon type="question-circle-o" />
          </Tooltip>
          <span className="pd1l">用户库</span>
        </div>
      ),
      dataIndex: 'id',
      key: 'user_table',
      render: (r, v) => {
        const table = UserTableMap[v.real_user_table]
        return table ? (
          <div>
            <span className="iblock elli mg1r mw100">{table.name}</span>
            <Icon
              type="sugo-edit"
              className="color-grey pointer mg1r iblock hover-color-main font14 proj-control-icon"
              onClick={() => Actions.visibleUserTableModal(true, v)}
            />
          </div>
        ) : (
          <Tooltip title="添加用户库">
            <Icon
              type="sugo-add"
              className="color-grey pointer mg1r iblock hover-color-main font20"
              onClick={() => Actions.visibleUserTableModal(true, v)}
            />
          </Tooltip>
        )
      }
    }, {
      title: '数据管理',
      dataIndex: 'id',
      key: 'manage',
      render: (id, obj) => {
        let paths = [
          {
            click: () => browserHistory.push(`/console/project/${id}`),
            path: 'get:/console/project/:id',
            label: '数据接入'
          },
          {
            click: () => browserHistory.push(`/console/dimension?id=${obj.datasource_id}`),
            path: 'get:/console/dimension',
            label: '维度管理'
          },
          obj.access_type === AccessDataType.Tag ? {
            // real: `/console/dimension?id=${obj.datasource_id}&datasource_type=tag`,
            click: () => browserHistory.push(`/console/tag-system-manager?id=${obj.datasource_id}&datasource_type=tag`),
            path: '/console/dimension', label: '标签体系管理'
          } : null,
          {
            click: () => browserHistory.push(`/console/measure?id=${obj.datasource_id}`),
            path: 'get:/console/measure',
            label: '指标管理'
          },
          hasDataSettingMenu ? {
            click: () => browserHistory.push(`/console/project/datasource-settings?id=${obj.datasource_id}`),
            path: 'get:/console/project/datasource-settings',
            label: '场景数据设置'
          } : null,
          obj.access_type === AccessDataType.SDK ? {
            click: () => {
              this.showSdkReportSet(obj)
            },
            path: 'post:/app/project/update',
            label: 'SDK采集设置'
          } : null,
          obj.access_type !== AccessDataType.Tag ? {
            click: () => {
              this.showTagSet(obj)
            },
            path: 'post:/app/project/update',
            label: '关联标签项目设置'
          } : null
        ].filter(p => p && checkPermission(p.path) && !(obj.parent_id && p.label === '数据接入'))
        //** 通常由扩展包决定 开启项目列表 => 数据接入菜单
        if (window.sugo.enableProjectAccessMenu === false) {
          paths = paths.filter(p => p.label !== '数据接入')
        }
        return <DropOption menuOptions={paths} />
      }
    }, {
      title: '设置操作',
      dataIndex: 'id',
      key: 'control',
      render: (id) => {
        const p = _.find(project, { id })
        return (
          <div>
            <Auth auth="post:/app/project/permission-grant">
              <Tooltip
                title="授权设置"
              >
                <Icon
                  type="sugo-security"
                  className="color-grey font14 pointer hover-color-main"
                  onClick={this.createAuthorizationBehavior(p)}
                />
              </Tooltip>
            </Auth>
            {this.renderDelProject(p)}
            {this.renderSetProjectConfig(p)}
          </div>
        )
      }
    }]
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }


  render() {
    let {
      project,
      createProjectModalVisible,
      dataSources,
      roles,
      updatingDataSources,
      authorizationModalVisible,
      authorizeDataSources,
      authorizeChildProjectId,
      page,
      isLoading,

      visibleUserTableModal,
      realUserTables,
      userTableAssociateProject,

      childProject,
      search,

      settingModalVisible,
      showConfigModalVisible,
      querySupervisorstatus,
      settingDataSources,
      localSupervisorConfig,
      originSupervisorConfig
    } = this.state
    const actions = this.store.actions.Project
    const columns = this.createTableColumns()
    const authorizeDataSourcesOriginal = dataSources.find(ds => {
      return ds.id === authorizeDataSources
        && (authorizeChildProjectId ? ds.child_project_id === authorizeChildProjectId : _.isNil(ds.child_project_id))
    })
    project = search
      ? project.filter(m => {
        return _.includes((m.name + ' ' + m.datasource_name).toLowerCase(), search.trim().toLowerCase())
      })
      : project
    let help = (
      <div className="width300">
        <p>项目管理提供了强大而全面的管理功能，您可以根据您
          的具体需求来对您的组织和数据进行管理。让您的成员
          轻松的协作，并且充分保障数据的安全性和私密性。</p>
        <p>
          <a
            href={helpLink}
            target="_blank"
            className="pointer"
          >
            <Icon type="export" /> 查看帮助文档
          </a>
        </p>
      </div>
    )
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <a
          href={helpLink}
          target="_blank"
          className="color-grey pointer"
        >
          <Icon type="question-circle" />
        </a>
      </Popover>
    )
    // let dataSourceKey = _.keyBy(dataSources, 'id')
    let projs = project.filter(p => !p.parent_id)

    const pagination = {
      total: project.length,
      showSizeChanger: true,
      defaultPageSize: 10
    }

    return (
      <div className="sugo-project height-100 bg-white">
        {userTableAssociateProject
          ? (
            <Modal
              title={(
                <div>
                  <Tooltip
                    placement="top"
                    title="用户库用于为每个项目存储登录用户的信息.若多个项目共用同一套用户系统,只需创建并使用同一个用户库即可."
                  >
                    <Icon type="question-circle-o" />
                  </Tooltip>
                  <span className="pd1l">添加用户库</span>
                </div>
              )}
              footer={null}
              onCancel={() => actions.visibleUserTableModal(false, null)}
              visible={visibleUserTableModal}
            >
              <AssociateUserTable
                store={this.store}
                tables={realUserTables}
                project={userTableAssociateProject}
                onApply={(project, userTable) => actions.associateProject(project, userTable)}
              />
            </Modal>
          )
          : null
        }
        <ChildProjectModal
          createChildProject={actions.createChildProject}
          updateProject={actions.update}
          doRef={ref => this.childProjectModal = ref}
          projects={projs}
          project={childProject}
        />
        <Loading isLoading={isLoading} className="height-100">
          <Bread
            path={[{ name: '项目管理' }]}
            extra={extra}
          />
          {createProjectModalVisible
            ? (
              <CreateProject
                {...actions}
                visible={createProjectModalVisible}
              />
            )
            : null
          }
          {authorizationModalVisible
            ? (
              <Authorization
                dataSources={authorizeDataSourcesOriginal}
                roles={roles}
                hideModal={actions.closeAuthorizationModal}
                visible={!!(authorizationModalVisible && authorizeDataSourcesOriginal)}
                loading={updatingDataSources}
                editDataSources={actions.editProjectRoles}
                updateStoreDataSources={actions.updateStoreDataSources}
              />
            )
            : null
          }
          {
            settingModalVisible &&
            <SupervisorSettingModal
              loading={querySupervisorstatus}
              settingDataSources={settingDataSources}
              getSuperVisorConfig={actions.getSuperVisorConfig}
              visible={settingModalVisible}
              updateSupervisor={actions.updateSupervisor}
              hideModal={actions.closeProjectSettingModal}
              localSupervisorConfig={localSupervisorConfig}
              originSupervisorConfig={originSupervisorConfig}
            />
          }
          {
            showConfigModalVisible &&
            <ShowConfigModal 
              visible={showConfigModalVisible}
              hideModal={actions.closeProjectCheckModal}
              settingDataSources={settingDataSources}
              getUindexConfig={actions.getUindexConfig}
              localSupervisorConfig={localSupervisorConfig}
            />
          }
          <div
            className="scroll-content always-display-scrollbar"
            style={{
              height: 'calc(100% - 44px)'
            }}
          >
            <div className="pd2y pd3x">
              <div className="pd2b fix">
                <div className="fleft">
                  <div className="width260 iblock">
                    <Search
                      onChange={this.onChange}
                      value={search}
                      placeholder="搜索"
                      className="iblock"
                    />
                  </div>
                </div>
                <div className="fright">
                  {this.renderSdkGlobalConfigButton()}
                  {
                    canCreateProject
                      ? (
                        <Link to="/console/project/create">
                          <Button
                            type="primary"
                            icon="plus"
                            className="iblock"
                          >
                            新建项目
                          </Button>
                        </Link>
                      )
                      : null
                  }
                  {this.renderChildNewButton()}
                  {/*this.renderRealUserTableCreator()*/}
                </div>
              </div>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={project}
                bordered
                pagination={{
                  current: page,
                  onChange: (page) => actions.setPage(page),
                  showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
                  ...pagination
                }}
              />
            </div>
          </div>
        </Loading>
        {this.renderSdkReportSet()}
        {this.renderTagSet()}
      </div>
    )
  }
}

export default connect()(Main)
