import React, {PropTypes} from 'react-proptypes-proxy'
import { Row, Col, Popover, Tabs, Input, Select, message, Icon } from 'antd'
import {Button2 as Button} from '../Common/sugo-icon'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'

const {TabPane} = Tabs

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class CommonSaveModal extends React.Component {
  static propTypes = {
    modelType: PropTypes.string,
    canSaveAsOnly: PropTypes.bool,
    canSelectDataSourceId: PropTypes.bool,
    currModelName: PropTypes.string,
    visible: PropTypes.bool,
    onVisibleChange: PropTypes.func,
    onUpdate: PropTypes.func,
    onSaveAs: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    // 下面两个属性一般是根据权限来设置
    allowCreate: PropTypes.bool,
    allowUpdate: PropTypes.bool
  }

  static defaultProps = {
    modelType: '报告',
    allowCreate: true,
    allowUpdate: true
  }

  state = {
    tempName: undefined,
    isSaving: false
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.currModelName !== nextProps.currModelName) {
      this.setState({tempName: undefined})
    }
  }
  
  renderDataSourceIdOption = () => {
    const { datasourceList } = this.props
    return datasourceList.map( (i,idx) => (
      <Select.Option value={i.id} key={idx}>{i.title}</Select.Option>
    ))
  }

  render() {
    let {
      modelType, canSaveAsOnly, canSelectDataSourceId, currModelName, visible, onVisibleChange, onUpdate, onSaveAs, allowCreate, allowUpdate, ...rest
    } = this.props
    let {tempName, isSaving} = this.state
    let editingName = tempName === undefined ? currModelName : tempName
    let dataSourceId = undefined

    let showUpdatePanel = allowUpdate && !canSaveAsOnly
    let showCreatePanel = allowCreate

    if (!showCreatePanel && !showUpdatePanel) {
      return null
    }

    let savePop = visible ? (
      <Tabs defaultActiveKey={canSaveAsOnly || !allowUpdate ? 'saveAs' : 'update'} className="width300">
        {!showUpdatePanel ? null : (
          <TabPane
            tab={`更新当前${modelType}`}
            key="update"
            disabled={canSaveAsOnly}
          >
            <Row>
              <Col className="pd1" span={24}>{modelType}名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={editingName}
                  className="width-100"
                  onChange={ev => this.setState({tempName: ev.target.value})}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                <Button
                  icon="save"
                  type="primary"
                  className="width-100"
                  loading={isSaving}
                  onClick={async () => {
                    if (!editingName) {
                      message.error('请先填写名称')
                      return
                    }
                    this.setState({isSaving: true})
                    await onUpdate(editingName)
                    this.setState({isSaving: false})
                    onVisibleChange(false)
                  }}
                >更新</Button>
              </Col>
            </Row>
          </TabPane>
        )}

        {!showCreatePanel ? null : (
          <TabPane tab={`另存为新${modelType}`} key="saveAs">
            <Row>
              <Col className="pd1" span={24}>{modelType}名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={editingName}
                  className="width-100"
                  onChange={ev => this.setState({tempName: ev.target.value})}
                  placeholder="未输入名称"
                />
              </Col>
              {
                canSelectDataSourceId ? (
                  <div>
                  <Col className="pd1" span={24}>选择项目</Col>
                  <Col className="pd1" span={24}>
                    <Select
                      className="width-100"
                      placeholder="请选择项目"
                      labelInValue
                      onChange={(value) => {
                        dataSourceId = value.key
                      }}
                    >
                      {this.renderDataSourceIdOption()}
                    </Select>
                  </Col>
                  </div>
                )
               
                : null
              }
              <Col className="pd1 alignright" span={24}>
               {
                canSelectDataSourceId ?
                  <Button
                    icon="save"
                    type="primary"
                    className="width-100"
                    loading={isSaving}
                    onClick={async () => {
                      if (!editingName || !dataSourceId) {
                        message.error('请先填写内容')
                        return
                      }
                      this.setState({isSaving: true})
                      await onSaveAs(editingName,dataSourceId)
                      this.setState({isSaving: false})
                      onVisibleChange(false)
                    }}
                  >保存</Button>
                  :
                  <Button
                  icon="save"
                  type="primary"
                  className="width-100"
                  loading={isSaving}
                  onClick={async () => {
                    if (!editingName) {
                      message.error('请先填写名称')
                      return
                    }
                    this.setState({isSaving: true})
                    await onSaveAs(editingName)
                    this.setState({isSaving: false})
                    onVisibleChange(false)
                  }}
                >保存</Button>
              }
              </Col>
            </Row>
          </TabPane>
        )}

      </Tabs>
    ) : <div className="width300 height160" />
    if (canSelectDataSourceId) {
      return (
        <Popover
          trigger="click"
          title={ <Icon
            type="close"
            className="fright mg1y color-red"
            onClick={() => onVisibleChange(false)}
          />}
          content={savePop}
          visible={visible}
          {...rest}
        />
      )
    } else {
      return (
        <Popover
          trigger="click"
          content={savePop}
          visible={visible}
          onVisibleChange={onVisibleChange}
          {...rest}
        />
      )
    }
  }
}
