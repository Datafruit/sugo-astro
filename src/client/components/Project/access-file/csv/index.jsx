/**
 * @file csv接入相关视图，包括
 * 1. csv解析配置及预览
 * 2. 上报维度选择
 * 3. 上传csv
 */

import React, { Component } from 'react'
import { Link, browserHistory } from 'react-router'
import {
  Button, InputNumber, message, notification, Select, Table, Tooltip,
  Progress, Modal, Upload, Icon, Radio, Popconfirm, DatePicker
} from 'antd'
import Steps from '../../../Common/access-steps'
import Store from './store'
import commonDecs from '../entry/common-function'

@commonDecs
export default class Main extends Component {

  static sendParserMessage ({ no, title, content, message }) {
    Modal.error({
      title: title,
      content: (
        <div>
          <p>错误行号：{no}</p>
          <p>{message}</p>
          <div className="pd1b">
            <p>该行内容：</p>
            <p style={{ overflow: 'auto' }}>
              {content}
            </p>
          </div>
        </div>
      )
    })
  }

  /**
   * @param {FileParserMessage} desc
   */
  static sendCsvColumnMessage (desc) {
    const { no, titles, fields } = desc

    Modal.error({
      title: '列数量与列名数量不符',
      content: (
        <div>
          <p>列数量与列名数量必须相同，请检查文件内容或重试。</p>
          <p>错误行号：{no}</p>
          <div className="pd1b">
            <p>列名：</p>
            <p style={{ overflow: 'auto' }}>
              {JSON.stringify(titles)}
            </p>
          </div>
          <div className="pd1b">
            <p>该行解析结果：</p>
            <p style={{ overflow: 'auto' }}>
              {JSON.stringify(fields)}
            </p>
          </div>
        </div>
      )
    })
  }

  static sendNetworkMessage () {
    notification.error({
      duration: 60 * 60 * 24,
      message: '网络错误,请稍后再试',
      description: '您的网络连接可能存在问题,请检查你的网络情况。'
    })
  }

  /**
   * @param {Array<String>} diff
   */
  static sendDiffDimensionTypeMessage (diff) {
    Modal.warn({
      title: '维度数据类型异常',
      content: (
        <div>
          <p>以下维度的数据类型与现有数据不一致，导入时将会被忽略。</p>
          <div className="pd2t">{diff.join('、')}</div>
        </div>
      )
    })
  }

  /**
   * @param {String} message
   * @param {String} content
   */
  static sendFaultDimensionNameMessage (message, content) {
    Modal.error({
      title: '维度名不合规则或分隔符有误',
      content: (
        <div>
          <p>{message}</p>
          <div
            className="pd2y"
            style={{ wordBreak: 'break-all' }}
          >
            {content}
          </div>
          <p className="color-lighten">
            维度名可使用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位。
            且不能为 <span className="color-red">__time</span> 系统保留维度名。
          </p>
        </div>
      )
    })
  }

