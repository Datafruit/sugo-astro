import React from 'react'
import {browserHistory} from 'react-router'
import Bread from '../../Common/bread'
import {Table, Button, Form, Select, Input, InputNumber, Upload, Row, Col, Progress, Modal, notification, message} from 'antd'
import Steps from '../../Common/access-steps'
import _ from 'lodash'
import Poster from '../../Fetcher/poster'
import Alert from '../../Common/alert'
import SizeProvider  from '../../Common/size-provider'
import Store from './store'
import {Actions, extractFieldType} from './store/view-model'
import {compressUrlQuery, immutateUpdate, immutateUpdates} from '../../../../common/sugo-utils'
import {logPatternToGrokPattern} from './log-vars-to-grok-pattern'
import classNames from 'classnames'
import {Link} from 'react-router'
import Icon2 from '../../Common/sugo-icon'
import {format, extent} from 'd3'
import FixWidthHelper from '../../Common/fix-width-helper-no-hidden'
import LocalFileLinesReader, {LocalFileLinesReaderStateEnum} from './local-file-lines-reader'
import Fetch from '../../Common/fetch'
import BoundaryTimeFetcher from '../../Fetcher/boundary-time-fetcher'
import moment from 'moment'
import Timer from '../../Common/timer'
import HoverHelp from '../../Common/hover-help'
import helpLinkMap from 'common/help-link-map'
import {loadDefaultSync} from 'grok.js'
import FetchFinal from '../../../common/fetch-final'

let nodeGrok
const createParser = _.memoize(patternStr => {
  if (!nodeGrok) {
    nodeGrok = loadDefaultSync()
  }
  if (10 < createParser.cache.size) {
    createParser.cache.clear()
  }
  return nodeGrok.createPattern(patternStr)
})

function parseSingleRow(patternStr, str) {
  if (!patternStr || !str) {
    return null
  }
  let pattern = createParser(patternStr)
  let obj = pattern.parseSync(str)
  if (_.isEmpty(obj)) {
    let debugInfo = pattern.debug(str)
    throw new Error(debugInfo)
  }
  return obj
}

/**
 * 用一个 grok 表达式解析多个字符串
 * @param {string} patternStr
 * @param {string[]} strArr
 * @returns {{succRes: Object.<number, Object>, errRes: Object.<number, Object>}}
 */
function parseMultiRow(patternStr, strArr) {
  if (!patternStr || _.isEmpty(strArr)) {
    return null
  }
  let pattern = createParser(patternStr)
  let succRes = {}, errRes = {}
  strArr.forEach((str, i) => {
    try {
      let obj = pattern.parseSync(str)
      if (_.isEmpty(obj)) {
        errRes[i] = '匹配失败'
      } else {
        succRes[i] = obj
      }
    } catch (err) {
      errRes[i] = _.get(err, 'message') || JSON.stringify(err)
    }
  })

  return {succRes, errRes}
}

const {Item: FormItem} = Form
const {Option} = Select

const {docUrl} = window.sugo
const helpLink = docUrl + helpLinkMap['/console/project#create-log']

const percentFormat = format('.1%')

export const collectorStepsTitles = ['选择导入方式', '检验数据', '设定时间维度', '接入数据']

const LogType = {
  nginx: 'nginx',
  tomcat: 'tomcat',
  apacheHttpd: 'apacheHttpd'
}

const LogUploadState = {
  uploading: 'uploading',
  done: 'done',
  error: 'error'
}

const LogUploadStateIcon = {
  uploading: 'loading',
  done: 'check-circle',
  error: 'close-circle'
}

const LogUploadStateHint = {
  uploading: '上传中...',
  done: '上传完成',
  error: '上传失败'
}

const MaxDruidDataCheckerTryCount = 5
const DruidDataCheckerRetryInterval = 5 * 1000

const DruidDataCheckerStateEnum = {
  idle: 'idle',
  checking: 'checking',
  hasData: 'hasData',
  waitingForRetry: 'waitingForRetry'
}

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 14 }
  }
}

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0
    },
    sm: {
      span: 14,
      offset: 6
    }
  }
}

