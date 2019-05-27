import { Component } from 'react'
import { Form, Modal, Input, Select, message, Button, Popover } from 'antd'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import _ from 'lodash'
import {validateFieldsAndScroll} from '../../common/decorators'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import helpMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import {docUrl} from '../Home/common'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const FormItem = Form.Item
const {Option} = Select
const getParentDatasourceId = (projects, parentProjectId) => {
  return (_.find(projects, {id: parentProjectId}) || {}).datasource_id
}

const getInitProject = props => {
  let {projects, project} = props
  if (project) {
    let parentId = project.parent_id
    let { filters } = project.filter
    if (!filters) {
      project.filter = { filters: [] }
    }
    return {
      ...project,
      parentId,
      parentDatasourceId: getParentDatasourceId(projects, parentId)
    }
  }
  let proj = _.get(projects, '[0]', {})
  let {
    id: parentId,
    datasource_id: parentDatasourceId
  } = proj
  return {
    name: '',
    parentId,
    parentDatasourceId,
    filter: { filters: [] }
  }
}

//比较object特定属性
const compare = (t1, t2, props) => {
  return _.isEqual(
    _.pick(t1, props),
    _.pick(t2, props)
  )
}

@Form.create()
@validateFieldsAndScroll
export default class CreateChildProject extends Component {
  constructor(props) {
    super(props)
    this.state = {
      visible: false,
      loading: false,
      loadingDimension: false,
      project: getInitProject(props)
    }
    props.doRef(this)
  }

  componentWillReceiveProps(nextProps) {
    if (!compare(nextProps, this.props, ['project', 'projects'])) {
      this.setState({
        project: getInitProject(nextProps)
      }, this.reset)
    }
  }

  reset = () => {
    this.props.form.resetFields()
  }

  onSubmit = async () => {
    const {createChildProject, updateProject} = this.props
    let {project: {id}} = this.state
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    let filters = (_.get(this.state, 'project.filter.filters') || [])
      .filter(p => p.col !== '__time' && (!_.isEmpty(p.eq) || _.isNumber(p.eq)))
    values.filter = {
      filters
    }
    values.id = id
    this.setState({loading: true})
    let func = id ? updateProject : createChildProject
    let res = await func(values)
    this.setState({loading: false})
    this.props.form.resetFields()
    if (_.get(res, 'result.id') || _.get(res, 'result.success')) {
      this.hide()
      message.success(id ? '修改子项目成功' : '创建子项目成功')
    }
  }

  hide = () => {
    this.setState({
      visible: false
    })
  }

  show = () => {
    this.setState({
      visible: true
    })
  }

  renderHelp = () => {
    let content = (
        <ul>
          <li><Icon type="arrow-right" /> 子项目仅仅是父项目再加上特定的过滤条件（例如省份仅北京），维度和指标还是用父项目的</li>
          <li><Icon type="arrow-right" /> 删除父项目将一并删除所有该父项目的子项目</li>
          <li><Icon type="arrow-right" /> 暂停/运行父项目将一并暂停/运行所有该父项目的子项目</li>
          <li><Icon type="arrow-right" /> 子项目有独立的<b>授权设置</b></li>
          <li><Icon type="arrow-right" /> 目前子项目仅可以用于<b>单图</b>、<b>多维分析</b>和<b>用户画像</b></li>
        </ul>
    )
    return (
      <div className="pd1t pd2b">
          <Popover
            content={content}
            placement="bottomLeft"
            overlayStyle={{width: 400}}
          >
            <span>
              <Icon type="question-circle-o" /> 子项目说明
            </span>
          </Popover>
      </div>
    )
  }

  onChangeProj = (id) => {
    let {projects} = this.props
    let proj = _.find(projects, {id}) || {}
    let project = _.cloneDeep(this.state.project)
    project.parentId = proj.id
    project.datasource_name = proj.datasource_name
    project.parentDatasourceId = proj.datasource_id
    project.filter = { filters: [] }
    this.setState({
      project
    })
  }

  onFilterChange = filters => {
    let project = _.cloneDeep(this.state.project)
    project.filter = {
      filters
    }
    this.setState({
      project
    })
  }

  renderFilters = () => {
    let { project } = this.state
    let { filters = []} = project.filter
    //filters = filters.filter(p => p.col !== '__time')
    return (
      <FormItem
        {...formItemLayout}
        label="项目过滤条件"
      >
        <CommonDruidFilterPanel
          projectId={project.parentId}
          noDefaultDimension
          headerDomMapper={() => null}
          dataSourceId={project.parentDatasourceId}
          filters={filters}
          onFiltersChange={this.onFilterChange}
        />
      </FormItem>
    )
  }

  renderProjSelect = (projects) => {
    let {getFieldDecorator} = this.props.form
    let initialValue = this.state.project.parentId || this.state.project.parent_id
    let {id} = this.state.project
    return (
      <FormItem {...formItemLayout} label="父项目">
        {getFieldDecorator('parentId', {
          rules: [{
            required: true,
            message: '请选择父项目'
          }],
          initialValue
        })(
          <Select
            {...enableSelectSearch}
            onChange={this.onChangeProj}
            disabled={!!id}
          >
          {
            projects
            .map((proj, i) => {
              let {id, name} = proj
              return (
                <Option
                  key={i + 'pj@' + id}
                  value={id}
                >
                {name}
                </Option>
              )
            })
          }
          </Select>
        )}
      </FormItem>
    )
  }

  renderProjName = () => {
    let {getFieldDecorator} = this.props.form
    let initialValue = this.state.project.name
    return (
      <FormItem {...formItemLayout} label="子项目名称" hasFeedback>
        {getFieldDecorator('name', {
          rules: [{
            required: true,
            message: '请输入子项目名称'
          }, {
            min: 1,
            max: 50,
            type: 'string',
            message: '1~50个字符'
          }],
          initialValue
        })(
          <Input type="text"/>
        )}
      </FormItem>
    )
  }

  renderFooter = (loading, id) => {
    let text = id ? '修改' : '提交'
    return (
      <div className="alignright">
        <Button
          type="ghost"
          icon="close-circle-o"
          className="mg1r iblock"
          onClick={this.hide}
        >取消</Button>
        <Button
          type="success"
          icon={loading ? 'loading' : 'check'}
          className="mg1r iblock"
          onClick={this.onSubmit}
          disabled={loading}
        >{loading ? '提交中...' : text}</Button>
      </div>
    )
  }

  render () {
    const { projects } = this.props
    let {visible, loading, project: {id}} = this.state
    let title = (
      <div>
        {id ? '编辑子项目' : '创建子项目'}
        <a
          href={docUrl + helpMap['/console/project#create-child']}
          className="mg1l"
          title="前往查看子项目帮助文档"
          target="_blank"
        >
          <Icon type="sugo-help" />
        </a>
      </div>
    )
    return (
      <Modal
        visible={visible}
        onCancel={this.hide}
        title={title}
        destroyOnClose
        footer={this.renderFooter(loading, id)}
        width={700}
      >
        {this.renderHelp()}
        <Form>
          {this.renderProjSelect(projects)}
          {this.renderProjName()}
          {this.renderFilters()}
        </Form>
      </Modal>
    )
  }
}