  static propTypes = {
    file: props => {
      if (!(props.file instanceof File)) {
        throw new Error('props.file must a File')
      }
    },
    project: React.PropTypes.object.isRequired,
    analysis: React.PropTypes.object.isRequired
  }

  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    /** @type {CsvAccessorState} */
    this.state = this.store.getState()
    this.store.subscribe(state => this.setState(state))
  }

  componentWillMount () {
    const { file, project, analysis } = this.props
    this.store.init(project, analysis, file)
  }

  componentWillReceiveProps (nextProps) {
    const { file } = nextProps
    this.store.setFile(file)
  }

  componentDidUpdate () {
    const {
      column,
      parser,
      network,
      faultDimensionName,
      diffDimensionType,
      duplicateDimensionName,
      normal
    } = this.state.message

    if (parser) {
      Main.sendParserMessage(parser)
    }

    if (column) {
      Main.sendCsvColumnMessage(column)
    }

    if (network) {
      Main.sendNetworkMessage()
    }

    if (faultDimensionName) {
      Main.sendFaultDimensionNameMessage(
        '以下维度名称非法',
        faultDimensionName.join('、')
      )
    }

    if (duplicateDimensionName) {
      Main.sendFaultDimensionNameMessage(
        '以下维度名重复',
        duplicateDimensionName.join('、')
      )
    }

    if (diffDimensionType) {
      Main.sendDiffDimensionTypeMessage(diffDimensionType)
    }

    if (normal) {
      message.warn(normal)
    }
  }

  redirect () {
    const { Project: { id, datasource_id } } = this.state
    const { changeProject } = this.props
    changeProject(id, datasource_id)
    browserHistory.push('/console/analytic')
  }

  /**
   * 生成csv解析引擎配置界央
   * @return {ReactElement}
   */
  renderParserConf () {
    const {
      file,
      startImportAtRow,
      separator,
      separator_keys,
      quotation,
      quotation_keys
    } = this.state.vm

    return (
      <div>
        <div>
          <strong className="iblock pd1r">文件名称：</strong>
          <span>{file.name}</span>
          <div className="iblock pd2l">
            <Upload
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              multiple={false}
              beforeUpload={file => this.beforeUpload(file)}
            >
              <Button
                size="small"
                type="primary"
                icon="upload"
              >重新选择</Button>
            </Upload>
          </div>
        </div>
        <div className="pd2t fix">
          <div className="fleft width180">
            <span className="pd1r line-height30">导入启始行：</span>
            <InputNumber
              value={startImportAtRow}
              onChange={v => {
                // TODO 移到Validate
                if (v !== ~~v || v < 1) {
                  return message.error('行号须为正整数，并且大于0')
                }
                this.store.setStartImportAtRow(v)
              }}
            />
          </div>
          <div className="fleft width180">
            <span className="pd1r line-height30">列分隔符：</span>
            <Select
              dropdownMatchSelectWidth={false}
              className="width100"
              value={separator}
              onChange={name => this.store.setSeparator(name)}
            >
              {
                separator_keys.map(name => (
                  <Select.Option key={name} value={name}>
                    {name}
                  </Select.Option>
                ))
              }
            </Select>
          </div>
          <div className="fleft width180">
            <span className="pd1r line-height30">引用标识：</span>
            <Select
              dropdownMatchSelectWidth={false}
              className="width100"
              value={quotation}
              onChange={name => this.store.setQuotation(name)}
            >
              {
                quotation_keys.map(name => (
                  <Select.Option key={name} value={name}>
                    {name}
                  </Select.Option>
                ))
              }
            </Select>
          </div>
        </div>
      </div>
    )
  }

  /**
   * 生成csv解析后的预览数据表格
   * @return {ReactElement}
   */
  renderFileData () {
    const { lines } = this.state.vm
    const columns = this.columnsCreator()
    const operationColumnWidth = 100
    const x = columns.reduce((a, b) => a + b.width, 0) + operationColumnWidth * 2

    return (
      <div className="pd2t">
        <Table
          operationColumnWidth={operationColumnWidth}
          scroll={{ x, y: 300 }}
          bordered
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={{ defaultPageSize: 6 }}
        />
      </div>
    )
  }

  /**
   * 生成Table组件columns属性值
   * @return {Array<Object>}
   */
  columnsCreator () {

    const { dimensions, dimensionTypes } = this.state.vm
    const store = this.store
    const width = 120
    const columns = dimensions.map((d, i) => {
      const { name, type, fault, diff } = d

      const selector = (
        <Select
          defaultValue={type}
          className={(diff || fault) ? 'has-error' : ''}
          style={{ width: 80 }}
          onChange={type => store.setDimensionType(i, type)}
          placeholder="类型"
          size="small"
        >
          {
            dimensionTypes.map(typeName => (
              <Select.Option value={typeName} key={typeName}>
                {typeName}
              </Select.Option>
            ))
          }
        </Select>
      )

      return {
        width,
        key: name,
        editable: true,
        dataIndex: name,
        title: (
          <div>
            {
              (diff || fault) ? (
                <Tooltip
                  title={
                    <div>
                      {diff ? (
                        <p>
                          所选维度类型与已存在的类型不一致，上传数据时将忽略该列内容
                        </p>
                      ) : null}
                      {fault ? (
                        <p>
                          非法列名：可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
                        </p>
                      ) : null}
                    </div>
                  }
                  overlayStyle={{ width }}
                  arrowPointAtCenter
                >
                  <div>{selector}</div>
                </Tooltip>
              ) : selector
            }
          </div>
        ),
        render: (text) => {
          return text
        }
      }
    })

    columns.unshift({
      width: 80,
      key: 'key',
      title: '数据格式',
      dataIndex: 'key',
      editable: false
    })

    return columns
  }

  /**
   * 1. 时间列选择
   * 2. 上报维度选择
   * 当文件解析后再生成
   * @return {XML}
   */
  renderDimensionsSelector () {
    const {
      dimensions,
      selectDimensions,
      timeDimensions,
      timeColumn,
      since,
      until,
      scanning,
      scanProcess
    } = this.state.vm

    if (dimensions.length === 0) return null

    return (
      <div className="pd2t">
        <div>
          <div className="fix">
            <div className="fleft width120 line-height30">设置主时间字段：</div>
            <div className="fleft width300">
              <Select
                allowClear
                placeholder="请选择"
                dropdownMatchSelectWidth={false}
                className="iblock width120"
                value={timeColumn}
                onChange={name => this.store.setTimeColumn(name)}
              >
                {
                  timeDimensions.map(d => (
                    <Select.Option key={d.name} value={d.name}>
                      {d.name}
                    </Select.Option>
                  ))
                }
              </Select>
              <span className="iblock pd2l line-height30">数据格式必须为 date</span>
              <Tooltip title={(
                <div>
                  <p>如果指定的时间列中的时间小于当前系统时间</p>
                  <p>
                    需要在上传完成后执行
                    <span className="color-green pd1x">暂停项目数据接入</span>
                    之后才能使用数据
                  </p>
                </div>
              )}
              >
                <Icon type="question-circle" className="mg1l"/>
              </Tooltip>
            </div>
          </div>
        </div>
        {
          timeColumn ? (
            <div className="pd1t">
              <div className="fix">
                <div className="fleft width120 line-height30">时间范围选择：</div>
                <div className="fleft width300">
                  <DatePicker.RangePicker
                    value={[since, until]}
                    onChange={([since, until]) => {
                      this.store.setTimeRange(since, until)
                    }}
                  />
                </div>
                <div className="fleft mg2l">
                  <Popconfirm
                    placement="top"
                    title={(
                      <div>
                        <p>自动计算会有一定的误差,但不会影数据上报流程</p>
                        <p>你可以在计算完成后对结果进行修正</p>
                      </div>
                    )}
                    onConfirm={() => this.store.scanTimeRange()}
                  >
                    {
                      window.Worker !== void 0 ? (
                        <Button
                          disabled={scanning}
                          loading={scanning}
                          type="default"
                        >
                          {scanning ? `计算进度: ${scanProcess}%` : '自动计算'}
                        </Button>
                      ) : null
                    }
                  </Popconfirm>
                </div>
              </div>
            </div>
          ) : null
        }
        <div className="pd1t">
          <div className="pd1b">
            选择导入数据列：
            <div className="iblock pd2l">
              <Radio.Group
                onChange={e => this.store.selectAllDimensions(e.target.value)}
                value={selectDimensions.length === dimensions.length}
              >
                <Radio value={true}>全选</Radio>
                <Radio value={false}>全不选</Radio>
              </Radio.Group>
            </div>
          </div>
          <div className="pd1b">
            {
              dimensions.map(d => {
                let { name } = d
                let type = selectDimensions.includes(name)
                  ? 'success'
                  : 'ghost'
                return (
                  <Button
                    size="small"
                    key={name}
                    type={type}
                    value={name}
                    className="mg1r mg1b"
                    onClick={() => this.store.selectDimension(name)}
                  >
                    {name}
                  </Button>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }

  /**
   * 已选择的维度数量大于0时，显示上传维度按钮。
   * 开始上传时显示上传进度
   * @return {XML}
   */
  renderPostData () {
    const { dimensions, timeColumn, selectDimensions, progress, since, until } = this.state.vm

    if (dimensions.length === 0) return null

    const completed = progress === 100
    const disabled = progress > 0 || completed
    const valid_since = timeColumn ? (since && since.isValid()) : true
    const valid_until = timeColumn ? (until && until.isValid()) : true

    return (
      <div className="pd2t">
        <Button
          type="primary"
          size="default"
          disabled={selectDimensions.length === 0 || disabled || !valid_since || !valid_until}
          loading={progress > 0 && progress < 100}
          onClick={() => this.store.postData()}
        >
          开始导入
        </Button>
        {
          progress > 0 ? (
            <div className="pd1t">
              <Progress
                percent={progress}
                status={completed ? 'success' : 'active'}
              />
            </div>
          ) : null
        }
        {
          completed ? (
            <div className="pd1t">
              <Link to="/console/project">
                <Button className="mg1r" type="ghost">查看项目列表</Button>
              </Link>
              <Button
                type="ghost"
                onClick={() => this.redirect()}
              >多维分析</Button>
            </div>
          ) : null
        }
      </div>
    )
  }

  renderSteps = () => {
    const { progress } = this.state.vm
    let current = progress < 100
      ? 2
      : 3
    return (
      <Steps
        current={current}
        className="bg-white pd2 mg2b borderb"
      />
    )
  }

  render () {
    const { file } = this.state.vm

    if (file === null) return null

    return (
      <div className="pd2b">
        {this.renderSteps()}
        {this.renderParserConf()}
        {this.renderFileData()}
        {this.renderDimensionsSelector()}
        {this.renderPostData()}
      </div>
    )
  }
}

