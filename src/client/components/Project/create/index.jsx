/**
 * @file 创建项目视图
 */

import { Component } from 'react'
import { Form, Button, Input, message } from 'antd'
import { validateFieldsAndScroll } from '../../../common/decorators'
import Bread from '../../Common/bread'
import Loading from '../../Common/loading'
import { AccessDataType } from '../constants'
import Store from './store'
import helpLinkMap from 'common/help-link-map'
import '../style.styl'
import Steps from '../../Common/access-steps'
import { collectorStepsTitles } from '../access-collector/index'
import Icon from '../../../components/Common/sugo-icon'
import SdkFormItem from './sdkform-item'
import { browserHistory } from 'react-router'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/project/create']

const hasSourceDataAnalyticMenu = _.some(window.sugo.menus, m => {
  return _.some(m.children, c => c.path === '/console/source-data-analytic')
})

const {
  enableMySQLAccess = false
} = window.sugo

/** 是否含有用户画像菜单 */
const hasTagDictMenu = _.some(window.sugo.menus, m => {
  return _.some(m.children, c => c.path === '/console/tag-dict')
})

@Form.create()
@validateFieldsAndScroll
export default class MainCreate extends Component {

  constructor(props, context) {
    super(props, context)
    const store = new Store().subscribe(state => this.setState(state))
    this.state = store.getState()
    this.store = store
  }

  componentDidMount() {
    this.store.init()
  }

  componentDidUpdate() {
    const { Project } = this.state
    if (Project.message) {
      message.destroy()
      message.warn(Project.message)
    }
  }

  componentWillUnmount() {
    this.store = null
  }

