/**
 * @Author sugo.io<asd>
 * @Date 17-11-27
 */

import React, { Component, PropTypes } from 'react'
import { Button, Icon, Popconfirm, Input, Row, Col } from 'antd'
import RealUserTableModel  from '../../../common/model-validator/RealUserTable'
import '../Common/editable-table.styl'

export default class CreateUserTable extends Component {
  static propTypes = {
    store: PropTypes.object.isRequired,
    tables: PropTypes.array.isRequired,
    project: PropTypes.object.isRequired,
    NEXT_TABLE_MARK: PropTypes.string
  }

  static defaultProps = {
    NEXT_TABLE_MARK: 'NEXT_TABLE_MARK'
  }

  constructor (props, context) {
    super(props, context)
    this.state = {
      selected: props.tables.find(p => p.id === props.project.real_user_table),
      names: {},
      messages: {},
      edit: null
    }
  }

  componentWillReceiveProps (nextProps) {
    const { project, tables } = nextProps

    this.setState({
      selected: tables.find(p => p.id === project.real_user_table),
      names: {},
      messages: {},
      edit: null
    })
  }

  selectOne (mod) {
    const { selected } = this.state
    // 点击选择的项,则取消该项选择状态
    this.setState({
      selected: selected
        ? (selected.id === mod.id ? null : mod)
        : mod
    })
  }

  updateName (id) {
    const { messages, names } = this.state
    const { tables, store } = this.props
    // 如果没有输入名称或输入名称有误,忽略此次操作
    if (!names[id] || messages[id]) {
      this.setState({ edit: null })
    }
    const prev = tables.find(p => p.id === id)

    // 名称相同时不处理
    if (prev && prev.name === names[id]) {
      return
    }

    store.actions.Project.updateName(id, names[id])
  }

  /**
   * @param {RealUserTableModel} mod
   */
  destroy (mod) {
    this.props.store.actions.Project.destroy(mod)
    this.setState({ edit: null })
  }

  renderUserList () {
    const { edit, messages, names, selected } = this.state
    const { tables } = this.props

    const ActiveStyle = {
      /** @see constants.styl: colorMain */
      backgroundColor: '#6969d7',
      borderColor: '#6969d7',
      color: '#fff'
    }

    return tables.map(mod => {
      return (
        <div className="pd1t" key={mod.id}>
          <Row gutter={16}>
            <Col span={18}>
              <div className="mg1t">
                {edit === mod.id
                  ? (
                    <Input
                      type="text"
                      value={names[mod.id] || mod.name}
                      onChange={e => this.setName(mod.id, e.target.value)}
                    />
                  )
                  : (
                    <div
                      className="pd1 border radius pointer"
                      onClick={() => this.selectOne(mod)}
                      style={(selected && selected.id === mod.id) ? ActiveStyle : {}}
                    >
                      {names[mod.id] || mod.name}
                    </div>
                  )}
              </div>
            </Col>
            <Col span={6}>
              <div className="mg1t" style={{ lineHeight: '30px', fontSize: '16px' }}>
                {
                  edit !== mod.id
                    ? (
                    <div>
                      <Icon
                        type="edit"
                        className="pointer"
                        onClick={() => this.setState({ edit: mod.id })}
                      />
                      <Popconfirm
                        title="如果用户表已存在数据,则不能删除"
                        onConfirm={() => this.destroy(mod)}
                      >
                        <Icon
                          type="delete"
                          className="mg2l pointer"
                        />
                      </Popconfirm>

                    </div>
                  ) : (
                    <Icon
                      className="pointer"
                      type="check-circle"
                      onClick={() => this.updateName(mod.id)}
                    />
                  )
                }
              </div>
            </Col>
          </Row>
          {messages[mod.id]
            ? (<p className="pd1t color-red">{messages[mod.id]}</p>)
            : null}
        </div>
      )
    })
  }

  setName (id, name) {
    const messages = { ...this.state.messages }
    const names = { ...this.state.names }
    const msg = RealUserTableModel.validOne('name', name)

    if (msg) {
      messages[id] = msg
    } else {
      messages[id] = void 0
    }

    names[id] = name

    this.setState({ messages, names })
  }

  apply () {
    const { NEXT_TABLE_MARK, store, project } = this.props
    const { names, messages, selected } = this.state
    const Actions = store.actions.Project

    // 如果输入的名称,则创建
    if (names[NEXT_TABLE_MARK] && messages[NEXT_TABLE_MARK] === void 0) {
      Actions.createUserTable(names[NEXT_TABLE_MARK], project)
    } else if (selected) {
      Actions.associateProject(project, selected)
    }
  }

  render () {
    const { NEXT_TABLE_MARK, tables, store, project } = this.props
    const { names, messages, selected } = this.state

    return (
      <div className="pd2x">
        <div>
          <label>
            <p className="pd1b">新建用户库</p>
            <Input
              type="text"
              placeholder="请输入用户表名称"
              value={names[NEXT_TABLE_MARK] || void 0}
              onChange={e => this.setName(NEXT_TABLE_MARK, e.target.value)}
            />
            {messages[NEXT_TABLE_MARK]
              ? (<p className="color-red pd1t">{messages[NEXT_TABLE_MARK]}</p>)
              : null}
          </label>
        </div>
        {tables.length > 0 ? (
          <div className="pd2t">
            <p>选择已有用户库</p>
            <div style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden' }}>
              {this.renderUserList()}
            </div>
          </div>
        ) : null}
        <div className="pd2t alignright">
          <Button
            type="default"
            onClick={() => store.actions.Project.visibleUserTableModal(false, null)}
          >
            取消
          </Button>
          {
            project.real_user_table
              ? (
              <Popconfirm
                title={(
                  <div>
                    <p>检测到当前项目已经关联过用户表</p>
                    <p>如果修改项目关联用户表，会造统计首次登录用户数据异常</p>
                    <p>请再次确定你的操作</p>
                  </div>
                )}
                onConfirm={() => this.apply()}
              >
                <Button
                  disabled={(names[NEXT_TABLE_MARK] === void 0 || messages[NEXT_TABLE_MARK] !== void 0) && selected === null}
                  className="mg2l"
                  type="success"
                >
                  提交
                </Button>
              </Popconfirm>

            ) : (
              <Button
                disabled={(names[NEXT_TABLE_MARK] === void 0 || messages[NEXT_TABLE_MARK] !== void 0) && selected === null}
                className="mg2l"
                type="success"
                onClick={() => this.apply()}
              >
                提交
              </Button>
            )
          }

        </div>
      </div>
    )
  }
}


