/**
 * @file SDK接入主界面，包含功能如下
 * 1. 左侧展示所有的项目
 * 2. 右右侧随着左侧的操作而显示不同的接入类型
 *
 * 注：该view只负责控制显示组件，具体实现在不同的组件中完成。
 * 不要在该view中写接入逻辑
 *
 * 注：此view足够简单不必写store
 */

import React, { Component } from 'react'
import { Icon, Button, Alert } from 'antd'
import { browserHistory, Link } from 'react-router'
import Bread from '../../Common/bread'
import Steps from '../../Common/access-steps'
import WebAccessor from './view-web'
import IOSAccessor from './view-ios'
import AndroidAccessor from './view-android'
import WxAccessor from './view-wx-mini'
import * as PubSub from 'pubsub-js'
import { AccessDataOriginalType, PROJECT_STATE } from '../constants'
import helpLinkMap from 'common/help-link-map'
import './style.styl'
import deepCopy from 'common/deep-copy'
import _ from 'lodash'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/project#create-sdk']

const ACCESS_MAP = {
  [AccessDataOriginalType.Ios]: {
    icon: 'apple',
    showAccess: true
  },
  [AccessDataOriginalType.Android]: {
    icon: 'android',
    showAccess: true
  },
  [AccessDataOriginalType.Web]: {
    icon: 'desktop',
    showAccess: true
  },
  [AccessDataOriginalType.Csv]: {
    icon: 'file-text',
    showAccess: false
  },
  [AccessDataOriginalType.Mysql]: {
    icon: 'database',
    showAccess: false
  },
  [AccessDataOriginalType.WxMini]: {
    icon: 'wechat',
    showAccess: true
  }
}

const {
  enableWechatAppAccess = false
} = window.sugo

export default class Main extends Component {

  static propTypes = {
    project: React.PropTypes.object.isRequired,
    analysis: React.PropTypes.array.isRequired
  }

  constructor (props, context) {
    super(props, context)
    let name = _.get(props.location.query, 'type')
    const analysis = enableWechatAppAccess
      ? props.analysis
      : props.analysis.filter(a => a.access_type !== AccessDataOriginalType.WxMini)
    let accessAnalysisObj = _.find(analysis, a => a.name === name)
      || _.find(analysis, a => a.status === PROJECT_STATE.Activate)
      || analysis[0] || null

    let status = _.get(accessAnalysisObj, 'status')
    const installed = status === PROJECT_STATE.Activate
    this.state = {
      accessAnalysis: accessAnalysisObj,
      stepCurrent: installed ? 3 : 1
    }
  }

  componentDidMount () {
    PubSub.subscribe('sdk.stepChange', (msg, stepCurrent) => {
      this.setState({ stepCurrent })
    })
    let token = _.get(this.state.accessAnalysis, 'id')
    this.changeUrl({ token }, 'replace')
  }

  componentWillReceiveProps (nextProps) {
    let current = this.props.location.query.token
    let token = nextProps.location.query.token
    if (token && token !== current) {
      const nextAnalysis = enableWechatAppAccess
        ? nextProps.analysis
        : nextProps.analysis.filter(a => a.access_type !== AccessDataOriginalType.WxMini)

      let accessAnalysisObj = _.find(nextAnalysis, a => a.id === token)
      if (accessAnalysisObj) {
        const installed = accessAnalysisObj.status === PROJECT_STATE.Activate
        this.setState({
          accessAnalysis: accessAnalysisObj,
          stepCurrent: installed ? 3 : 1
        })
      }
    }
  }

  //change url
  changeUrl = (queryObj, action = 'push', props = this.props) => {
    let newLoc = deepCopy(_.pick(props.location, ['pathname', 'query']))
    Object.assign(newLoc.query, queryObj)
    browserHistory[action](newLoc)
  }

  onTabMod = mod => this.changeUrl({ token: mod.id })

