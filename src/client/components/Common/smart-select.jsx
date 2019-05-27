/*组件说明：
 *   当选项长度小于等于buttonLength时显示单选按钮组，否则显示下拉选框
 * props说明：
 * buttonLength: 单选组和下拉选框的分水岭，默认3
 * option: 选项数组，由字符串组成
 * value: 用于双向绑定
 * onChange: 必选，回调函数
 * placeholder: 下拉选框的placeholder
 * style: 组件容器的style
 * className: 组件容器的className
 *
 */


import React from 'react'
import {Select, Radio} from 'antd'
const Option = Select.Option
const RadioGroup = Radio.Group
const RadioButton = Radio.Button

export default class SmartSelect extends React.Component {
  static defaultProps = {
    buttonLength: 3,
    placeholder: '',
    onChange: (value) => {
      console.log(value)
    }
  }

  static propTypes = {
    buttonLength: React.PropTypes.number,
    option: React.PropTypes.array.isRequired,
    value: React.PropTypes.string,
    onChange: React.PropTypes.func,
    placeholder: React.PropTypes.string,
    style: React.PropTypes.object,
    className: React.PropTypes.string
  }


  constructor(props) {
    super(props)
    this.state = {
      currentValue: props.value || props.option[0]
    }
  }

  onSelect(value) {
    this.setState({currentValue: value})
    this.props.onChange(value)
  }

  onChange(data) {
    let value = data.target.value
    this.setState({currentValue: value})
    this.props.onChange(value)
  }

  render() {
    const {className, option, buttonLength, placeholder, style} = this.props

    const createSelect = (option)=> {
      return (
        <Select
          value={this.state.currentValue}
          placeholder={placeholder}
          className="width-100"
          dropdownMatchSelectWidth
          onSelect={val => this.onSelect(val)}
        >
          {option.map(option => {
            return (<Option key={option} value={option}>{option}</Option>)
          })}
        </Select>
      )
    }

    const createRadioGroup = (option) => {
      return (
        <RadioGroup
          onChange={val => this.onChange(val)}
          value={this.state.currentValue}
        >
          {option.map(option => {
            return (
              <RadioButton value={option} key={option}>
                {option}
              </RadioButton>)
          })}
        </RadioGroup>
      )
    }

    return (
      <div
        className={className}
        style={Object.assign({display: 'inline-block', width: '250px'}, style)}
      >
        {option.length > buttonLength ?
          createSelect(option)
          : createRadioGroup(option)
        }
      </div>
    )
  }
}
