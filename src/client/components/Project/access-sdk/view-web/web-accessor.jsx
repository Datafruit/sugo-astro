/**
 * @file WebSDK接入UI
 * 1. 展示接入文档
 * 2. 检测安装状态
 * 3. 成功后跳入编辑状态
 */

import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { Row, Col, Button, Icon } from 'antd'
import Docs from './docs'
import Store from './store'
import { compressUrlQuery } from '../../../../../common/sugo-utils'

export default class Main extends React.Component {

  static propTypes = {
    project: PropTypes.object.isRequired,
    analysis: PropTypes.object.isRequired
  }

  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {WebSDKAccessorState} */
    this.state = this.store.getState()
  }

  componentDidMount () {
    const { project, analysis } = this.props
    this.store.init(project, analysis)
  }

  renderDocs () {
    const {
      Project: project,
      DataAnalysis: analysis
    } = this.state

    return (
      <div>
        <div className="borderb pd2b">
          <Row gutter={16}>
            <Col span={12}><strong className="font18">JS SDK 安装</strong></Col>
            <Col span={12}>
              <div className="alignright">
                <Button
                  onClick={() => this.store.check()}
                  type="primary"
                >检测SDK安装状态</Button>
              </div>
            </Col>
          </Row>
        </div>
        <div className="pd2t">
          <Docs
            project_id={project.datasource_name}
            appid={analysis.id}
          />
        </div>
      </div>
    )
  }

  renderInstallStatus () {
    const {
      DataAnalysis: analysis,
      vm: { installed, check_end }
    } = this.state

    return (
      <div className="line-height24">
        <p className="pd2 borderb dashed">
          {
            check_end
              ? null
              : (
                <span className="pd2r">
                  <Icon type="loading"/>
                </span>
              )
          }
          <span className="color-purple">
            {
              !check_end
                ? '正在检测SDK安装状态...'
                : installed ? 'SDK安装检测成功' : 'SDK安装检测失败'
            }
          </span>
          {
            installed ? (
              <Link
                to={`/console/track/choose-website-track/${compressUrlQuery({ token: analysis.id, appName: analysis.name, project_id: analysis.project_id })}`}
              >
                <Button type="primary" className="mg2l">进入可视化埋点</Button>
              </Link>
            ) : null
          }
        </p>
        <p className="pd2t">
          <strong>检测预计用时30秒至2分钟, 请耐心等待。</strong>
        </p>
        <p className="pd2t">若长时间未检测到数据, 可能有以下原因：</p>
        <ol className="pd2l">
          <li>1. 代码没有部署正确</li>
          <li>2. 您的项目无法发送数据到网络</li>
        </ol>
      </div>
    )
  }

  render () {
    return (
      <div className="pd2">
        {
          this.state.vm.checking
            ? this.renderInstallStatus()
            : this.renderDocs()
        }
      </div>
    )
  }
}
