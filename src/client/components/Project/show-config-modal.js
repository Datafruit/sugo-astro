import _ from 'lodash'
import React, { Component } from 'react'
import { Modal, Button, message, Input, Spin } from 'antd'
const { TextArea } = Input

export class ShowConfigModal extends Component {
  constructor(props) {
    super(props)
  }
  state = {
    tabStatus: '1',
    localConfig: null,
    valueChange: false
  }
  
  componentDidMount() {
    let { getUindexConfig, settingDataSources } = this.props
    getUindexConfig(settingDataSources)
  }

  componentWillUnmount() {
  }

  formatJsonTostring = json => {
    try {
      return JSON.stringify(json, null, 4)
    } catch (error) {
      message.error('配置不合法')
    }
  }

  renderTab = () => {
    let { localSupervisorConfig } = this.props
    return (
      <React.Fragment>
        <div>
          <TextArea
            rows="20"
            disabled={true}
            value={this.formatJsonTostring(localSupervisorConfig)}
          />
        </div>
        </React.Fragment>)
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
        >关闭</Button>
      </div>
    )

    return (
      <Modal 
        className="project-supervisor-modal"
        title="uindexSpec配置"
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

