import React, { Component } from 'react'
import { Form, Modal, Select, Row, Col, Card, notification, Tooltip, Input, Icon } from 'antd'
import Fetch from '../../../../common/fetch-final'
import setStatePromise from '../../../../common/set-state-promise'
import { Interface } from '../../interface'
import { combineDecorators, validateFieldsAndScroll } from '../../../../common/decorators'
import TrackEventResource from '../../../../models/track-event-draft/resource'

const Option = Select.Option
const createForm = Form.create

@combineDecorators(validateFieldsAndScroll, setStatePromise)
class CopyProjectEvents extends Component {

  static propTypes = {
    current: React.PropTypes.object,
    projects: React.PropTypes.array,
    onCancel: React.PropTypes.func,
    refreshAppVersion: React.PropTypes.func
  }

  constructor (props, context) {
    super(props, context)
  }

  state = {
    dataAccessList: [],
    selectedProjectName: '',
    selectedAnalysisName: '',
    selectedAccessType: null,    // 接入类型
    targetAppVersion: [],
    selectedAppVersion: '',      // 选择的目标appversion
    currentTargetProjectId: -1   // 当前选择的目标项目
  }

  renderTipTitle () {

    const { current } = this.props
    const { selectedProjectName, selectedAnalysisName, selectedAppVersion } = this.state
    const padding = { padding: 14 }

    return (
      <div className="copy-project-events-tips">
        <Row gutter={16}>
          <Col span={12}>
            <div className="aligncenter pd1y">
              <strong>当前项目</strong>
            </div>
            <Card title={current.projectName} bodyStyle={padding}>
              <p>{current.analysisName}</p>
              <p>{current.appVersion}</p>
            </Card>
          </Col>
          <Col span={12}>
            <div className="aligncenter pd1y">
              <strong>目标项目</strong>
            </div>
            <Card title={selectedProjectName} bodyStyle={padding}>
              <p>{selectedAnalysisName}</p>
              <p>{selectedAppVersion || current.appVersion}</p>
            </Card>
          </Col>
        </Row>
        <div className="color-red pd2t">
          *注意：确认后会覆盖目标项目对应分析表的所有事件列表记录
        </div>
      </div>
    )
  }

  onOk = async () => {
    const { selectedAccessType } = this.state
    const { current } = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    if (selectedAccessType !== current.accessType) {
      return this.setFieldError('analysisId', '不同数据接入类型的分析表之间不能做复制操作')
    }

    Modal.confirm({
      title: '确认复制事件',
      iconType: false,
      content: this.renderTipTitle(),
      width: 580,
      onOk: () => {
        return new Promise(async (resolve, reject) => {
          const res = await this.doCopyEvents(values)
          setTimeout(res ? resolve : reject, 500)
        }).catch(() => console.log('copy events errors!'))
      },
      onCancel() {}
    })
  }

  doCopyEvents = async (values) => {
    const { onCancel, current } = this.props

    const source = {
      app_id: current.analysisId,
      app_version: current.appVersion
    }

    const target = {
      app_id: values.analysisId,
      app_version: values.appVersion || current.appVersion
    }
    // 复制事件
    const res = await TrackEventResource.copyAppEvents(source, target, values.domain)
    if (!res.success) {
      notification.error({
        message: '温馨提示',
        description: res.error
      })
      return false
    }
    notification.success({
      message: '温馨提示',
      description: '操作成功'
    })
    await onCancel(false)() //关闭弹出框
    return true
  }

  setFieldError (fieldName, errorMessage) {
    this.props.form.setFields({
      [fieldName]: {
        value: '',
        errors: [new Error(errorMessage)]
      }
    })
  }

  handleProjectChange = async (project_id, option) => {
    const { current } = this.props
    this.setState({ selectedProjectName: option.props.children })
    this.props.form.setFieldsValue({
      analysisId: null,
      appVersion: null
    })
    // 获取所有数据表
    let response = await Fetch.get(Interface.tables, { project_id })
    let result = response.result
    const dataAccessList = result.model.filter((data) => {
      return (data.access_type === current.accessType)
    })
    await this.setStatePromise({ dataAccessList })
  }

  handleAnalysisChange = async (id, option) => {
    const { current } = this.props
    const selectedAccessType = option.props.accessType
    this.setState({
      selectedAnalysisName: option.props.children,
      selectedAccessType
    })
    this.props.form.setFieldsValue({
      appVersion: null
    })
    await this.fetchAppVersions(id)
    if (selectedAccessType !== current.accessType) {
      //this.setAnalysisError()
      return this.setFieldError('analysisId', '不同数据接入类型的分析表之间不能做复制操作')
    }
  }