export default class LogAccessor extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    this.state = {
      stepCurrent: 1,
      parsePreview: undefined,
      importBy: 'sugo-c',
      preUploadFile: null,
      doneUploadFile: null,
      visiblePopoverKey: null,
      druidDataCheckerState: DruidDataCheckerStateEnum.idle,
      druidDataCheckerTryCount: 0,
      ...this.store.getState()
    }
    this.store.subscribe(state => {
      this.setState(state && state.ViewModel)
    })
  }

  updateLogApp = (path, updater) => {
    return new Promise((resolve) => {
      this.store.dispatch({type: Actions.updateState, payload: state => {
        if (_.isString(path)) {
          path = _.toPath(path)
        }
        return immutateUpdate(state, ['logApp', ...path], updater)
      }}, resolve)
    })
  }

  componentWillMount () {
    const {project} = this.props
    // 没有id时提示异常
    if (project) {
      this.store.init(project.id)
    }
  }

  renderSteps = () => {
    let steps = collectorStepsTitles.map(title => ({title}))
    let { stepCurrent } = this.state
    return (
      <div className="pd2t pd1b pd3x" >
        <Steps
          steps={steps}
          current={stepCurrent}
        />
      </div>
    )
  }

  onInputChange = ev => {
    let {name, value} = ev.target
    return this.updateLogApp(`params['${name}']`, () => value)
  }

  componentDidUpdate(prevProps, prevState) {
    let {
      logVarType: prevLogVarType = 'nginx',
      logFormat: prevLogFormat,
      grokPattern: prevGrokPattern = logPatternToGrokPattern(prevLogVarType, _.trim(prevLogFormat)),
      rowStr: prevRowStr
    } = _.get(prevState.logApp, 'params') || {}

    let {
      logVarType = 'nginx', logFormat, grokPattern = logPatternToGrokPattern(logVarType, _.trim(logFormat)), rowStr
    } = _.get(this.state.logApp, 'params') || {}


    if ((prevRowStr !== rowStr || prevGrokPattern !== grokPattern) && rowStr && grokPattern) {
      this.tryParseSampleData(grokPattern, rowStr)
    }
  }

  tryParseSampleData = _.debounce((grokPattern, rowStr) => {
    try {
      let obj = parseSingleRow(grokPattern, rowStr)
      if (_.isEmpty(obj)) {
        obj = null
      }
      this.setState({parsePreview: obj})
    } catch (e) {
      this.setState({parsePreview: _.isString(e) ? new Error(e) : e})
    }
  }, 1000)

  renderParsePreview = (grokPattern, rowStr, result) => {
    let error
    if (_.isError(result)) {
      error = result
    }

    if (grokPattern && rowStr && !error && result !== undefined && _.isEmpty(result)) {
      error = '匹配失败'
    }
    if (error) {
      let errMsg = _.isString(error)
        ? error
        : _.isString(error.message) ? error.message : JSON.stringify(error)
      return (
        <Alert
          msg={errMsg}
        />
      )
    }
    return (
      <SizeProvider>
        {({spWidth})=>{
          let fieldType = result && extractFieldType(grokPattern) || {}
          return (
            <Table
              bordered
              size="small"
              pagination={false}
              className="always-display-scrollbar-horizontal-all"
              dataSource={_.keys(result).map(k => {
                return {
                  fieldName: k,
                  fieldType: fieldType[k],
                  val: result[k]
                }
              })}
              columns={[{
                title: '列名',
                dataIndex: 'fieldName',
                key: 'fieldName',
                width: 150,
                className: 'elli'
              }, {
                title: '类型',
                dataIndex: 'fieldType',
                key: 'fieldType',
                width: 100,
                className: 'elli'
              }, {
                title: '值',
                dataIndex: 'val',
                key: 'val',
                width: 150,
                className: 'elli',
                render: (val, record) => {
                  if (val === null) {
                    return (
                      <span className="color-grey">(null)</span>
                    )
                  }
                  if (_.startsWith(record.fieldType, 'date')) {
                    return `${val} (${moment(val).format()})`
                  }
                  return val
                }
              }]}
              scroll={{ x: 400 < spWidth ? '100%' : 400 }}
            />
          )
        }}
      </SizeProvider>
    )
  }

  renderExamDataStep = () => {
    let {parsePreview, logApp, isUpdatingApp} = this.state
    let logAppParams = _.get(logApp, 'params') || {}
    let {
      logVarType = 'nginx', logFormat, grokPattern = logPatternToGrokPattern(logVarType, _.trim(logFormat)), rowStr, lock
    } = logAppParams
    return (
      <Form className="shadow15-bbb border pd2y min-height500" >
        <FormItem
          {...formItemLayout}
          label="选择日志类型"
        >
          <div
            onClick={ev => {
              if (lock) {
                return
              }
              let logType = ev.target.getAttribute('data-log-type')
              if (logType !== logVarType) {
                this.updateLogApp('params.logVarType', () => logType)
              }
            }}
          >
            {_.keys(LogType).map(logType => {
              return (
                <div
                  key={logType}
                  data-log-type={logType}
                  title={logType}
                  className={classNames('itblock width120 height42 corner mg2r', {
                    'border-purple': logType === logVarType,
                    'border fpointer': logType !== logVarType,
                    'disabled': lock
                  })}
                  style={{
                    background: `no-repeat center/50% url(${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/log-project/${logType}-logo.png)`
                  }}
                >
                </div>
              )
            })}
          </div>
        </FormItem>

        <FormItem {...formItemLayout} label="日志格式">
          <Input.TextArea
            placeholder={
              logVarType === 'nginx'
                ? `如：[$time_iso8601] $remote_addr $http_x_forwarded_for "$request" $status $request_time $upstream_response_time $body_bytes_sent $upstream_addr $http_user_agent`
                : logVarType === 'tomcat'
                  ? '如：%h %l %u %t &quot;%r&quot; %s %b'
                  : '如：%h %l %u %t &quot;%r&quot; %s %b'
            }
            autosize={{ minRows: 2, maxRows: 6 }}
            name="logFormat"
            value={logFormat}
            disabled={lock}
            onChange={this.onInputChange}
          />
        </FormItem>

        <FormItem {...formItemLayout} label="生成 Grok 表达式" className="relative" required>
          <Input.TextArea
            placeholder={'grokPattern' in logAppParams ? '未填写...' : '会根据日志格式自动生成'}
            autosize={{ minRows: 2, maxRows: 6 }}
            name="grokPattern"
            disabled={!('grokPattern' in logAppParams) || lock}
            value={grokPattern}
            onChange={this.onInputChange}
          />
          <a
            href="javascript:"
            className={classNames('absolute right1 bottom0 mg1b mg2r color-blue', {hide: lock})}
            onClick={() => {
              if ('grokPattern' in logAppParams) {
                this.updateLogApp('params.grokPattern', () => logPatternToGrokPattern(logVarType, _.trim(logFormat)))
              } else {
                this.updateLogApp('params.grokPattern', () => grokPattern)
              }
            }}
          >{'grokPattern' in logAppParams ? '重置' : '修改'} </a>
        </FormItem>

        <FormItem {...formItemLayout} label="样例数据" required>
          <Input.TextArea
            placeholder={`如：[2017-08-10T16:53:20+08:00] 120.76.247.214 219.136.205.81 "GET /app/slices/query-druid?q=1 HTTP/1.0" 200 1.741 1.741 764 192.168.0.227:8000 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.86 Safari/537.36`}
            autosize={{ minRows: 2, maxRows: 6 }}
            name="rowStr"
            value={rowStr}
            onChange={this.onInputChange}
          />
        </FormItem>

        <FormItem {...formItemLayout} label="结果预览">
          {this.renderParsePreview(grokPattern, rowStr, parsePreview)}
        </FormItem>

        <FormItem {...tailFormItemLayout} className="alignright">
          <Button
            type="primary"
            size="default"
            loading={isUpdatingApp}
            disabled={_.isEmpty(parsePreview) || _.isError(parsePreview)}
            onClick={!_.isEmpty(parsePreview) && !_.isError(parsePreview) ? async () => {
              let typeDict = extractFieldType(grokPattern)
              let firstTimeDim = _.findKey(typeDict, t => t === 'date' || t === 'datetime')
              if (!firstTimeDim) {
                message.warn('至少要导入一个时间列')
                return
              }
              await this.updateLogApp('params', currParams => {
                return immutateUpdates(currParams,
                  'logVarType', lvt => lvt || 'nginx',
                  'grokPattern', gp => _.trim(gp || grokPattern),
                  'logFormat', lf => _.trim(lf),
                  'rowStr', s => _.trim(s),
                  'timeDimensionName', timeDim => timeDim && timeDim in typeDict ? timeDim : firstTimeDim
                )
              })
              await this.store.sync()
              this.setState({stepCurrent: 2})
            } : undefined}
          >下一步</Button>
        </FormItem>
      </Form>
    )
  }

  closeAnyPopover = () => this.setState({visiblePopoverKey: null})

  renderSettingTimeDimStep = () => {
    let {logApp, isUpdatingApp, visiblePopoverKey} = this.state
    let logAppParams = _.get(logApp, 'params') || {}
    let { grokPattern, timeDimensionName, dailyLogAmount, lock} = logAppParams
    let typeDict = extractFieldType(grokPattern)
    let timeColumns = _.keys(typeDict).filter(col => {
      let type = typeDict[col]
      return type === 'date' || type === 'datetime'
    })
    return (
      <Form className="shadow15-bbb border pd2y min-height500">
        <FormItem
          {...formItemLayout}
          label="时间列"
          required
          style={{marginTop: '130px'}}
        >
          <Select
            value={timeDimensionName}
            onChange={val => {
              this.updateLogApp('params.timeDimensionName', () => val)
            }}
            disabled={lock}
          >
            {timeColumns.map(col => {
              return (
                <Option key={col} value={col}>{col}</Option>
              )
            })}
          </Select>
        </FormItem>

        <FormItem {...formItemLayout} label="预估每天数据量">
          <InputNumber
            value={dailyLogAmount}
            className="width-100"
            placeholder="建议填写，如 100,000"
            min={0}
            step={1}
            disabled={lock}
            onChange={value => {
              this.updateLogApp('params.dailyLogAmount', () => value)
            }}
          />
          <div className="color-red">
            注意：填写“预估每天数据量”，查询性能会更好
          </div>
        </FormItem>

        <FormItem {...tailFormItemLayout} className="">
          <Button
            type="default"
            size="default"
            onClick={async () => {
              this.setState({stepCurrent: 1})
            }}
          >上一步</Button>
          <Button
            type="primary"
            size="default"
            className="fright"
            disabled={!timeDimensionName}
            onClick={timeDimensionName ? async () => {
              if (!lock) {
                this.setState({visiblePopoverKey: 'lockGrokExprHint'})
              } else {
                // 保存样例数据，并启动项目
                await this.store.sync()
                await this.store.syncDims(this.props.project)
                this.setState({stepCurrent: 3, importBy: 'sugo-c'})
              }
            } : undefined}
          >下一步</Button>

          {visiblePopoverKey === 'lockGrokExprHint' ? (
            <Modal
              wrapClassName="vertical-center-modal"
              title="准备创建维度..."
              visible={visiblePopoverKey === 'lockGrokExprHint'}
              onOk={this.closeAnyPopover}
              onCancel={this.closeAnyPopover}
              footer={[
                <Button key="back" onClick={this.closeAnyPopover}>返回检查</Button>,
                <Button
                  key="confirm"
                  type="primary"
                  loading={isUpdatingApp}
                  onClick={async () => {
                    if (!lock) {
                      try {
                        await this.updateLogApp('params.lock', () => true)
                        await this.store.sync()
                        await this.store.syncDims(this.props.project)
                      } catch (e) {
                        message.warn(e.message)
                        // 失败，解除锁定
                        try {
                          await this.updateLogApp('params.lock', () => false)
                          await this.store.sync()
                        } catch (e) {
                          // ignore
                        }
                        return
                      }
                    }
                    this.setState({stepCurrent: 3, importBy: 'sugo-c', visiblePopoverKey: null})
                  }}
                >确认</Button>
              ]}
            >
              <p>进入下一步后 grok 表达式不可再修改，是否确认？</p>
            </Modal>
          ) : null}
        </FormItem>
      </Form>
    )
  }

  renderImportDataStep = () => {
    let {importBy, preUploadFile, doneUploadFile, druidDataCheckerState} = this.state
    return (
      <Row className="height-100">
        <Col
          span={6}
          className="alignright pd26r"
          onClick={ev => {
            if (druidDataCheckerState === DruidDataCheckerStateEnum.checking || druidDataCheckerState === DruidDataCheckerStateEnum.waitingForRetry) {
              message.warn('检测采集器状态中，请稍后再试')
              return
            }
            if (preUploadFile && preUploadFile !== doneUploadFile) {
              message.warn('上传文件时无法切换标签，请上传完毕再试')
              return
            }
            let nextImportBy = ev.target.getAttribute('data-import-by')
            if (nextImportBy && nextImportBy !== importBy) {
              this.setState({importBy: nextImportBy, preUploadFile: null, doneUploadFile: null})
            }
          }}
        >
          <div
            data-import-by="sugo-c"
            className={classNames('itblock width180 corner aligncenter pd2 mg1b', {
              'border-purple color-purple': importBy === 'sugo-c',
              'border shadowb-eee fpointer': importBy !== 'sugo-c'
            })}
          >
            下载 Sugo-C 采集器
          </div>

          <div
            data-import-by="upload"
            className={classNames('itblock width180 corner aligncenter pd2 mg1t', {
              'border-purple color-purple': importBy === 'upload',
              'border shadowb-eee fpointer': importBy !== 'upload'
            })}
          >
            上传文件
          </div>
        </Col>
        <Col span={18} className="borderl pd26l height-100">
          {importBy === 'sugo-c' ? this.renderSugoCImportingPage() : this.renderUploadingPage()}
        </Col>
      </Row>
    )
  }

  gotoSourceDataAnalytic = () => {
    this.props.changeProject(this.props.project.id)
    browserHistory.push('/console/source-data-analytic')
  }

  renderSugoCImportingPage() {
    let {project} = this.props
    let {logApp} = this.state
    let {logDir, logFileRegex, dailyLogAmount} = _.get(logApp, 'params') || {}

    let {
      visiblePopoverKey, druidDataCheckerState, druidDataCheckerTryCount
    } = this.state
    return (
      <div
        className="height-100 border corner shadow15-bbb pd2y pd20x"
      >
        <div className="bg-gray pd2x pd1y relative" style={{height: 67}} >
          <p className="vertical-center-of-relative" style={{width: 'calc(100% - 32px)'}} >
            使用 Sugo-C 采集器采集数据，Sugo-C 是服务端日志文件采集器，俗称 Agent。它本身包括了数据上报策略，支持重发、压缩、过滤规则、单条记录大小。请在需要采集的每台服务器上进行部署。
          </p>
        </div>

        <div
          className="border corner overscroll-y"
          style={{
            height: 'calc(100% - 67px - 32px - 24px)', // 24 是 margin
            margin: '12px 0'
          }}
        >
          <Fetch
            url={`${window.sugo.cdn}/_bc/log-collector-npm/readme.html`}
          >
            {({data, isFetching, error})=>{
              if (isFetching) {
                return (
                  <div className="pd3 aligncenter font20 color-grey">加载中...</div>
                )
              }
              if (_.isEmpty(data)) {
                return (
                  <Alert msg="查无数据" />
                )
              }
              return (
                <article
                  className="pd2 markdown-body always-display-scrollbar-horizontal-all"
                  dangerouslySetInnerHTML={{__html: data}}
                />
              )
            }}
          </Fetch>
        </div>

        <div className="">
          <Button
            type="default"
            size="default"
            onClick={() => {
              this.setState({stepCurrent: 2, preUploadFile: null, doneUploadFile: null})
            }}
          >上一步</Button>
          <Button
            type="primary"
            size="default"
            className="mg1l"
            onClick={() => this.setState({visiblePopoverKey: 'downloadLogCollector'})}
          >下载</Button>

          <Button
            className="fright"
            type="primary"
            size="default"
            loading={druidDataCheckerState === DruidDataCheckerStateEnum.checking
              || druidDataCheckerState === DruidDataCheckerStateEnum.waitingForRetry}
            disabled={druidDataCheckerState === DruidDataCheckerStateEnum.hasData}
            onClick={() => this.setState({druidDataCheckerState: DruidDataCheckerStateEnum.checking, druidDataCheckerTryCount: 1})}
          >检测采集器状态</Button>

          {druidDataCheckerState === DruidDataCheckerStateEnum.hasData
            ? (
              <Button
                className="fright mg1r"
                type="default"
                size="default"
                onClick={this.gotoSourceDataAnalytic}
              >日志分析</Button>
            )
            : null }

          <BoundaryTimeFetcher
            dataSourceId={project.datasource_id}
            doFetch={druidDataCheckerState === DruidDataCheckerStateEnum.checking}
            doQueryMinTime={false}
            onTimeLoaded={data => {
              let {maxTime} = data || {}
              if (maxTime && moment(maxTime).isValid()) {
                message.info((
                  <div className="itblock">
                    已检测到数据上报，可以到<a href="javascript:" onClick={this.gotoSourceDataAnalytic}>日志分析</a>查看
                  </div>
                ), 5)
                this.setState({druidDataCheckerState: DruidDataCheckerStateEnum.hasData})
              } else if (druidDataCheckerTryCount < MaxDruidDataCheckerTryCount) {
                this.setState({
                  druidDataCheckerState: DruidDataCheckerStateEnum.waitingForRetry
                })
              } else {
                message.warn('没有检测到数据上报')
                this.setState({druidDataCheckerState: DruidDataCheckerStateEnum.idle})
              }
            }}
          >
            {()=>{
              if (druidDataCheckerState !== DruidDataCheckerStateEnum.waitingForRetry) {
                return null
              }
              return (
                <Timer
                  interval={DruidDataCheckerRetryInterval}
                  onTick={() => {
                    // 窗口失去焦点时暂停检测
                    if (document.hidden) {
                      return
                    }
                    this.setState({
                      druidDataCheckerState: DruidDataCheckerStateEnum.checking,
                      druidDataCheckerTryCount: druidDataCheckerTryCount + 1
                    })
                  }}
                />
              )
            }}
          </BoundaryTimeFetcher>

          <Modal
            wrapClassName="vertical-center-modal"
            title={
              <div>
                请填写采集日志数据的文件目录及文件名
                <HoverHelp
                  className="mg1l"
                  content={
                    <div>
                      <p>日志文件目录：被采集的日志所在的目录地址，请填写绝对地址。</p>
                      <p>日志文件名字：被采集的日志的文件名字，若为多个文件，可填写正则表达式来匹配。</p>
                    </div>
                  }
                />
              </div>
            }
            visible={visiblePopoverKey === 'downloadLogCollector'}
            footer={
              <div className="aligncenter">
                <a
                  target="_blank"
                  href={`/app/log-upload/log-collector/${logApp.id}?q=${compressUrlQuery(_.pickBy({logDir, logFileRegex}, _.identity))}`}
                  onClick={async () => {
                    await this.store.sync()
                    this.closeAnyPopover()
                  }}
                >
                  <Button key="submit" type="primary" size="large" disabled={!logDir}>
                    开始下载
                  </Button>
                </a>
              </div>
            }
            onOk={this.closeAnyPopover}
            onCancel={this.closeAnyPopover}
          >
            <Form>
              <FormItem {...formItemLayout} label="日志文件目录" required>
                <Input
                  value={logDir}
                  placeholder="未填写"
                  onChange={ev => {
                    let {value} = ev.target
                    this.updateLogApp('params.logDir', () => value)
                  }}
                />
              </FormItem>

              <FormItem {...formItemLayout} label="日志文件名">
                <Input
                  value={logFileRegex}
                  placeholder="支持正则表达式，默认为 .*\.log"
                  onChange={ev => {
                    let {value} = ev.target
                    this.updateLogApp('params.logFileRegex', () => value)
                  }}
                />
              </FormItem>

              <div className="color-red pd3x">
                注意：{this.getSegmentGranularity(dailyLogAmount) === 'DAY' ? '两天前' : '两小时前'}的数据为历史数据，不会马上落地，
                所以无法从日志分析查询到，您可以通过暂停项目触发历史数据落地。
              </div>
            </Form>
          </Modal>
        </div>
      </div>
    )
  }

  getSegmentGranularity(dailyLogAmount) {
    if (!_.isNumber(dailyLogAmount)) {
      dailyLogAmount = 100000000
    }
    if (dailyLogAmount <= 50000000) {
      return 'DAY'
    }
    return 'HOUR'
  }

  beforeUpload = (file) => {
    const isSmallEnough = file.size / 1024 / 1024 <= 100
    if (!isSmallEnough) {
      message.warn('文件不能大于 100 MB')
    } else if (file.size === 0) {
      message.warn('文件为空，请选择另外的文件')
    } else {
      this.alreadyHintForWillNotPersistent = false
      this.setState({preUploadFile: file, doneUploadFile: null})
    }
    return false
  }

  renderFilePicker() {
    return (
      <div className="center-of-relative aligncenter">
        <img
          className="itblock"
          src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/log-project/pick-file.png`}
        />
        <div className="mg2t font13" style={{color: '#595959'}}>
          <Upload
            showUploadList={false}
            beforeUpload={this.beforeUpload}
          >
            <Button type="primary" size="default">上传数据文件</Button>
          </Upload>
        </div>
      </div>
    )
  }

  renderUploadingProgress = ({data: linesData, error: readError, readingProgress, readerState, readNextPart}) => {
    let {preUploadFile, logApp} = this.state

    let url = `${window.sugo.collectGateway}/safe/post?locate=${this.props.project.datasource_name}&token=${logApp.id}`

    let {grokPattern, timeDimensionName, dailyLogAmount} = logApp.params

    // debug('read lines:', linesData && linesData.length)
    let {succRes, errRes} = parseMultiRow(grokPattern, linesData) || {}

    let preUploadObjs = _.orderBy(_.keys(succRes), _.toNumber).map(idx => succRes[idx])
    let succCount = preUploadObjs.length, errCount = _.keys(errRes).length
    // 日志上报格式：转换数据到 JSON，用换行符分割
    let bigStr = preUploadObjs.map(o => JSON.stringify(o)).join('\n')

    // debug(`parse succ: ${succCount}, fail: ${errCount}, postStr length: ${bigStr.length}`)

    return (
      <Poster
        ref={ref => this._fileUploader = ref}
        url={url}
        // doFetch={!_.isEmpty(preUploadObjs)} 内容为空时，不进行发送，但为了触发 onData，仍然需要调用 fetch
        params={{
          credentials: 'omit', // 忽略cookie的发送
          body: bigStr, // 发送到网关，无须压缩
          timeout: 50000
        }}
        headers={{
          'Content-Type': 'text/plain',
          'Accept': 'text/plain'
        }}
        fetchMethod={async (url, data, opts) => {
          if (opts.body) {
            return await FetchFinal.post(url, data, opts)
          }
          // 内容为空时，不进行发送，但为了触发 onData，仍然需要调用 fetch
          return 'ok'
        }}
        body={{readingProgress}} // 传输 readingProgress 是为了避免两次数据一样，而不触发上传
        onData={postToDruidRes => {
          if (0 < succCount && postToDruidRes !== '200' && postToDruidRes !== 'ok') {
            this.setState({doneUploadFile: preUploadFile})
            this._fileUploader._fetcher.setState({error: `上报数据到网关失败：${postToDruidRes}`}) // 为了跳到错误界面
            return
          }
          this._fileUploader.setState(prevState => {
            return {
              succCountStat: (prevState.succCountStat || 0) + succCount,
              errCountStat: (prevState.errCountStat || 0) + errCount
            }
          })

          // 判断数据是否落地，提醒用户
          let [min, max] = extent(preUploadObjs.map(o => o[timeDimensionName]))
          let seqGr = this.getSegmentGranularity(dailyLogAmount)
          let willNotPersistent = moment(max).isBefore(moment().add(-2, seqGr))

          if (willNotPersistent && !this.alreadyHintForWillNotPersistent) {
            this.alreadyHintForWillNotPersistent = true
            notification.warn({
              message: '提示',
              key: 'willNotPersistentHint',
              description: (
                <div className="mw300 animate wordbreak" >
                  <p>因为现在上传的数据是历史数据，所以可能不会马上落地，从而会导致无法查询到该数据的情况。</p>
                  <p>如果确实需要查看刚刚导入的数据，可以暂停项目，这将会触发历史数据落地。</p>
                </div>
              ),
              duration: 20
            })
          }
          if (readerState === LocalFileLinesReaderStateEnum.done) {
            let {succCountStat, errCountStat} = this._fileUploader.state
            if (!succCountStat) {
              this._fileUploader._fetcher.setState({error: '没有一条匹配成功'}) // 为了跳到错误界面
            }
            notification.info({
              message: '提示',
              key: 'uploadStatHint',
              description: (
                <div className="mw300 animate wordbreak" >
                  <p>上报成功: {succCountStat} 条；</p>
                  <p>上报失败: {errCountStat} 条{0 < errCountStat ? '，失败原因：数据格式与 grok 表达式不匹配' : ''}。</p>
                </div>
              ),
              duration: 20
            })
            this.setState({doneUploadFile: preUploadFile})
          } else {
            readNextPart()
          }
        }}
        onError={err => {
          this.setState({doneUploadFile: preUploadFile})
          // 由于其他原因的失败
          let msg = _.isError(err)
            ? err.message
            : _.isObject(err) ? JSON.stringify(err) : (err || '未知原因，请联系管理员')
          notification.info({
            message: '上传失败',
            key: 'uploadFailHint',
            description: (
              <div className="mw300 animate wordbreak" >
                <p>{msg}</p>
              </div>
            ),
            duration: 20
          })
        }}
      >
        {({isFetching: isUploading, data: uploadRes, error: uploadError})=>{
          let uploadState = readError || uploadError
            ? LogUploadState.error
            : (!isUploading && readerState === LocalFileLinesReaderStateEnum.done)
              ? LogUploadState.done : LogUploadState.uploading
          return (
            <div className="height-100 pd2x">
              <div className="height200 relative">
                <div className="center-of-relative">
                  <Icon2
                    className={classNames('font50', {
                      'color-green': uploadState === LogUploadState.done,
                      'color-red': uploadState === LogUploadState.error
                    })}
                    type={LogUploadStateIcon[uploadState]}
                  />
                  <div className="pd1y">
                    {LogUploadStateHint[uploadState]}
                  </div>
                </div>
              </div>
              <div>文件名称：{preUploadFile.name}</div>
              <FixWidthHelper
                toFix="last"
                toFixWidth="50px"
              >
                <Progress
                  percent={readingProgress * 100}
                  showInfo={false}
                  status={
                    uploadState === LogUploadState.uploading
                      ? 'active'
                      : uploadState === LogUploadState.error ? 'exception' : 'success'
                  }
                />
                <span className="ant-progress-text">{percentFormat(readingProgress)}</span>
              </FixWidthHelper>

              {uploadState === LogUploadState.uploading
                ? (
                  <div className="aligncenter mg3t">
                    <Button
                      type="default"
                      onClick={() => {
                        this.setState({preUploadFile: null})
                      }}
                    >终止上传</Button>
                  </div>
                ) : null}

              {uploadState === LogUploadState.done
                ? (
                  <div className="aligncenter mg3t">
                    <Link to="/console/project">
                      <Button type="default">查看项目列表</Button>
                    </Link>
                    <Button
                      type="default"
                      className="mg2l"
                      onClick={() => {
                        this.props.changeProject(this.props.project.id)
                        browserHistory.push('/console/source-data-analytic')
                      }}
                    >日志分析</Button>
                  </div>
                )
                : null}

              {uploadState === LogUploadState.error
                ? (
                  <div className="aligncenter mg3t">
                    <Button
                      type="default"
                      onClick={() => {
                        this.setState({preUploadFile: null})
                      }}
                    >重新上传</Button>
                  </div>
                )
                : null}
            </div>
          )
        }}
      </Poster>
    )
  }

  renderUploadingPage() {
    let {preUploadFile, logApp} = this.state
    let {dailyLogAmount} = _.get(logApp, 'params') || {}
    return (
      <div className="height500 border corner shadow15-bbb pd1t pd3b pd2x">
        <div
          className="relative"
          style={{height: 'calc(100% - 100px)'}}
        >
          {preUploadFile
            ? (
              <LocalFileLinesReader
                file={preUploadFile}
                children={this.renderUploadingProgress}
              />
            )
            : this.renderFilePicker()}
        </div>
        <div className="height100 pd3x pd2t bordert dashed">
          <h3>说明：</h3>
          <p className="color-999">1、支持上传任意格式的文本文件</p>
          <p className="color-999">2、文件大小不超过 100M</p>
          <p className="color-999">3、{this.getSegmentGranularity(dailyLogAmount) === 'DAY' ? '两天前' : '两小时前'}的数据为历史数据，不会马上落地，
            所以无法从日志分析查询到，您可以通过暂停项目触发历史数据落地。</p>
        </div>
      </div>
    )
  }

  render() {
    let {stepCurrent} = this.state
    const extra = (
      <a
        href={helpLink}
        target="_blank"
        className="color-grey pointer"
        title="查看帮助文档"
      >
        <Icon2 type="question-circle"/>
      </a>
    )
    return (
      <div className="height-100 overscroll-y bg-white access-sdk access-collector">
        <Bread
          path={[
            { name: '项目管理', link: '/console/project' },
            { name: '日志接入' }
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
          className="mg-auto mw-70 pd2x pd2b"
          style={stepCurrent === 3 ? {height: 'calc(100% - 142px)'} : undefined}
        >
          {stepCurrent === 1 ? this.renderExamDataStep() : null}
          {stepCurrent === 2 ? this.renderSettingTimeDimStep() : null}
          {stepCurrent === 3 ? this.renderImportDataStep() : null}
        </div>
      </div>
    )
  }
}
