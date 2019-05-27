/**
 * @file WebSDK编辑
 * 应用版本号管理
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { Button, Input, Row, Col, Modal, Table, message, Select, Icon, Tabs } from 'antd'
import { EditableCell } from '../../../Common/editable-table'
import CopyEvent from './copy-event'

import { APP_VERSION_STATUS, AccessDataOriginalType } from '../../constants'
import { WEB_EDITOR_VIEW_STATE, TRACK_EVENT_TYPE_MAP } from './store/constants'
import DropOption from '../../../Common/DropOption'
import ProjectDataImport from './project-data-import'
import Store from './store'

const TabPane = Tabs.TabPane
const Option = Select.Option
const Search = Input.Search

export default class Main extends Component {
  static propTypes = {
    project: PropTypes.object.isRequired,
    analysis: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    // 可视化埋点entry
    entry: PropTypes.string.isRequired,
    children: PropTypes.element
  }

  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {WebSDKAccessorState} */
    this.state = this.store.getState()
  }

  componentWillMount () {
    const { project, analysis } = this.props
    this.store.init(project, analysis, true)
  }

  /**
   * @param nextProps
   * @param {WebSDKAccessorState} nextState
   */
  componentWillUpdate (nextProps, nextState) {
    const msg = nextState.vm.message
    if (msg) {
      message[msg.type](msg.message)
      this.store.clearMessage()
    }
  }

  /**
   * 渲染上方操作区域
   * @return {XML}
   */
  renderOperate () {
    const { DataAnalysis } = this.state
    const { ModalVisible, appVersion } = this.state.vm

    const store = this.store
    const IS_WEB_SDK = DataAnalysis.access_type === AccessDataOriginalType.Web

    return (
      <div className="mg2t pd2y bordert dashed">
        <Modal
          title="新增版本"
          visible={ModalVisible === 'visibleAppVersionCreatorModal'}
          onOk={() => {
            store.createAppVersion()
            store.setCreateAppVersionModal(false)
          }}
          onCancel={() => store.setCreateAppVersionModal(false)}
        >
          <div className="width300">
            <span className="pd1r">应用版本号：</span>
            <Input
              className="width200"
              value={appVersion}
              onChange={e => store.setAppVersion(e.target.value.trim())}
            />
          </div>
        </Modal>
        <Modal
          title="导入版本"
          visible={ModalVisible === 'batchImport'}
          onOk={() => {
            store.createAppVersion()
            store.setCreateAppVersionModal('projectDataImport')
            store.setUploadVersion(appVersion)
            store.setUploadedFilename({
              isUploaded: false,
              filename: '无'
            })
          }}
          onCancel={() => store.setCreateAppVersionModal(false)}
        >
          <div className="width300">
            <span className="pd1r">应用版本号：</span>
            <Input
              className="width200"
              value={appVersion}
              onChange={e => store.setAppVersion(e.target.value.trim())}
            />
          </div>
        </Modal>
        {
          ModalVisible 
          ?    
          <ProjectDataImport 
            visible={ModalVisible} 
            store={store}
            state={this.state}
          />
          :
          null
        }
        <Row gutter={16}>
          <Col span={12}>
            <Input
              onChange={(e) => store.filterAppVersion(e.target.value.trim())}
              placeholder="请输入版本号"
            />
          </Col>
          <Col span={12}>
          <div className="fright mg1l">
          {
            IS_WEB_SDK ? null : (
              <Button
                size="small"
                type="primary"
                icon="plus"
                onClick={() => store.setCreateAppVersionModal('batchImport')}
              >导入版本</Button>
            )
          }
        </div>
            <div className="fright">
              {
                IS_WEB_SDK ? null : (
                  <Button
                    size="small"
                    type="primary"
                    icon="plus"
                    onClick={() => store.setCreateAppVersionModal('visibleAppVersionCreatorModal')}
                  >新增版本</Button>
                )
              }
            </div>
          </Col>
        </Row>
      </div>
    )
  }

  /**
   * 渲染AppVersion Table
   * @return {XML}
   */
  renderDataTable () {
    const { DataAnalysis } = this.state
    const { visibleAppVersionModels } = this.state.vm
    const { store, renderButtonList } = this

    const columns = [
      {
        title: '应用版本号',
        dataIndex: 'app_version',
        key: 'app_version',
        render(text, record){
          return record.deploy_events_count > 0
            ? text
            : (
              <EditableCell
                value={text}
                onChange={(value) => store.updateAppVersion(value, record.id)}
              />
            )
        }
      },
      {
        title: '版本状态',
        dataIndex: 'status',
        key: 'status',
        render: text => {
          const active = text === APP_VERSION_STATUS.Active
          return (
            <div>
              <span className={`mg1r ${active ? 'icon-active' : 'icon-normal'}`}/>
              <span>{active ? '已启用' : '未启用' }</span>
            </div>
          )
        }
      },
      {
        title: '事件埋点数',
        dataIndex: 'deploy_events_count',
        key: 'deploy_events_count',
        render: (v, record) => {
          v = v || 0
          return (
            <div>
              <span className="pd1r">已部署{v}个事件,</span>
              {
                // <span className="pd1r">未部署{record.draft_event_count || 0}个事件</span>
              }
              <span
                className="pointer"
                onClick={() => this.store.listAppVersionEvents(record)}
              >事件列表</span>
            </div>
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render(text, record, index) {
          return (
            <div className="pd1">
              {
                renderButtonList({store, record, text})
              }
            </div>
          )
        }
      }
    ]

    return (
      <div className="pd2t">
        <Table
          bordered
          rowKey="id"
          size="small"
          dataSource={visibleAppVersionModels}
          columns={columns}
        />
      </div>
    )
  }

  renderButtonList({store, record, text}) {
    const paths = _.compact([
      record.deploy_events_count 
      ? {
        click: () => store.openCopyEventsModal(record.id),
        label: '复制埋点'
      }
      : null
      ,
      {
        click: () => store.deployAppEvents(record.app_version),
        label: '部署埋点'
      },
      record.deploy_events_count
      ? {
        click: () => store.downloadEvents(record.id),
         label: '导出埋点'
      } 
      : null
      ,
      {
        click: () => {
          store.setCreateAppVersionModal('projectDataImport')
          store.setUploadVersion(record.app_version)
          store.setUploadedFilename({
            isUploaded: false,
            filename: '无'
          })
        },
        label: '导入版本'
      },
      record.deploy_events_count
      ? {
        click: () => store.batchExport(record.id),
         label: '批量导出'
      } 
      : null
      ,
      {
        click: () => store.toggleAppVersionStatus(text),
        label: `${record.status === APP_VERSION_STATUS.Disable ? '启用' : '禁用'}`
      }
    ])
    return <DropOption menuOptions={paths} />
  }

  renderEditor () {
    const { copyEventsComponentProps } = this.state.vm
    const { title, entry } = this.props

    return (
      <div className="pd2">
        {
          copyEventsComponentProps
            ? (<CopyEvent {...copyEventsComponentProps}/>)
            : null
        }
        <Row gutter={16}>
          <Col span={12}>
            <strong className="font18">{title}</strong>
          </Col>
          <Col span={12}>
            <div className="alignright">
              <Link to={entry}>
                <Button
                  size="small"
                  type="primary"
                  className="mg2r"
                >可视化埋点</Button>
              </Link>
              <Button
                type="primary"
                size="small"
                onClick={() => this.store.setViewState(WEB_EDITOR_VIEW_STATE.DOCS)}
              >接入说明</Button>
            </div>
          </Col>
        </Row>
        {this.renderOperate()}
        {this.renderDataTable()}
      </div>
    )
  }

  renderDocs () {
    return (
      <div className="pd2">
        <div className="pd2b">
          <Button
            size="small"
            type="primary"
            onClick={() => this.store.setViewState(WEB_EDITOR_VIEW_STATE.EDITOR)}
          >返回编辑</Button>
        </div>
        {this.props.children}
      </div>
    )
  }

  /**
   * 渲染事件列表
   */
  renderEventsTable () {
    const { title } = this.props
    return (
      <div className="pd2">
        <div className="pd2">
          <Row gutter={16}>
            <Col span={12}>
              <strong className="font18">
                {`${title}/事件列表`}
              </strong>
            </Col>
            <Col span={12}>
              <div className="alignright">
                <Button
                  type="primary"
                  size="small"
                  onClick={() => this.store.setViewState(WEB_EDITOR_VIEW_STATE.EDITOR)}
                >返回</Button>
              </div>
            </Col>
          </Row>
        </div>
          <Tabs>
            <TabPane tab="事件列表" key="tabEventList">
              {this.renderEventList()}
            </TabPane>
            <TabPane tab="页面列表" key="tabPageList">
              {this.renderPageList()}
            </TabPane>
            <TabPane tab="分类列表" key="tabCategoryList">
              {this.renderCategories()}
            </TabPane>
          </Tabs>
      </div>
    )
  }

  renderEventList () {
    const { vm } = this.state
    const total = vm.appEvents.totalCount ? parseInt(vm.appEvents.totalCount) : 0
    const columns = [
      {
        title: '事件名称',
        dataIndex: 'event_name',
        width: '30%',
        key: 'event_name',
        render(v) {
          return (
            <div
              className="elli width-100"
              style={{ whiteSpace: 'normal' }}
            >{v}</div>
          )
        }
      },
      {
        title: '事件类型',
        dataIndex: 'event_type',
        key: 'event_type',
        width: '10%',
        render(v) {
          return TRACK_EVENT_TYPE_MAP[v] || TRACK_EVENT_TYPE_MAP.undef
        }
      },
      {
        title: '匹配页面',
        dataIndex: 'page',
        width: '30%',
        key: 'page',
        render(v) {
          return (
            <div
              className="elli width-100"
              style={{ whiteSpace: 'normal' }}
            >{v}</div>
          )
        }
      },{
        title: '页面名称',
        dataIndex: 'page_name',
        width: '10%',
        key: 'page_name',
        render: v => v ? v : '系统自动获取'
      },
      {
        title: '事件状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appEventsFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return <div>
      <div className="mg2t pd2y bordert dashed">
        <Row gutter={16}>
          <Col span={18}>
            <Select
              allowClear
              showSearch
              placeholder="匹配页面"
              className="width220 mg2r"
              onSearch={name => {
                this.store.getAppEventPages(name)
              }}
              value={vm.appEventsFilter.page || void 0}
              onChange={page => this.store.filterEvents({ page, pageIndex: 1 })}
            >
              {
                vm.appEventPages.map(page => (
                  <Option
                    value={page.page}
                    key={page.page}
                  >
                    {page.page_name || page.page}
                  </Option>
                ))
              }
            </Select>
            <Select
              className="width120"
              placeholder="事件状态"
              value={vm.appEventsFilter.state || void 0}
              onChange={state => this.store.filterEvents({ state, pageIndex: 1 })}
            >
              {
                vm.appEventState.map(state => (
                  <Option
                    value={state.value}
                    key={state.value}
                  >
                    {state.name}
                  </Option>
                ))
              }
            </Select>
          </Col>
          <Col span={6}>
            <div className="alignright">
              <Search
                className="width240"
                placeholder="请输入事件名称进行搜索"
                type="text"
                onSearch={value => {
                  if(value !== (vm.appEventsFilter.name || '')) {
                  this.store.filterEvents({ name: value, pageIndex: 1  })
                }
              }
            }
              />
            </div>
          </Col>
        </Row>
      </div>
      <div className="pd1t">
        <Icon type="question-circle-o" />
        <span className="pd1l">
          如果事件属性发生了变化，即使该事件已经部署，也会出现在未部署列表。
        </span>
      </div>
      <div className="pd2t">
        <Table
          bordered
          rowKey="id"
          columns={columns}
          dataSource={vm.appEvents.data}
          pagination={{
            current: vm.appEventsFilter.pageIndex || 1,
            total: total,
            defaultPageSize: 20,
            onChange: (current) => {
              this.store.filterEvents({ pageIndex: current })
            }
          }}
        />
      </div>
    </div>
  }

  renderPageList= () => {
    const { vm } = this.state
    const total = vm.appPages.totalCount ? parseInt(vm.appPages.totalCount) : 0
    const columns = [
      {
        title: '页面名称',
        dataIndex: 'page_name',
        width: '30%',
        key: 'page_name',
        render: v => v ? v : '系统自动获取'
      },
      {
        title: '页面路径',
        dataIndex: 'page',
        key: 'page',
        width: '60%'
      },
      {
        title: '页面状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appPagesFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return <div>
      <div className="mg2t pd2y bordert dashed">
        <Row gutter={16}>
          <Col span={18}>
            <Select
              className="width120"
              placeholder="页面状态"
              value={vm.appPagesFilter.state || void 0}
              onChange={state => this.store.filterPages({ state, pageIndex: 1  })}
            >
              {
                vm.appEventState.map(state => (
                  <Option
                    value={state.value}
                    key={state.value}
                  >
                    {state.name}
                  </Option>
                ))
              }
            </Select>
          </Col>
          <Col span={6}>
            <div className="alignright">
              <Search
                className="width240"
                placeholder="请输入页面名称进行搜索"
                type="text"
                onSearch={value => {
                  if(value !== (vm.appPagesFilter.name||'')) {
                    this.store.filterPages({ name: value, pageIndex: 1  })
                  }
                }}
              />
            </div>
          </Col>
        </Row>
      </div>
      <div className="pd1t">
        <Icon type="question-circle-o" />
        <span className="pd1l">
          如果页面属性发生了变化，即使该页面已经部署，也会出现在未部署列表。
          </span>
      </div>
      <div className="pd2t">
        <Table
          bordered
          rowKey="id"
          columns={columns}
          dataSource={vm.appPages.data}
          pagination={{
            current: vm.appPagesFilter.pageIndex || 1,
            total: total,
            defaultPageSize: 20,
            onChange: (current) => {
              this.store.filterPages({ pageIndex: current })
            }
          }}
        />
      </div>
    </div>
  }

  renderCategories() {
    const { vm } = this.state
    const total = vm.appCategories.totalCount ? parseInt(vm.appCategories.totalCount) : 0
    const columns = [
      {
        title: '分类名称',
        dataIndex: 'name',
        width: '30%',
        key: 'name',
        render(v) {
          return (
            <div
              className="elli width-100"
              style={{ whiteSpace: 'normal' }}
            >{v}</div>
          )
        }
      },
      {
        title: '匹配规则',
        dataIndex: 'regulation',
        key: 'regulation',
        width: '60%'
      },
      {
        title: '页面状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appCategoriesFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return <div>
      <div className="mg2t pd2y bordert dashed">
        <Row gutter={16}>
          <Col span={18}>
            <Select
              className="width120"
              placeholder="页面状态"
              value={vm.appCategoriesFilter.state || void 0}
              onChange={state => this.store.filterCategories({ state, pageIndex: 1 })}
            >
              {
                vm.appEventState.map(state => (
                  <Option
                    value={state.value}
                    key={state.value}
                  >
                    {state.name}
                  </Option>
                ))
              }
            </Select>
          </Col>
          <Col span={6}>
            <div className="alignright">
              <Search
                className="width240"
                placeholder="请输入分类名称进行搜索"
                type="text"
                onSearch={value => {
                  if(value !== (vm.appCategoriesFilter.name|| '')) {
                    this.store.filterCategories({ name: value, pageIndex: 1 })}
                  }
                } 
              />
            </div>
          </Col>
        </Row>
      </div>
      <div className="pd2t">
        <Table
          bordered
          rowKey="id"
          columns={columns}
          dataSource={vm.appCategories.data}
          pagination={{
            current: vm.appCategoriesFilter.pageIndex || 1,
            total: total,
            defaultPageSize: 20,
            onChange: (current) => {
              this.store.filterCategories({ pageIndex: current })
            }
          }}
        />
      </div>
    </div>
  }

  render () {
    const { view_state } = this.state.vm

    if (view_state === WEB_EDITOR_VIEW_STATE.DOCS) {
      return this.renderDocs()
    }

    if (view_state === WEB_EDITOR_VIEW_STATE.EDITOR) {
      return this.renderEditor()
    }

    if (view_state === WEB_EDITOR_VIEW_STATE.EVENTS_LIST) {
      return this.renderEventsTable()
    }

    return null
  }
}
