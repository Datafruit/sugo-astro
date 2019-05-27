/**
 * Created on 15/03/2017.
 */

import React, { PropTypes } from 'react'
import { Form, Select, Button, message, Icon } from 'antd'
import Fetch from '../../common/fetch-final'
import { Scene } from '../RFM/interface'
import { SceneType, DIMENSION_TYPES } from '../../../common/constants'
import {checkPermission} from '../../common/permission-control'

const canConfigRFMDims = checkPermission('post:/app/datasource/config-rfm-dims')

class SceneDataRFM extends React.Component {
  
  static defaultProps = {
    dimensions: [],
    projects: [],
    project: {},
    onProjectChange: () => {}
  }
  
  static propTypes = {
    dimensions: PropTypes.array.isRequired,
    projects: PropTypes.array.isRequired,
    project: PropTypes.object.isRequired
  }
  
  constructor (props, context) {
    super(props, context)
    this.state = {
      record: null,
      Date: null,
      Price: null,
      UserID: null
    }
  }
  
  componentWillMount () {
    const { project } = this.props
    if (project.id) {
      this.fetchScene(project.id)
    }
  }
  
  componentWillReceiveProps (nextProps) {
    const { project:cur } = this.props
    const { project:next } = nextProps
    if (next.hasOwnProperty('id') && cur.id !== next.id) {
      this.fetchScene(next.id)
    }
  }

  fetchScene (project_id) {
    Fetch.get(Scene.getSceneOfProjects, { projects: [project_id] })
      .then(res => {
        if (!res) return message.error('请求接口出错，请稍后再试')
        const ret = res.result
        
        if (!ret.success) return message.error(ret.message)
        const record = ret.result[0]
        
        if (record) {
          this.setState({ record, ...record.params })
          this.props.form.setFieldsValue({ ...record.params })
        } else {
          this.setState({ record: null })
          this.reset()
        }
      })
  }
  
  onPropsChange (n, v) {
    this.setState({ [n]: v })
  }
  
  onSubmit () {
    const { form:{ validateFields } } = this.props
    validateFields((err, values) => {
      if (!err) {
        const { project } = this.props
        const { ...other } = values
        const { record } = this.state
        
        Fetch.post(record ? Scene.update : Scene.create, {
          id: record ? record.id : void 0,
          project_id: project.id,
          type: SceneType.RFM,
          params: { ...other }
        }).then(res => {
          if (!res) return message.error('请求接口出错，请稍后再试')
          
          const ret = res.result
          if (!ret.success) return message.error(ret.message)
          
          this.setState({ record: ret.result, ...ret.params })
          
          message.success(`${record ? '更新' : '创建'}成功`)
        })
      }
    })
  }
  
  reset () {
    this.props.form.setFieldsValue({ Date: null, Price: null, UserID: null })
    this.setState({ Date: null, Price: null, UserID: null })
  }
  
