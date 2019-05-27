import _ from 'lodash'
import React, { Component } from 'react'
import { Modal, Button, Tabs, message, Input, Row, Spin } from 'antd'
const { TextArea } = Input
const TabPane = Tabs.TabPane

/**
 *  用户自定义supervisor配置弹出层
 */
export class SupervisorSettingModal extends Component {
  constructor(props) {
    super(props)
  }
  state = {
    tabStatus: '1',
    localConfig: null,
    valueChange: false,
    copyVisible: true
  }
  
  componentDidMount() {
    const { settingDataSources, getSuperVisorConfig } = this.props
    getSuperVisorConfig(settingDataSources)
    this.setState({
      copyVisible: false
    })
  }

  componentWillUnmount() {
    this.setState({
      tabStatus:'1'
    })
  }

  callback = key => {
    this.setState({
      tabStatus: key
    })
  }

  resetConfig = () => {
    this.setState({
      localConfig:null,
      valueChange:false 
    })
  }

  handleChange = e => {
    this.setState({
      localConfig:  e.target.value,
      valueChange: true
    })
  }

  isJson = (str) => {
    try {
      let myjson = eval(`(${str})`)
      if(_.isObject(myjson) && !_.isArray(myjson)) {
        return true
      } else {
        return false
      }
    } catch(err) {
      return false
    }
  }

  onSubmit = () => {
    const { localConfig } = this.state
    const { updateSupervisor } = this.props

    if(this.isJson(localConfig)) {
      updateSupervisor(this.formatstrToJson(localConfig))
    } else {
      message.error('不合法的json配置!',5)
    }
  }

  formatJsonTostring = json => {
    try {
      return JSON.stringify(json, null, 4)
    } catch (error) {
      message.error('配置不合法')
    }
  }

  formatstrToJson = str => {
    try {
      return eval(`(${str})`)
    } catch (error) {
      message.error('配置不合法')
    }
  }

  formatConfig = () => {
    const { valueChange, localConfig } = this.state
    if(valueChange){
      let cacheVal = this.formatstrToJson(localConfig)

      cacheVal && this.setState({
        localConfig: this.formatJsonTostring(cacheVal)
      })
    }
  }

  copyOriginConfig = () => {
    document.getElementById('config').select()
    if(document.execCommand('copy')) {
      document.execCommand('copy')
      message.success('复制成功!')
    }
  }

  renderTab = () => {
    let { tabStatus, localConfig, valueChange, copyVisible } = this.state
    let { localSupervisorConfig, originSupervisorConfig } = this.props

    return (<Tabs defaultActiveKey={tabStatus} onChange={this.callback}>
      <TabPane tab={<span>本地supervisor</span>} key="1">
        <div>
          <TextArea
            rows="20"
            value={localConfig||valueChange ? localConfig : this.formatJsonTostring(localSupervisorConfig)}
            onChange={this.handleChange}
          />
        </div>
        <p className="attention">注意：修改后启动项目会以此配置优先启动</p>
        <Row>
          <Button onClick={this.formatConfig}>格式化配置</Button>
          <Button onClick={this.resetConfig}>重置配置</Button>
        </Row>
      </TabPane>
      <TabPane tab={<span>远程supervisor</span>} key="2">
        <div>
          <TextArea
            id="config"
            rows="20"
            readOnly
            value={this.formatJsonTostring(originSupervisorConfig)}
          />
        </div>
        <p className="attention">注意：远程配置指supervisor启动历史记录中, 最后一次启动的配置</p>
        <Row><Button disabled={copyVisible} onClick={this.copyOriginConfig}>复制</Button></Row>
      </TabPane>
    </Tabs>)
  }

  render(){
    const { visible, hideModal, loading } = this.props

    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon="close-circle-o"
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={loading ? 'loading' : 'check'}
          className="mg1r iblock"
          onClick={this.onSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    return (
      <Modal 
        className="project-supervisor-modal"
        title="手动更新supervisor配置"
        visible={visible}
        onCancel={hideModal}
        footer={footer}
      >
        {
          loading  
            ? <Spin />
            : this.renderTab()
        }
      </Modal>
    )
  }
}

