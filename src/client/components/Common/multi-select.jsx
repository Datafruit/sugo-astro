import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {Button, Popover, Menu, Checkbox, Tooltip, Icon} from 'antd'
import Loading from '../../components/Common/loading'
import HighLightString from '../Common/highlight-string'
import setStatePromise from '../../common/set-state-promise'
import withAutoFocus from '../Common/auto-focus'
import Search from './search'
import {withDebouncedOnChange} from '../Common/with-debounce-on-change'
import smartSearch from '../../../common/smart-search'

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 1300)

const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange)

@setStatePromise
export default class MultiSelect extends React.Component {
  static propTypes = {
    options: PropTypes.array.isRequired,
    optionDisabledPredicate: PropTypes.func,
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    popoverVisible: PropTypes.bool,
    onPopoverVisibleChange: PropTypes.func,
    onSearch: PropTypes.func,
    isLoading: PropTypes.bool,
    getValueFromOption: PropTypes.func,
    getTitleFromOption: PropTypes.func,
    onSearchBarPressEnter: PropTypes.func,
    placeholder: PropTypes.string,
    searchBarPlaceholder: PropTypes.string,
    renderTitle: PropTypes.func,
    showSelectAllBtn: PropTypes.bool,
    disabled: PropTypes.bool,
    renderText: PropTypes.func,
    noDataTip: PropTypes.string,
    searchBarComponent: PropTypes.object,
    textStyle: PropTypes.object
  }

  static defaultProps = {
    placeholder: '未选择',
    noDataTip: '查无数据',
    showSelectAllBtn: false,
    optionDisabledPredicate: _.noop,
    getValueFromOption: option => option,
    getTitleFromOption: option => option,
    renderTitle: titles => titles.join(', '),
    renderText: titles => titles.join(', '),
    textStyle: {maxWidth: 'calc(100% - 20px)'}
  }

