// https://ant.design/components/table-cn/#components-table-demo-edit-row

import React from 'react'
import _ from 'lodash'
import { Table, Input, Popconfirm } from 'antd'
import Icon from '../Common/sugo-icon'
import './editable-table.styl'

export class EditableCell extends React.Component {
  static defaultProps = {
    value: '',
    row: 0,
    column: 0,
    filed: '',
    showEditIcon: false,
    onChange: _.noop
  }

  constructor (props, context) {
    super(props, context)
    this.recordTextWidth = 0
    this.state = {
      value: '',
      editable: false
    }
  }

  componentWillMount () {
    const { value } = this.props
    this.setState({ value })
  }

  componentWillReceiveProps (nextProps) {
    const { value } = nextProps
    this.setState({ value })
  }

  handleChange = (e) => {
    let {value} = e.target
    let {limit} = this.props
    if (limit) {
      value = value.slice(0, limit)
    }
    this.setState({ value })
  }

  cancelEdit = () => {
    const {value} = this.props
    this.setState({
      value,
      editable: false
    })
  }

  check = () => {
    this.setState({ editable: false })
    let stateValue = this.state.value
    const { row, column, field, onChange, value } = this.props
    if (stateValue !== value) {
      onChange(stateValue, field, row, column)
    }
  }

  edit = () => {
    this.setState({ editable: true })
  }

  render () {
    const { value, editable } = this.state
    const { showEditIcon } = this.props

    return (
      <div className={`editable-cell${showEditIcon ? ' show-edit-icon' : ''}`}>
        {
          editable ?
            (
              <div className="editable-cell-input-wrapper">
                <Input
                  value={value}
                  style={{ width: 'calc(100% - 40px)' }}
                  onChange={this.handleChange}
                  onPressEnter={this.check}
                />
                <Icon
                  type="check-circle"
                  title="提交更改"
                  className="font14 color-green iblock pointer mg1l editable-cell-icon hover-color-main"
                  onClick={this.check}
                />
                <Icon
                  type="close-circle-o"
                  title="放弃编辑"
                  className="font14 color-grey iblock pointer mg1l editable-cell-icon hover-color-main"
                  onClick={this.cancelEdit}
                />
              </div>
            )
            :
            (
              <div className="editable-cell-text-wrapper">
                <span ref="wrap">{value || ' '}</span>
                <Icon
                  type="sugo-edit"
                  className="color-grey font12 pointer editable-cell-icon hover-color-main"
                  onClick={this.edit}
                />
              </div>
            )
        }
      </div>
    )
  }
}

export class EditableTable extends React.Component {

  static defaultProps = {
    dataSource: [
      {
        editable: true       // 需要带一个参数表明是否需要编辑
      }
    ],
    operationColumnWidth: 60,
    onSelectAll: _.noop,
    onCellChange: _.noop,
    onDelete: _.noop,
    onAdd: _.noop
  }

  constructor (props) {
    super(props)
  }

  onCellChange = (value, field, row, column) => {
    const { dataSource, onCellChange } = this.props
    onCellChange(dataSource[row], value, field, row, column)
  }

  onDelete = (index) => {
    return () => {
      const { dataSource, onDelete } = this.props
      onDelete(dataSource[index], index)
    }
  }

  render () {
    const { columns, dataSource } = this.props
    const props = _.omit(this.props, ['columns', 'dataSource', 'onSelectAll', 'onAdd'])

    const copyColumns = columns.map((one, col) => {
      const copy = Object.assign({}, one)
      const render = copy.render
      copy.render = (text, record, row) => {
        const value = _.isFunction(render) ? render(text, record, row) : text
        return record.editable && columns[col].editable ?
          (
            <EditableCell
              value={value}
              row={row}
              column={col}
              field={one.dataIndex}
              onChange={this.onCellChange}
            />
          ) : ( <span>{value}</span>)
      }
      return copy
    })

    copyColumns.push({
      title: '操作',
      key: 'operation',
      dataIndex: 'operation',
      width: props.operationColumnWidth,
      fixed: 'right',
      render: (text, record, index) => {
        return (
          dataSource.length > 1 ?
            (
              <Popconfirm
                title="确认删除?"
                onConfirm={this.onDelete(index)}
              >
                <a href="#">删除</a>
              </Popconfirm>
            ) : null
        )
      }
    })

    return (
      <div className="editable-table">
        <div className="editable-table-table">
          <Table
            {...props}
            dataSource={dataSource}
            columns={copyColumns}
          />
        </div>
      </div>
    )
  }
}