  render () {
    const { dimensions, form:{ getFieldDecorator } } = this.props
    const { Date, Price, UserID } = this.state
    const generateDimensionsSelector = (prop) => {
      let dim = dimensions
      if (prop === 'Date') {
        dim = dimensions.filter(d => d.type === DIMENSION_TYPES.date)
      }
      if (prop === 'Price') {
        dim = dimensions.filter(d => {
          return d.type === DIMENSION_TYPES.long ||
            d.type === DIMENSION_TYPES.int ||
            d.type === DIMENSION_TYPES.float
        })
      }
      
      if (prop === 'UserID') {
        dim = dimensions.filter(d => d.type === DIMENSION_TYPES.string)
      }
      
      return (
        <Select
          dropdownMatchSelectWidth={false}
          onChange={v => this.onPropsChange(prop, v)}
        >
          {dim.map(d => {
            return (
              <Select.Option key={d.id} value={d.id}>
                {d.title || d.name}
              </Select.Option>
            )
          })}
        </Select>
      )
    }
    const layout = {
      labelCol: { span: 10 },
      wrapperCol: { span: 12 }
    }
    return (
      <div className="height-100 bg-white">
        <div className="datasource-setting">
          {
            //分割线
            <div className="split-line" />
          }
          <div className="left fleft">
            <div className="height-100" style={{ padding: 80 }}>
              <Form style={{ padding: '20px 40px' }}>
                <Form.Item label="选择购买日期维度" {...layout} hasFeedback>
                  {getFieldDecorator(
                    'Date',
                    {
                      initialValue: Date,
                      rules: [{ required: true, message: '必填项' }]
                    }
                  )(generateDimensionsSelector('Date')
                  )}
                </Form.Item>
                <Form.Item label="选择购买金额维度" {...layout} hasFeedback>
                  {getFieldDecorator(
                    'Price',
                    {
                      initialValue: Price,
                      rules: [{ required: true, message: '必填项' }]
                    }
                  )(generateDimensionsSelector('Price')
                  )}
                </Form.Item>
                <Form.Item label="选择客户ID维度" {...layout} hasFeedback>
                  {getFieldDecorator(
                    'UserID',
                    {
                      initialValue: UserID,
                      rules: [{ required: true, message: '必填项' }]
                    }
                  )(generateDimensionsSelector('UserID')
                  )}
                </Form.Item>
              </Form>
              <hr />
              <div className="aligncenter">
                <Button
                  className="mg2r"
                  icon="close-circle-o"
                  onClick={() => this.reset()}
                >
                  重置
                </Button>
                <Button
                  type="success"
                  icon="check"
                  onClick={() => this.onSubmit()}
                  disabled={!canConfigRFMDims}
                  title={canConfigRFMDims ? undefined : '您无权限进行设置，请联系管理员'}
                >
                  提交
                </Button>
              </div>
            </div>
          </div>
          <div className="right autocscroll-setting">
            <div className="pd2l">
              <div className="mg2t">
                <Icon type="question-circle-o" className="mg1l mg1r" />
                RFM数据设置说明
              </div>
              <div className="mg2t">
                <p className="mg1b">Q1.设置RFM数据的用处</p>
                <p className="mg1b">设置RFM数据是设置该项目要接入的数据源，用于在做数据分析的时候使用已接入的数据进行分析，而本次针对的是RFM模型，设置相应的维度，后台即可自动统计出相应的R、F、M值。</p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q2.设置RFM数据的各字段说明</p>
                <p className="mg1b">1.客户ID:客户ID是用来做唯一性的标识，可同时设置多个识别用户唯一性的字段，包括用户ID、设备ID、电话、邮箱等。该字段主要是涉及识别该用户。</p>
                <p className="mg1b">2.交易时间维度：指用户支付该商品的时间，主要用来统计最近一次消费的相隔时间、消费频率；</p>
                <p className="mg1b">3.交易金额维度：指用户支付该商品所花费的金额，主要用来统计该用户某时间段内累计消费金额。<strong className="color-green">维度类型必须为 int、long 或 float</strong></p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q3.RFM场景举例</p>
                <p className="mg1b">根据美国数据库营销研究所Arthur Hughes的研究，客户数据库中有三个神奇的要素，这三个要素构成了数据分析最好的指标：</p>
                <ul>
                  <li className="pd2l"><strong className="color-green">最近一次消费(Recency)</strong></li>
                  <li className="pd2l"><strong className="color-green">消费频率(Frequency)</strong></li>
                  <li className="pd2l"><strong className="color-green">消费金额(Monetary)</strong></li>
                </ul>
                <p className="mg1b mg1t">RFM模型是衡量客户价值和客户创利能力的重要工具和手段。该模型通过一个客户的近期购买行为、购买的总体频率以及花了多少钱三项指标来描述该客户的价值状况。</p>
                <p className="mg1b">该模型十分适合用于销售多种商品的企业，且这些企业的商品单价相对不高，如消费品、化妆品、衣服、超市等，同时，对于加油站、旅行保险、证券、电信、银行等行业也很适用。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Form.create()(SceneDataRFM)
