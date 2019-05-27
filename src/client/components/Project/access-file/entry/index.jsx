/**
 * @file 该文件为不同类型文件的接入路由
 */

import { Component, PropTypes } from 'react'
import { Upload, Button, Alert, Icon } from 'antd'
import { browserHistory } from 'react-router'
import Bread from '../../../Common/bread'
import CsvAccessor from '../csv/index'
import Store from './store/index'
import { AccessFileExtName } from '../../constants'
import helpLinkMap from 'common/help-link-map'
import Steps from '../../../Common/access-steps'
import commonDecs from './common-function'

const { docUrl, cdn } = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const helpLink = docUrl + helpLinkMap['/console/project#create-file']

@commonDecs
export default class Main extends Component {

  static propTypes = {
    project: PropTypes.object.isRequired,
    analysis: PropTypes.array.isRequired
  }

  static defaultProps = {
    project: {},
    analysis: []
  }

  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    /** @type {ProjectFileAccessorState} */
    this.state = this.store.getState()
    this.store.subscribe(state => this.setState(state))
  }

  componentWillMount () {
    const { project, analysis } = this.props
    this.store.init(project, analysis)
  }

  renderAccessor () {
    const {
      Project,
      ViewModel: {
        file,
        type,
        analysis
      }
    } = this.state
    let { changeProject } = this.props

    if (file === null || type === null) {
      return null
    }

    switch (type) {
      case AccessFileExtName.Csv:
        return (
          <CsvAccessor
            file={file}
            analysis={analysis}
            project={Project}
            changeProject={changeProject}
          />
        )
      default:
        return <Alert type="error" message="不支持的文件类型"/>
    }
  }

  renderUpload () {
    return (
      <div className="aligncenter">

        <p className="pd2">
          <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock"/>
        </p>

        <Upload
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          multiple={false}
          beforeUpload={file => this.beforeUpload(file)}
        >
          <Button
            size="large"
            type="primary"
            icon="upload"
          >选择上传文件</Button>
        </Upload>
        <div className="pd3t alignleft mg-auto mw420 mg3t">
          <div className="pd1b">
            <strong className="b">说明：</strong>
          </div>
          <p>1. 目前支持CSV文件导入，其它格式将陆续提供支持；</p>
          <p>2. 文件编码必须为UTF-8；</p>
          <p>3. 文件首行将判定为数据列标题，必须是英文或字母，不能包含中文。</p>
        </div>
      </div>
    )
  }

  renderSteps = () => {
    let { file } = this.state.ViewModel
    if (file) return null
    return (
      <Steps
        current={1}
      />
    )
  }

  render () {
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
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '项目管理', link: '/console/project' },
            { name: '文件接入' }
          ]}
          extra={extra}
        >
          <Button
            className="mg1l"
            onClick={() => browserHistory.push('/console/project')}
          >返回</Button>
        </Bread>
        <div
          className="pd2y pd3x"
          style={{height: 'calc(100% - 44px)'}}
        >
          <div
            className="scroll-content always-display-scrollbar height-100"
          >
            {this.renderSteps()}
            {
              this.state.ViewModel.file !== null
                ? this.renderAccessor()
                : this.renderUpload()
            }
          </div>
        </div>
      </div>
    )
  }
}