  async fetchAppVersions (token) {
    const { current } = this.props
    const res = await Fetch.get('/app/sdk/get/app-versions', { token })
    //同一项目的同一分析表中，只能选择大于当前版本的版本号（同表只能将旧的版本复制到新的版本中）
    if (current.analysisId === token) {
      res.rows = res.rows.filter(ap => String(ap.app_version) > String(current.appVersion))
    }
    await this.setStatePromise({
      targetAppVersion: res.rows
    })

  }

  renderTargetAppVersions () {
    let { targetAppVersion } = this.state
    return (
      targetAppVersion.length === 0
        ? null
        : targetAppVersion.map((data, i) => {
          /** data=> app_version, appid, event_bindings_version*/
          const { app_version, event_bindings_version } = data
          return (
            <Option
              event_bindings_version={event_bindings_version}
              value={app_version}
              key={`app-version-${i}`}
            >
              {app_version === null ? 'null' : app_version}
            </Option>
          )
        }
      )
    )
  }

  handleAfterClose = () => {
    const { form: { resetFields } } = this.props
    resetFields()
    this.setState({
      dataAccessList: [],
      targetAppVersion: []
    })
    this.props.refreshAppVersion()
  }

  render () {
    const {
      visible,
      onCancel,
      form: { getFieldDecorator },
      projects,
      current
    } = this.props

    const { dataAccessList } = this.state
    // 主分析表下拉框options
    const accessOptions = dataAccessList && dataAccessList.length > 0
      ? dataAccessList.map((data) => {
        return (
          <Option
            value={data.id}
            key={data.id}
            accessType={data.access_type}
          >
            {data.name}
          </Option>
        )
      })
      : null

    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 20 }
    }

    const selectConfig = {
      dropdownMatchSelectWidth: false,
      showSearch: true,
      allowClear: true,
      optionFilterProp: 'children',
      notFoundContent: '没有内容'
    }

    return (
      <Modal
        title="复制事件"
        visible={visible}
        onOk={this.onOk}
        onCancel={onCancel(false)}
        width={640}
        afterClose={this.handleAfterClose}
      >
        <div className="copy-project-events-title pd2x">
          将当前的项目埋点事件拷贝到目标的项目中(注意：目标项目存在的埋点将会被清空)
        </div>
        <div className="pd2">
          <div className="border radius pd2 aligncenter">
            <div className="iblock pd2r">
              当前项目：
              <strong>{current.projectName}</strong>
            </div>
            <div className="iblock pd2r">
              当前分析表：
              <strong>{current.analysisName}</strong>
            </div>
            <div className="iblock pd2r">
              当前版本：
              <strong>{current.appVersion}</strong>
            </div>
          </div>
        </div>
        <div className="pd2">
          <Form>
            <Form.Item
              label="目标项目"
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('projectId', {
                rules: [{
                  required: true, message: '请选目标择项目'
                }]
              })(
                <Select
                  placeholder="请选择目标项目"
                  onSelect={this.handleProjectChange}
                  {...selectConfig}
                >
                  {
                    projects.length > 0 && projects.map((pro) => {
                      return (
                        <Option
                          value={pro.id}
                          key={pro.id}
                        >{pro.name}</Option>
                      )
                    }) || []
                  }
                </Select>
              )}
            </Form.Item>
            <Form.Item
              label="目标分析表"
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('analysisId', {
                rules: [{
                  required: true, message: '请选择目标分析表'
                }]
              })(
                <Select
                  placeholder="请选择目标分析表"
                  onSelect={this.handleAnalysisChange}
                  {...selectConfig}
                >
                  {accessOptions}
                </Select>
              )}
            </Form.Item>
            <Form.Item
              label="目标版本"
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('appVersion')(
                <Select
                  placeholder={this.state.targetAppVersion.length === 0 ? '无版本,与源版本一致' : '请选择目标版本'}
                  onChange={(val) => this.setState({ selectedAppVersion: val })}
                  {...selectConfig}
                >
                  {this.renderTargetAppVersions()}
                </Select>
              )}
            </Form.Item>
            <Form.Item
              label={(
                <div className="inline">
                  <Tooltip
                    title={(
                      <div>
                        <p>该值为一个完整的域名或一个通配符。</p>
                        <p>例如，目标域名为：<code>https://www.a.com</code></p>
                        <p>您可以输入完整域名：<code>{'https://www.a.com'}</code></p>
                        <p>或能匹配目标域名的通配符：<code>{'*a.com'}</code></p>
                      </div>
                    )}
                  >
                    <Icon type="question-circle-o" />
                  </Tooltip>
                  <span>目标域名</span>
                </div>
              )}
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('domain')(
                <Input type="text" placeholder="填入目标网站域名通配符"/>
              )}
            </Form.Item>
          </Form>
        </div>
      </Modal>
    )
  }
}

export default createForm()(CopyProjectEvents)
