import React, {PropTypes} from 'react-proptypes-proxy'
import { Popover, Button, Input, Select } from 'antd'
import withAutoFocus from '../Common/auto-focus'
import Icon from '../Common/sugo-icon'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {isHidden} from './auto-focus'
import _ from 'lodash'

const InputWithAutoFocus = withAutoFocus(Input, undefined, undefined, 300)

export default class LitePopInput extends React.Component {
  static propTypes = {
    type: PropTypes.oneOf(['input', 'select']),
    title: PropTypes.string,
    value: PropTypes.any,
    defaultValue: PropTypes.any,
    onChange: PropTypes.func,
    children: PropTypes.element,
    options: PropTypes.arrayOf(PropTypes.object) // {title, name}
  }

  static defaultProps = {
    type: 'input'
  }

  state = {
    nextModelValue: undefined,
    visible: false
  }

  componentWillMount() {
    this.state.nextModelValue = this.props.defaultValue
  }

  onVisibleChange = visible => {
    if (!visible && this.props.type === 'select') {
      let dropDowns = document.querySelectorAll('.ant-select-dropdown')
      if (_.some(dropDowns, el => !isHidden(el))) {
        return
      }
    }
    this.setState({visible})
  }

  render() {
    let {children, value, onChange, type, options, defaultValue, ...rest} = this.props
    let {nextModelValue, visible} = this.state
    let val = nextModelValue === undefined ? value : nextModelValue

    let onVisibleChange = rest.onVisibleChange || this.onVisibleChange
    return (
      <Popover
        content={
          [
            type === 'input'
              ? (
                <InputWithAutoFocus
                  key="input"
                  value={val}
                  onChange={e => {
                    this.setState({nextModelValue: e.target.value})
                  }}
                />
              ) : (
                <Select
                  key="select"
                  className="width-100"
                  value={`${val}`}
                  onChange={val => {
                    this.setState({nextModelValue: val})
                  }}
                  {...enableSelectSearch}
                  dropdownMatchSelectWidth={false}
                >
                  {options.map(({name, title}) => {
                    return (
                      <Select.Option key={name} value={name}>{title || name}</Select.Option>
                    )
                  })}
                </Select>
              ),
            <div key="buttons" className="mg2t ant-popover-buttons">
              <Button
                size="small"
                onClick={() => {
                  onVisibleChange(false)
                }}
              >取消</Button>
              <Button
                type="primary"
                size="small"
                onClick={async () => {
                  onVisibleChange(false)
                  await onChange(val)
                  this.setState({nextModelValue: defaultValue})
                }}
              >确定</Button>
            </div>
          ]
        }
        trigger="click"
        children={children || <Icon className="pointer" type="edit" />}
        visible={visible}
        onVisibleChange={onVisibleChange}
        {...rest}
      />
    )
  }
}
