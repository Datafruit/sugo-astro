import { Component } from 'react'
import { Button, Alert } from 'antd'
import { Link } from 'react-router'
import LoadingElement from '../../Common/loading'

import FileAccessor from '../access-file/entry/index'
import SDKAccessor from '../access-sdk'
import LogAccessor from '../access-collector/index'
import TagAccessor from '../access-tag/index'

import Store from './store'
import { AccessDataType } from '../constants'
import MySQLAccessor from '../access-mysql'

const { cdn } = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

/**
 * 接入数据，步骤如下
 * 1. 请求参数中的id，作为当前的项目的id
 * 2. 使用id查询项目记录
 * 3. 展示记录中对应接入类型的界面
 */
export default class Main extends Component {
  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    this.state = this.store.getState()
    this.store.subscribe(state => this.setState(state))
  }

  componentWillMount () {
    const { params: { id } } = this.props
    // 没有id时提示异常
    if (id) {
      this.store.init(id)
    }
  }

  renderNoneAccessType () {
    const { params: { id } } = this.props
    return (
      <div
        className="relative"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="center-of-relative aligncenter">
          <p className="pd2">
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock"/>
          </p>
          <p className="pd1">
            未找到项目({id})记录，请到项目列表中确认项目已创建
          </p>
          <div className="pd2">
            <Link to="/console/project">
              <Button type="primary">点击进入项目列表</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  renderAccess (type) {
    const {
      ViewModel: {
        analysis,
        projects
      },
      Project: project,
      Loading
    } = this.state

    if (Loading.loading) {
      return (<div className="height-100">&nbsp;</div>)
    }

    let {location} = this.props

    switch (type) {
      case AccessDataType.File:
        return (
          <FileAccessor
            {...this.props}
            project={project}
            analysis={analysis}
            location={location}
          />
        )
      case AccessDataType.SDK:
        return (
          <SDKAccessor
            project={project}
            analysis={analysis}
            location={location}
          />
        )
      case AccessDataType.Log:
        return (
          <LogAccessor
            {...this.props}
            project={project}
            analysis={analysis}
            location={location}
          />
        )
      case AccessDataType.Tag:
        return (
          <TagAccessor
            {...this.props}
            project={project}
            analysis={analysis}
            location={location}
            actionProject={projects.filter(p => p.tag_datasource_name === project.tag_datasource_name && p.id !== project.id )}
          />
        )
      case AccessDataType.MySQL:
        return (
          <MySQLAccessor
            {...this.props}
            project={project}
            analysis={analysis}
            location={location}
          />
        )
      default:
        return <Alert type="error" message="没有对应的接入类型"/>
    }
  }

  render () {
    const { ViewModel, Loading } = this.state

    if (!Loading.loading && ViewModel.type === null) {
      return this.renderNoneAccessType()
    }

    return (
      <LoadingElement isLoading={Loading.loading} className="height-100">
        {this.renderAccess(ViewModel.type)}
      </LoadingElement>
    )
  }
}
