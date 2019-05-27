import React, {PropTypes} from 'react-proptypes-proxy'
import { Input, Button, Modal, Popconfirm, message, Icon, Spin, Popover, Tooltip, Tag, Radio } from 'antd'
import _ from 'lodash'
import {editTag, deleteTag, addTag, getTags} from '../../databus/datasource'
import classNames from 'classnames'
import {Auth, checkPermission} from '../../common/permission-control'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const testTag = tag => {
  return /^[^\s]{1,32}$/.test(tag)
}
const modes = ['filter', 'change']
const tagTypeMap = {
  dimension: '维度',
  measure: '指标',
  track_event: '可视化事件信息'
}

export default class TagManage extends React.Component {

  static propTypes = {
    projectId: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,

    // tagId => ...
    afterDeleteTag: PropTypes.func,

    tags: PropTypes.array,
    className: PropTypes.string,
    mode: React.PropTypes.oneOf(modes),

    //同antd Popover palcement
    placement: PropTypes.string,

    //过滤的分组id
    filterTagIds: PropTypes.array,

    //选中的条目, 比如维度列表，格式 [{id: 'tt', tags: ['a']}, {id: 'xx', tags: ['a', 'b']}]
    items: PropTypes.array,

    // (newFilteredTagIds) => ...
    updateFilteredTags: PropTypes.func.isRequired,

    // (tagId, action) => ...
    // action === oneOf(['add', 'remove'])
    updateItemTag: PropTypes.func.isRequired,
    permissionUrl: PropTypes.string.isRequired
  }

  static defaultProps = {
    afterDeleteTag: _.noop,
    className: 'tags-btn-wrap iblock',
    mode: 'filter',
    filterTagIds: [],
    items: [],
    tags: [],
    placement: 'bottomRight'
  }

  constructor(props) {
    super(props)
    this.state = {
      newTagName: '',
      loading: {
        '@all': false,
        '@new': false
      },
      visible: false,
      popVisible: false,
      onEditTagId: '',
      mode: this.props.mode
    }
  }

  componentWillMount() {
    if (this.props.projectId) this.getTags()
  }

  componentDidMount() {
    this.dom1 = document.getElementById('container')
  }

  componentWillReceiveProps(nextProps) {
    const {mode} = nextProps
    const oldMode = this.state.mode
    if (mode !== oldMode) {
      this.setState({
        mode
      })
    }
    if (
      nextProps.projectId !== this.props.projectId
    ) {
      this.getTags(nextProps.projectId)
    }
  }