  renderSteps = () => {
    let props = {}
    if (this.state.ViewModel.type === AccessDataType.SDK) {
      props.steps = [
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
    } else if (this.state.ViewModel.type === AccessDataType.Log) {
      props.steps = collectorStepsTitles.map(title => ({ title }))
    }
    return (
      <Steps {...props} />
    )
  }

  /**
   * @description 渲染创建項目的接入方式
   * @returns
   * @memberOf MainCreate
   */
  renderAccessData() {
    const {
      state: { ViewModel },
      store
    } = this

    return (
      <div className="access-type" style={{width: '550px'}}>
        <div
          onClick={() => store.setAccessType(AccessDataType.File)}
          className={`access-type-item${ViewModel.type === AccessDataType.File ? ' active' : ''}`}
        >
          <div className="access-icon-box">
            <Icon type="file-text" />
          </div>
          <div className="access-text-box">文件导入</div>
        </div>
        <div
          onClick={() => store.setAccessType(AccessDataType.SDK)}
          className={`access-type-item${ViewModel.type === AccessDataType.SDK ? ' active' : ''}`}
        >
          <div className="access-icon-box">
            <Icon type="android" />
          </div>
          <div className="access-text-box">SDK导入</div>
        </div>
        {!hasSourceDataAnalyticMenu ? null : (
          <div
            onClick={() => store.setAccessType(AccessDataType.Log)}
            className={`access-type-item${ViewModel.type === AccessDataType.Log ? ' active' : ''}`}
          >
            <div className="access-icon-box">
              <Icon type="sugo-log font30" />
            </div>
            <div className="access-text-box">日志导入</div>
          </div>
        )}
        {!hasTagDictMenu ? null : (
          <div
            onClick={() => store.setAccessType(AccessDataType.Tag)}
            className={`access-type-item${ViewModel.type === AccessDataType.Tag ? ' active' : ''}`}
          >
            <div className="access-icon-box">
              <Icon type="tags font30" />
            </div>
            <div className="access-text-box">标签导入</div>
          </div>
        )}
        {!enableMySQLAccess ? null : (
          <div
            onClick={() => store.setAccessType(AccessDataType.MySQL)}
            className={`access-type-item${ViewModel.type === AccessDataType.MySQL ? ' active' : ''}`}
          >
            <div className="access-icon-box">
              <Icon type="database font30" />
            </div>
            <div className="access-text-box">MySQL 表查询</div>
          </div>
        )}
      </div>
    )
  }

  renderTable() {
    const {
      state: {
        ViewModel: { name, type },
        validate,
        loading
      },
      store
    } = this

    const disable = name === null || !!validate.name || loading.project

    return (
      <div>
        {this.renderSteps()}
        <div className='mg-auto relative bg-white pd2 mg2b' style={{maxWidth: '710px'}}>
          <div className="fix pd3t">
            <div className="fleft width120 pd1r alignright line-height30">
              <strong>项目名称：</strong>
            </div>
            <div className="fleft width250">
              <Input
                placeholder="请输入项目名称"
                value={name}
                onChange={e => store.setName(e.target.value.trim())}
              />
              {
                validate.name ? (
                  <p className="color-red">{validate.name}</p>
                ) : null
              }
            </div>
          </div>
          <div className="pd2t fix">
            <div className="fleft width120 pd1r alignright line-height30">
              <strong>数据接入方式：</strong>
            </div>
            <div className="fleft">
              {this.renderAccessData()}
            </div>
          </div>
          <div className="pd2t fix">
            {type === AccessDataType.SDK && window.sugo.disableSdkProjectCustomToken
              ? this.renderDiySdkForm()
              : null
            }
            {type === AccessDataType.Tag
              ? this.renderDiyTagForm()
              : null
            }
            {
              //参照旧代码,用来挤按钮位置的
                <div className="fleft width120 pd1r alignright line-height30">
                &nbsp;
              </div>
            }
            <div className="fleft">
              <Button
                disabled={disable}
                className="pd3x"
                type="primary"
                loading={loading.project}
                onClick={async () => {
                  if (type === AccessDataType.SDK || type === AccessDataType.Tag) {
                    let params = await this.validateFieldsAndScroll()
                    if (!params) return message.error('请完善表单')
                    let resValues = _.compact(_.uniq(Object.values(params)))
                    let query = {
                      params,
                      name,
                      type
                    }
                    if (!_.isEmpty(resValues)) {
                      if(type === AccessDataType.SDK) {
                        let res = await Fetch.post('/app/project/diy-sdk', query)
                        if (!res.success) {
                          return message.warn(res.message)
                        }
                        return  browserHistory.push(`/console/project/${res.result}`)
                      }
                      if (type === AccessDataType.Tag) {
                        return store.nextStep(params)
                      }
                    }
                  } 
                  store.nextStep()
                }}
              >下一步</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderDiySdkForm() {
    const { getFieldDecorator, setFieldsValue } = this.props.form
    const formItemArr = [
      {
        title: '项目ID：',
        itemKey: 'project_id',
        rules: [{
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '英文开头并英文或数字或下划线的组合'
          }]
      },
      {
        title: 'iOS：',
        itemKey: 'iOS接入',
        rules: [{
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '英文开头并英文或数字或下划线的组合'
          }]
      },
      {
        title: '安卓:',
        itemKey: 'Android接入',
        rules: [{
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '英文开头并英文或数字或下划线的组合'
          }]
      },
      {
        title: 'Web:',
        itemKey: 'Web接入',
        rules: [{
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '英文开头并英文或数字或下划线的组合'
          }]
      },
      {
        title: '小程序:',
        itemKey: '微信小程序',
        rules: [{
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '英文开头并英文或数字或下划线的组合'
          }]
      }
    ]
    return (
      <div className="create-project-sdk-form">
        {
          formItemArr.map((i, idx) => (
            <SdkFormItem
              key={idx}
              title={i.title}
              itemKey={i.itemKey}
              getFieldDecorator={getFieldDecorator}
              setFieldsValue={setFieldsValue}
              rules={i.rules}
              tips='系统自动生成'
            />
          ))
        }
      </div>
    )
  }

  validateName = _.throttle(async (rule, num, callback) => {
    if (num < 1) {
      return callback('范围1-1000')
    }
    if (num >1000) {
      return callback('范围1-1000')
    }
  }, 100)

  renderDiyTagForm() {
    const { getFieldDecorator, setFieldsValue } = this.props.form
    const formItemArr = [
      {
        title: '片区 :',
        itemKey: 'partitions',
        rules: [{
            pattern: /^[+]{0,1}(\d+)$/,
            message: '请输入整数'
          },{
            validator: this.validateName
          }]
      }
    ]
    return (
      <div className="create-project-sdk-form">
        {
          formItemArr.map((i, idx) => (
            <SdkFormItem
              key={idx}
              title={i.title}
              itemKey={i.itemKey}
              getFieldDecorator={getFieldDecorator}
              setFieldsValue={setFieldsValue}
              rules={i.rules}
              tips='片区数量(不填则系统自动生成)'
            />
          ))
        }
      </div>
    )
  }

  render() {
    let extra = (
      <a
        href={helpLink}
        target="_blank"
        className="color-grey pointer"
        title="查看帮助文档"
      >
        <Icon type="question-circle" />
      </a>
    )
    return (
      <div className="height-100 bg-white">
        <Loading isLoading={this.state.loading.project}>
          <Bread
            path={[
              { name: '项目管理', link: '/console/project' },
              { name: '新建项目' }
            ]}
            extra={extra}
          />
          <div
            className="scroll-content always-display-scrollbar"
            style={{
              height: window.innerHeight - 44 - 48
            }}
          >
            <div className="pd2y pd3x">
              {this.renderTable()}
            </div>
          </div>
        </Loading>
      </div>
    )
  }
}
