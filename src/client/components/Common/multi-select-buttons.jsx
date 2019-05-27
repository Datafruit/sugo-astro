import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {Spin, Icon, Button} from 'antd'
import Search from './search'
import setStatePromise from '../../common/set-state-promise'
import smartSearch from '../../../common/smart-search'

@setStatePromise
export default class MultiSelect extends React.Component {
  static propTypes = {
    options: PropTypes.array.isRequired,
    value: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    onSearch: PropTypes.func,
    isLoading: PropTypes.bool,
    getValueFromOption: PropTypes.func,
    getTitleFromOption: PropTypes.func,
    renderTitle: PropTypes.func,
    placeholder: PropTypes.string,
    textStyle: PropTypes.object,
    style: PropTypes.object,
    disabled: PropTypes.bool,
    renderExtra: PropTypes.func,
    className: PropTypes.string
  }

  static defaultProps = {
    placeholder: '搜索',
    getValueFromOption: option => option.id,
    getTitleFromOption: option => option.title || option.name,
    style: {},
    disabled: false,
    isLoading: false,
    onSearch: _.noop,
    className: '',
    renderExtra: () => null,
    renderTitle: value => {
      return <span className="mg1r line-height28">已选择<b>({value.length})</b></span>
    }
  }

  state = {
    keyword: ''
  }

  componentDidMount() {
    this.initTempValuesFromProps(this.props)
  }

  componentWillReceiveProps(nextProps) {
    let {value} = this.props
    if (!_.isEqual(value, nextProps.value)) {
      this.initTempValuesFromProps(nextProps)
    }
  }

  initTempValuesFromProps(props) {
    return this.setStatePromise({
      tempValue: props.value
    })
  }

  clear = () => {
    this.props.onChange([])
  }

  onChangeKeyword = e => {
    let keyword = e.target.value
    this.setState({
      keyword
    })
    this.props.onSearch(keyword)
  }

  click = option => {
    return () => {
      let isSelected = this.isSelected(option)
      let {value: propValue, getValueFromOption, onChange} = this.props
      let v = _.cloneDeep(propValue)
      let value = getValueFromOption(option)
      if (isSelected) {
        v = _.without(v, value)
      } else {
        v.push(value)
      }
      onChange(v)
    }
  }

  isSelected = option => {
    let {getValueFromOption, value} = this.props
    return value.includes(getValueFromOption(option))
  }

  renderClear = () => {
    let {value, disabled} = this.props
    if (!value.length || disabled) return null
    return (
      <span
        className="pointer inline mg1r color-grey"
        onClick={this.clear}
      ><Icon type="close" /> 清除所有选择</span>
    )
  }

  renderRightControl = () => {
    let {value, renderTitle} = this.props
    return (
      <span className="fright">
        {this.renderClear()}
        {renderTitle(value)}
      </span>
    )
  }

  renderSearch = () => {
    let {keyword} = this.state
    let {placeholder, renderExtra} = this.props
    let props = {
      value: keyword,
      placeholder
    }
    return (
      <div className="fleft">
        <Search
          {...props}
          className="width240 inline"
          onChange={this.onChangeKeyword}
        />
        {renderExtra()}
      </div>
    )
  }

  renderOption = (option, index) => {
    let {getTitleFromOption, getValueFromOption, disabled} = this.props
    let value = getValueFromOption(option)
    let title = getTitleFromOption(option)
    let selected = this.isSelected(option)
    let type = selected
      ? 'primary'
      : 'ghost'
    return (
      <Button
        key={value + '@' + index}
        onClick={this.click(option)}
        type={type}
        disabled={disabled}
        icon="check-circle"
        className="mg1r mg1b"
      >
      {title}
      </Button>
    )
  }

  renderOptions = () => {
    let {keyword} = this.state
    let {getTitleFromOption} = this.props
    let options = this.props.options.slice(0)
    options = keyword
      ? options.filter(
          op => smartSearch(keyword, getTitleFromOption(op))
        )
      : options

    options.sort((a, b) => {
      let v1 = this.isSelected(a) ? 0 : 1
      let v2 = this.isSelected(b) ? 0 : 1
      return v1 - v2
    })
    return (
      <div className="multi-select-btns-wrap">
      {
        options.map(this.renderOption)
      }
      </div>
    )
  }

  render() {
    let {className, style, isLoading} = this.props
    let cls = 'multi-select-btns' + ' ' + className
    return (
      <div className={cls} style={style}>
        <div className="fix">
          {this.renderSearch()}
          {this.renderRightControl()}
        </div>
        <hr className="mg1y" />
        <Spin spinning={isLoading}>
          {this.renderOptions()}
        </Spin>
      </div>
    )
  }

}