  componentWillUnmount() {
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  onClickHidePopover = e => {
    if (e.target.type && e.target.type === 'checkbox') {
      return
    }
    this.setState({
      popVisible: false
    })
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  loading = (tagId = '@all', value = true)=> {
    let loading = _.cloneDeep(this.state.loading)
    loading[tagId] = value
    this.setState({loading})
  }

  getTags = async (projectId = this.props.projectId) => {
    let {type, setProp} = this.props
    this.loading()
    let res = await getTags(projectId, {type})
    this.loading('@all', false)
    if (!res) return
    setProp({
      type: 'set_tags',
      data: res.data.map(t => {
        t.tempName = t.name
        return t
      })
    })
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

  onChange = (e, updater) => {
    let newTagName = e.target.value
    if (!testTag(newTagName)) {
      message.error('分组不能含有空格，不超过32个字符')
    }
    updater(newTagName)
  }

  updateNewTag = (newTagName) => {
    this.setState({
      newTagName: newTagName.slice(0, 32)
    })
  }

  updateEditTag = (id) => {
    return tempName => {
      this.props.setProp('update_tags', {
        id,
        tempName
      })
    }
  }

  validateTagName = (name) => {
    let res = true
    if (_.find(this.state.tags, {name})) {
      res = false
      message.error('不能与现有分组重名')
    }
    return res
  }
  
  onCreate = async () => {
    let {projectId, type, setProp} = this.props
    let {newTagName} = this.state
    if (!this.validateTagName(newTagName)) return
    let params = {
      name: newTagName,
      projectId,
      type
    }
    this.loading('@new')
    let res = await addTag(projectId, params)
    this.loading('@new', false)
    if (!res) return
    this.setState({
      newTagName: ''
    })
    message.success('添加成功', 8)
    let tag = res.result
    tag.tempName = tag.name
    setProp('add_tags', tag)
  }

  //更改分组名
  async saveNewTagName(id) {
    let {type, projectId, setProp, tags} = this.props
    let {tempName, name} = _.find(tags, {id})

    //判断是否有更改过名字
    if(tempName === name) {
      return this.setState({
        onEditTagId: ''
      })
    }

    if (!this.validateTagName(tempName)) return
    this.loading(id)
    let res = await editTag(id, {
      name: tempName,
      projectId,
      type
    })
    this.loading(id, false)
    if (!res) return
    message.success('修改成功', 8)
    setProp('update_tags', {
      id,
      name: tempName
    })
    this.setState({
      onEditTagId: ''
    })

  }

  async deleteTag(id) {
    let {afterDeleteTag, setProp} = this.props
    this.loading(id)
    let res = await deleteTag(id)
    this.loading(id, false)
    if (!res) return
    message.success('删除成功', 8)
    setProp('del_tags', {
      id
    })
    afterDeleteTag(id)
  }

  cancelEdit = id => {
    let {setProp, tags} = this.props
    let tag = _.find(tags, {id})
    setProp('update_tags', {
      id,
      tempName: tag.name
    })
    this.setState({
      onEditTagId: ''
    })
  }

  onEdit = onEditTagId => {
    this.setState({
      onEditTagId
    })
  }

  renderEditTag = tag => {
    let {tempName, id} = tag
    return (
      <span className="fleft">
        <Input
          value={tempName}
          className="iblock mg1r width100"
          onChange={e => this.onChange(e, this.updateEditTag(id))}
        />
        <Button
          type="primary"
          className="iblock mg1r"
          onClick={() => this.saveNewTagName(id)}
        >
        提交
        </Button>
        <Button
          type="ghost"
          className="iblock mg1r"
          onClick={() => this.cancelEdit(id)}
        >
        取消
        </Button>
      </span>
    )
  }

  renderTags = () => {
    let { onEditTagId, loading } = this.state
    let {type, tags} = this.props
    let typeName = tagTypeMap[type]
    if (!tags.length) {
      return (
        <div className="pd2y aligncenter">
          还没有分组，新建一个吧。
        </div>
      )
    }

    return (
      <div className="tag-list">
      {
        tags.map((tag, index) => {
          let {name, id} = tag
          let isEditting = onEditTagId === id
          let iconCls = classNames(
            onEditTagId ? 'hide' : '',
            'pointer mg2x font16 color-grey'
          )
          let cls = classNames(
            'tag-unit fix',
            index % 2 ? 'odd' : 'even'
          ) 
          return (
            <Spin spinning={!!loading[id]} key={id + '@ti'}>
              <div className={cls}>
                {
                  isEditting
                  ? this.renderEditTag(tag)
                  : <span className="fleft"><b className="width-70 pd2x elli">{name}</b></span>
                }
                <span className="fright">
                  <Tooltip
                    title="编辑分组"
                  >
                    <Icon
                      type="edit"
                      className={iconCls}
                      onClick={() => this.onEdit(id)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={`确定删除分组 "${name}" 么？这将删除所有${typeName}的这个分组`}
                    placement="topLeft"
                    onConfirm={() => this.deleteTag(id)}
                  >
                    <Tooltip
                      title="删除分组"
                    >
                      <Icon
                        type="close-circle-o"
                        className={iconCls}
                      />
                    </Tooltip>
                  </Popconfirm>
                </span>
              </div>
            </Spin>
          )
        })
      }
      </div>
    )
  }

  renderTagList = () => {
    let { loading } = this.state
    return (
      <Spin spinning={loading['@all']}>
        {this.renderTags()}
      </Spin>
    )
  }

  togglePopVisible = () => {
    let {popVisible} = this.state
    if (!popVisible) {
      this.dom1.addEventListener('click', this.onClickHidePopover)
    }
    this.setState({
      popVisible: !popVisible
    })
  }

  goTagManage = () => {
    this.setState({
      visible: true,
      popVisible: false
    })
  }

  renderPopTitle = () => {
    let {permissionUrl} = this.props
    return (
      <div className="fix tag-pop-title">
        <span className="fleft bold">
          分组
        </span>
        <span className="fright">
          <Auth auth={permissionUrl}>
            <Button
              onClick={this.goTagManage}
              size="small"
            >
              <Icon type="tag" /> 分组管理
            </Button>
          </Auth>
          <Tooltip title="关闭分组面板">
            <Icon
              type="close-circle-o"
              className="mg2l pointer"
              onClick={this.togglePopVisible}
            />
          </Tooltip>
        </span>
      </div>
    )
  }

  renderModeHelp = mode => {
    const {type} = this.props
    const typeName = tagTypeMap[type]
    if (mode === 'filter') {
      return (
        <Tooltip title={`点击分组来过滤${typeName}`}>
          <span className="bold">
            分组过滤
            <Icon type="question-circle-o" className="mg1l" />
          </span>
        </Tooltip>
      )
    } else if (mode === 'change') {
      let tip = <span>点击分组给<b>选中的{typeName}</b>添加或者移除该分组</span>
      return (
        <Tooltip title={tip}>
          <span className="bold">
            批量添加/移除分组
            <Icon type="question-circle-o" className="mg1l" />
          </span>
        </Tooltip>
      )
    }
  }

  toggleFilter = tag => {
    let {filterTagIds, updateFilteredTags} = this.props
    let {id} = tag
    let inFilter = filterTagIds.includes(id)
    let newTags = inFilter
      ? _.without(filterTagIds, id)
      : filterTagIds.concat(id)

    updateFilteredTags(newTags)
  }

  toggleTag = tag => {
    let {updateItemTag, items} = this.props
    let {id} = tag
    let inAllItem = this.checkInAllItem(id, items)
    let action = inAllItem ? 'remove' : 'add'
    updateItemTag(id, action)
  }

  checkInAllItem = (id, items) => {
    return items.filter(item => item.tags.includes(id)).length === items.length
  }

  renderTagFilter = (tag) => {
    let {mode} = this.state
    let {filterTagIds, items} = this.props
    let {id, name} = tag
    let {type} = this.props
    let typeName = tagTypeMap[type]
    if (mode === 'filter') {
      let inFilter = filterTagIds.includes(id)
      let flag = inFilter
        ? <Icon type="check" className="color-green" />
        : null
      let title = inFilter
        ? '点击移除这个分组过滤条件'
        : '点击添加这个分组过滤条件'
      return (
        <div
          key={id}
          title={title}
          className="tag-filter-single"
          onClick={() => this.toggleFilter(tag)}
        >
          <span className="tag-flag-wrap iblock">
          {flag}
          </span>
          <span className="tag-flag-txt iblock pd1x">{name}</span>
        </div>
      )
    } else if (mode === 'change') {
      let inAllItem = this.checkInAllItem(id, items)
      let flag = inAllItem
        ? <Icon type="check" className="color-grey" />
        : null
      let title = inAllItem
        ? `点击从选中${typeName}中批量移除分组`
        : `点击给选中${typeName}中批量添加分组`
      return (
        <div
          title={title}
          key={id}
          className="tag-filter-single"
          onClick={() => this.toggleTag(tag)}
        >
          <span className="tag-flag-wrap iblock">
          {flag}
          </span>
          <span className="tag-flag-txt iblock pd1x">{name}</span>
        </div>
      )
    }
  }

  removeAllFilter = () => {
    this.props.updateFilteredTags([])
  }

  renderRemoveAllFilter = () => {
    let {filterTagIds} = this.props
    let {mode} = this.state
    if (!filterTagIds.length || mode !== 'filter') {
      return
    }
    return (
      <div className="pd2y">
        <span
          className="pointer"
          onClick={this.removeAllFilter}
        >
          <Icon type="close-circle-o" className="mg1r" />
          移除所有分组过滤
        </span>
      </div>
    )
  }

  renderPopTagList = () => {
    let {tags, permissionUrl, items, type} = this.props
    let {mode} = this.state
    let typeName = tagTypeMap[type]
    if (mode === 'change' && !checkPermission(permissionUrl)) {
      return (
        <div className="pd2y aligncenter">
          您没有权限操作<b>{typeName}</b>的分组
        </div>
      )
    }
    if (mode === 'change' && !items.length) {
      return (
        <div className="pd2y aligncenter">
          请先选择<b>{typeName}</b>
        </div>
      )
    }

    if (!tags.length) {
      return (
        <div className="pd2y aligncenter">
          还没有分组，新建一个吧。
          <Auth auth={permissionUrl}>
            <Button
              type="primary"
              icon="plus-circle-o"
              className="ml1l"
              onClick={this.goTagManage}
            >新建分组</Button>
          </Auth>
        </div>
      )
    }

    return (
      <div className="tag-list">
      {this.renderRemoveAllFilter()}
      {
        tags.map(this.renderTagFilter)
      }
      </div>
    )
  }

  onChangeMode = e => {
    this.setState({
      mode: e.target.value
    })
  }

  renderPopContent = () => {
    const {mode, loading} = this.state
    return (
      <div className="tag-filter-wrap">
        <div className="pd1">
          <RadioGroup
            value={mode}
            onChange={this.onChangeMode}
          >
          {
            modes.map(m => {
              return (
                <RadioButton value={m} key={m}>
                {this.renderModeHelp(m)}
                </RadioButton>
              )
            })
          }
          </RadioGroup>
        </div>
        <Spin spinning={loading['@all']}>
          {this.renderPopTagList()}
        </Spin>
      </div>
    )
  }

  render () {
    let {newTagName, visible, popVisible} = this.state
    let {className, placement, filterTagIds} = this.props
    let len = filterTagIds.length
    let title = len
      ? `${len}个分组过滤条件`
      : ''
    let txt = len
      ? `分组(${len})`
      : '分组'
    return (
      <div className={className}>
        <Popover
          title={this.renderPopTitle()}
          content={this.renderPopContent()}
          overlayClassName="tag-overlay"
          visible={popVisible}
          placement={placement}
        >
          <Button
            type="ghost"
            onClick={this.togglePopVisible}
            title={title}
          >
            {txt}
            <Icon type="down" className="font12" />
          </Button>
        </Popover>
        <Modal
          title="分组管理"
          visible={visible}
          width={600}
          onCancel={this.hide}
          className="tag-modal"
          footer={null}
        >
          <div className="tag-create pd2b">
            <Input
              className="width200"
              value={newTagName}
              placeholder="请输入分组名称"
              onChange={e => this.onChange(e, this.updateNewTag)}
            />
            <Button
              className="mg1l"
              onClick={this.onCreate}
              disabled={!newTagName}
              type="primary"
            >
            新增分组
            </Button>
          </div>
          {this.renderTagList()}
        </Modal>
      </div>
    )
  }

}

export function tagRender(tags) {
  return tagIds => {
    return tagIds.map((id, i) => {
      let tag = _.find(tags, {id})
      return tag
        ? <Tag color="#479cdf" key={i + ''} className="mg1r mg1b">
            {tag.name || ''}
          </Tag>
        : null
    })
  }
}