  state = {
    tempValue: [],
    searching: null,
    _popoverVisible: false
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
      tempValue: props.value || []
    })
  }

  cleanSelections = () => {
    return this.setStatePromise({
      tempValue: []
    })
  }

  selectAll = () => {
    let {options, getValueFromOption, value} = this.props
    return this.setStatePromise({
      tempValue: _.uniq(options.map(getValueFromOption).concat(value))
    })
  }

  renderPopoverContent() {
    let {
      isLoading, options, onSearch, value, getValueFromOption, getTitleFromOption, disabled, showSelectAllBtn,
      noDataTip, optionDisabledPredicate, onSearchBarPressEnter, searchBarPlaceholder, searchBarComponent
    } = this.props
    let {tempValue, searching} = this.state
    let eqSet = new Set(tempValue || [])
    let optionValues = options.map(getValueFromOption)
    let finalOptions
    let savedEq = value || []
    if (searching) {
      finalOptions = options
        .filter(op => smartSearch(searching, getTitleFromOption(op)))
        .map(getValueFromOption)
      savedEq = savedEq.filter(f => f.includes(searching))
    } else {
      finalOptions = optionValues
    }
    // 将已经选择了的项排到前面
    let savedEqSet = new Set(savedEq)
    finalOptions = savedEq.concat(finalOptions.filter(val => !savedEqSet.has(val)))

    // 默认第一项增加空值查询选项（fix #152)
    let showCleanSelectionBtn = (value || []).length || (tempValue || []).length
    let SearchBarComponent = searchBarComponent || InputWithAutoFocus
    return (
      <div style={{height: showCleanSelectionBtn || showSelectAllBtn ? 290 : 265, width: 220}}>
        <div className="filter-setting-popover">
          <SearchBarComponent
            className="mg1"
            style={{width: 'calc(100% - 10px)'}}
            placeholder={searchBarPlaceholder || '搜索'}
            value={searching}
            disabled={!onSearch}
            onChange={evOrVal => {
              let value = _.isString(evOrVal || '') ? evOrVal : evOrVal.target.value
              this.setState({searching: value}, () => onSearch(value))
            }}
            onPressEnter={onSearchBarPressEnter}
          />
          <div className="fix">
            <div className="fleft">
              {
                showCleanSelectionBtn
                ? (
                  <span
                    onClick={this.cleanSelections}
                    className="itblock pd1 pd2l pointer"
                  >清除选择的内容</span>
                )
                : null
              }
            </div>
            <div className="fright">
              {
                showSelectAllBtn && options.length
                ? <span
                    onClick={this.selectAll}
                    className="itblock pd1 pd2r pointer"
                  >全选</span>
                : null
              }
            </div>
          </div>
          <Loading isLoading={isLoading}>
            {isLoading || finalOptions.length
              ? null
              : <div className="aligncenter pd3t width-100 pd1x" style={{position: 'absolute'}}>{noDataTip}</div>}
            <Menu
              prefixCls="ant-select-dropdown-menu"
              className="anlytic-filter-menu"
              style={{
                overflow: 'auto',
                maxHeight: 'none',
                height: '220px'
              }}
            >
              {finalOptions.map(val => {
                let obj = _.find(options, op => {
                  return getValueFromOption(op) === val
                })
                let title = obj
                  ? getTitleFromOption(obj)
                  : val
                return (
                  <Menu.Item key={val}>
                    <Tooltip title={<p className="wordbreak">{title}</p>} placement="left">
                      <Checkbox
                        checked={eqSet.has(val)}
                        disabled={disabled || optionDisabledPredicate(obj)}
                        onChange={ev => {
                          let newEq
                          if (ev.target.checked) {
                            newEq = tempValue.concat([val])
                          } else {
                            newEq = tempValue.filter(prev => prev !== val)
                          }
                          this.setState({
                            tempValue: newEq
                          })
                        }}
                      >
                        <HighLightString
                          className="iblock elli tile-filter-item"
                          text={title}
                          highlight={searching}
                        />
                      </Checkbox>
                    </Tooltip>
                  </Menu.Item>
                )
              })}
            </Menu>
          </Loading>
        </div>
      </div>
    )
  }

  render() {
    let {
      onChange,
      popoverVisible = this.state._popoverVisible,
      onPopoverVisibleChange = visible => this.setState({_popoverVisible: visible}),
      value,
      getValueFromOption,
      getTitleFromOption,
      placeholder,
      options,
      className,
      style,
      renderTitle,
      renderText,
      textStyle,
      arrowPointAtCenter = true,
      placement = 'bottom',
      getPopupContainer
    } = this.props
    let optionValueTree = _.keyBy(options, getValueFromOption)

    let content = (
      <div>
        {this.renderPopoverContent()}

        <div className="aligncenter pd2b">
          <Button
            type="ghost"
            className="mg3r"
            onClick={() => {
              onPopoverVisibleChange(false)
              this.initTempValuesFromProps(this.props).then(() => {
                onChange(_.clone(this.state.tempValue))
              })
            }}
          >取消</Button>
          <Button
            type="primary"
            onClick={() => {
              onPopoverVisibleChange(false)
              onChange(_.clone(this.state.tempValue))
            }}
          >确认</Button>
        </div>
      </div>
    )
    let titles = (value || [])
      .map(v => {
        let obj = optionValueTree[v]
        return obj
          ? getTitleFromOption(obj)
          : v
      })
    let title = renderTitle(titles)
    let text = renderText(titles)
    return (
      <Popover
        getPopupContainer={getPopupContainer}
        overlayClassName="custom-filter-popover"
        placement={placement}
        trigger="click"
        arrowPointAtCenter={arrowPointAtCenter}
        content={content}
        visible={popoverVisible}
        onVisibleChange={visible => {
          if (visible) {
            onPopoverVisibleChange(true)
          } else {
            // 点击下拉框不关闭 popover，点击外面才关闭
            //if (document.activeElement.tagName === 'BODY') {
            onPopoverVisibleChange(false)
            this.initTempValuesFromProps(this.props).then(() => {
              onChange(_.clone(this.state.tempValue))
            })
            //}
          }
        }}
      >
        <Button
          className={className}
          style={{paddingLeft: '8px', paddingRight: '8px', ...(style || {})}}
        >
          {
            value && value.length
            ? <span title={title} className="elli fleft" style={textStyle}>{text}</span>
            : <span className="color-ccc fleft">{placeholder}</span>
          }
          <Icon className="fright line-height24 color-grey font12" type="down" />
        </Button>
      </Popover>
    )
  }
}