  renderLeftContent () {
    let { analysis, project } = this.props
    const { accessAnalysis } = this.state
    let {tag_datasource_name, datasource_id} = project
    // let to = `/console/dimension?id=${datasource_id}&datasource_type=tag`
    const to = `/console/tag-system-manager?id=${datasource_id}&datasource_type=tag`

    if (!enableWechatAppAccess) {
      analysis = analysis.filter(a => a.access_type !== AccessDataOriginalType.WxMini)
    }
    return (
      <div className="pd2y">
        {
          _.orderBy(analysis, a => a.access_type).map(mod => {
            const rc = ACCESS_MAP[mod.access_type]
            const cname = (accessAnalysis && accessAnalysis.id === mod.id) ? ' active' : ''
            const cnameTitle = (accessAnalysis && accessAnalysis.id === mod.id) ? ' active-text' : ''
            const installed = mod.status === PROJECT_STATE.Activate
            return (
              <div
                className={`access-item border-eee ${cname}`}
                key={mod.id}
              >
                <div className="fix">
                  <div className={`fleft ${cnameTitle}`}>
                    <Icon type={rc.icon}/>
                    <span className="pd1l">{mod.name}</span>
                  </div>
                  <div className="fright">
                    <span
                      className={`${installed ? 'icon-active' : 'icon-normal'}`}
                    />
                    <span>{installed ? '已接入' : '未接入'}</span>
                  </div>
                </div>
                <div className="pd1t fix">
                  <span className="block pd1b access-token">
                    <span className="title">Token: </span><span className="desc">{mod.id}</span>
                  </span>
                  {
                    rc.showAccess ? (
                      <Button
                        onClick={() => this.onTabMod(mod)}
                        size="small"
                        type="primary"
                        className="fright"
                      >
                        <span className="pd1x">{installed ? '维护' : '接入'}</span>
                      </Button>
                    )
                      : null
                  }
                </div>
              </div>
            )
          })
        }

      </div>
    )
  }

  renderRightContent () {
    const { project } = this.props
    const { accessAnalysis } = this.state
    let commonProps = {
      setStep: this.setStep
    }

    if (!accessAnalysis) {
      return <Alert message="请选择接入项目" type="info"/>
    }

    switch (accessAnalysis.access_type) {
      case  AccessDataOriginalType.Ios:
        return (
          <IOSAccessor
            project={project}
            analysis={accessAnalysis}
            {...commonProps}
          />
        )
      case AccessDataOriginalType.Android:
        return (
          <AndroidAccessor
            project={project}
            analysis={accessAnalysis}
            {...commonProps}
          />
        )
        case AccessDataOriginalType.Web:
        return (
          <WebAccessor
            project={project}
            analysis={accessAnalysis}
            {...commonProps}
          />
        )
      case AccessDataOriginalType.WxMini:
      return (
        <WxAccessor
          project={project}
          analysis={accessAnalysis}
          {...commonProps}
        />
      )
      default:
        return <Alert message="并没对应的接入类型" type="error"/>
    }
  }

  renderSteps = () => {
    let steps = [
      {
        title: '选择导入方式'
      },
      {
        title: '安装SDK'
      },
      {
        title: '检测SDK安装'
      },
      {
        title: '完成数据导入'
      }
    ]
    let { stepCurrent } = this.state
    return (
      <Steps
        steps={steps}
        className="bg-white pd2y pd3x borderb"
        current={stepCurrent}
      />
    )
  }

  render () {
    const { project = {} } = this.props
    let extra = (
      <a
        href={helpLink}
        target="_blank"
        className="color-grey pointer"
        title="查看帮助文档"
      >
        <Icon type="question-circle"/>
      </a>
    )
    return (
      <div className="height-100 bg-white access-sdk">
        <Bread
          path={[
            { name: '项目管理', link: '/console/project' },
            { name: 'SDK接入' }
          ]}
          extra={extra}
        >
          <Button
            className="mg1l"
            onClick={() => browserHistory.push('/console/project')}
          >返回</Button>
        </Bread>
        {this.renderSteps()}
        <div
          className="scroll-content always-display-scrollbar"
          style={{ height: window.innerHeight - 44 - 48 - 61 }}
        >
          <div className="height-100">
            <div className="content height-100">
              <div className="content-left bg-white pd2t pd3x borderr">
                <div className="borderb dashed pd2b">
                  <div>项目名称：{project.name}</div>
                  <div className="pd1t">项目ID：{project.datasource_name}</div>
                </div>
                <div className="pd2t">
                  {this.renderLeftContent()}
                </div>
              </div>
              <div className="content-right height-100">
                <div className="pd3x pd2b height-100">
                  <div
                    className="height-100 bg-white pd2y content-right-wrapper">
                    <div className="height-100 overscroll-y">
                      {this.renderRightContent()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
