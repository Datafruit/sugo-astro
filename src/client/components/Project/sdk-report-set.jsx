import React, { Component } from 'react'
import { Form, Modal, Radio, Icon, Button, Popover, InputNumber } from 'antd'

const formItemLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 }
}

const FormItem = Form.Item
const RadioGroup = Radio.Group

@Form.create()
export default class SdkReportSet extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false
    }
  }

  renderForm = () => {
    const { data = {}, form: { getFieldDecorator } } = this.props
    return <Form>
      <FormItem {...formItemLayout} label="采集地理位置间隔时间" >
        {getFieldDecorator('sdk_position_config', {
          initialValue: _.isNaN(_.toNumber(data.sdk_position_config)) ? 0 : data.sdk_position_config
        })(
          <InputNumber type="text" max={300} min={0} />
        )}
        <Popover
          trigger="hover"
          content={'以分钟为单位，等于0代表不上报'}
        >
          <Icon type="exclamation-circle" className="color-grey mg1l" />
        </Popover>
      </FormItem>
      <FormItem {...formItemLayout} label="采集数据" >
        {getFieldDecorator('sdk_ban_report', {
          initialValue: data.sdk_ban_report || '1'
        })(
          <RadioGroup >
            <Radio value="1" key={'rdo-state-1'}>启用</Radio>
            <Radio value="0" key={'rdo-state-2'}>禁用</Radio>
          </RadioGroup>
        )}
      </FormItem> 
      <FormItem {...formItemLayout} label="采集点击位置数据" >
        {getFieldDecorator('sdk_submit_click_point', {
          initialValue: data.sdk_submit_click_point || '1'
        })(
          <RadioGroup >
            <Radio value="1" key={'rdo-state-1'}>启用</Radio>
            <Radio value="0" key={'rdo-state-2'}>禁用</Radio>
          </RadioGroup>
        )}
      </FormItem>
    </Form>
  }

  onSubmit = () => {
    const { saveGlobalConfig, saveProjectConfig, project, form } = this.props
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        const { sdk_ban_report, sdk_position_config, sdk_submit_click_point } = values
        if (_.isEmpty(project)) {
          saveGlobalConfig({
            config: [
              { key: 'sdk_ban_report', val: sdk_ban_report },
              { key: 'sdk_position_config', val: sdk_position_config },
              { key: 'sdk_submit_click_point', val: sdk_submit_click_point }]
          })
        } else {
          saveProjectConfig({ id: project.id, extra_params: { sdk_ban_report, sdk_position_config, sdk_submit_click_point } })
        }
        form.resetFields()
      }
    })

  }

  renderFooter = (loading) => {
    const { hideSdkReportSet } = this.props
    return (
      <div className="alignright">
        <Button
          type="ghost"
          icon="close-circle-o"
          className="mg1r iblock"
          onClick={hideSdkReportSet}
        >取消</Button>
        <Button
          type="success"
          icon={loading ? 'loading' : 'check'}
          className="mg1r iblock"
          onClick={this.onSubmit}
          disabled={loading}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )
  }

  hide = () => {
    const { hideSdkReportSet, form } = this.props
    form.resetFields()
    hideSdkReportSet()
  }

  render() {
    const { loading } = this.state
    const { displaySdkReportSet, hideSdkReportSet, project } = this.props
    return (
      <Modal
        visible={displaySdkReportSet}
        onCancel={hideSdkReportSet}
        title={'SDK采集数据设置 ' + (_.isEmpty(project) ? '[全局]' : `[${project.name}]`)}
        footer={this.renderFooter(loading)}
        width={500}
      >
        {this.renderForm()}
      </Modal>
    )
  }
}
