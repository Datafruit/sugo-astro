import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {Tag, Select} from 'antd'
import {withDebouncedOnChange} from '../Common/with-debounce-on-change'
import Search from './search'
import withAutoFocus from '../Common/auto-focus'
import classNames from 'classnames'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const CheckableTag = Tag.CheckableTag
const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 500)
const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange, 'input')

export default class CommonFilter extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired
  }

  state = {
    searching: null,
    selectedGroupKey: null
  }

  setCurrentSearching = val => {
    if (val === this.state.searching) {
      return
    }
    this.setState({searching: val})
  }

  setCurrentGroupKey = key => {
    if (_.isEqual(key, this.state.selectedGroupKey)) {
      return
    }
    this.setState({selectedGroupKey: key})
  }

  setCommonFilterState = (newState, callback) => {
    this.setState(newState, callback)
  }

  onKeywordChange = val => this.setState({searching: val})

  renderKeywordFilter = (props) => {
    let {enableAutoFocus} = this.props

    let Input0 = enableAutoFocus ? InputWithAutoFocus : InputWithDebouncedOnChange

    let {searching} = this.state

    return (
      <Input0
        value={searching || undefined}
        onChange={this.onKeywordChange}
        {...props}
      />
    )
  }

  renderGroupSelector = (props) => {
    let {innerRef, onChange, children, ...rest} = props
    let {selectedGroupKey} = this.state
    let inChildren = _.find(children, c => {
      return c.props.value === selectedGroupKey
    })
    let value = inChildren || !selectedGroupKey
      ? selectedGroupKey || undefined
      : '项目不可用'

    // 如果没有 Option 时，不显示 id
    /*    if (selectedGroupKey) {
          if (_.isArray(children) && !_.some(children, c => c.props.value === selectedGroupKey)) {
            selectedGroupKey = undefined
          }
        }*/
    return (
      <Select
        {...enableSelectSearch}
        value={value}
        onChange={val => {
          this.setCurrentGroupKey(val)
          onChange && onChange(val)
        }}
        dropdownMatchSelectWidth={false}
        ref={innerRef}
        children={children}
        {...rest}
      />
    )
  }

  appendGroup = groupId => {
    this.setState(prevState => {
      return {
        selectedGroupKey: _.uniq([...(prevState.selectedGroupKey || []), groupId])
      }
    })
  }

  removeFromGroups = groupId => {
    this.setState(prevState => {
      return {
        selectedGroupKey: prevState.selectedGroupKey.filter(tId => tId !== groupId)
      }
    })
  }

  renderCheckableTag = props => {
    let {tagId, uncheckedStyle, uncheckedClass, style, className, ...rest} = props
    let {selectedGroupKey} = this.state

    let isChecked = _.isArray(selectedGroupKey) ? _.includes(selectedGroupKey, tagId) : selectedGroupKey === tagId
    return (
      <CheckableTag
        onChange={checked => {
          if (checked) {
            this.appendGroup(tagId)
          } else {
            this.removeFromGroups(tagId)
          }
        }}
        checked={isChecked}
        style={isChecked ? style : {...style, ...uncheckedStyle}}
        className={classNames(className, {[uncheckedClass]: !isChecked})}
        {...rest}
      />
    )
  }

  mergedFilterCreator = (
    keywordFilterGen = () => () => true,
    groupFilterGen = () => () => true,
    selectedGroupKey0
  ) => {
    let {searching, selectedGroupKey} = this.state
    let key = selectedGroupKey0 || selectedGroupKey
    return _.overEvery(_.compact([
      searching && keywordFilterGen(searching),
      key && groupFilterGen(key)
    ]))
  }

  render() {
    let {children} = this.props
    return children({
      ...this.state,

      keywordInput: this.renderKeywordFilter,
      groupSelector: this.renderGroupSelector,
      checkableTag: this.renderCheckableTag,

      setCurrentGroupKey: this.setCurrentGroupKey,
      setCurrentSearching: this.setCurrentSearching,
      setCommonFilterState: this.setCommonFilterState,

      mergedFilterCreator: this.mergedFilterCreator,
      keyword: this.state.searching
    })
  }
}

export const withCommonFilterDec = (enableAutoFocus = false) => Component => props => {
  return withCommonFilter(Component, enableAutoFocus)(props)
}

export const withCommonFilter = (Component, enableAutoFocus = false) => props => {
  return (
    <CommonFilter enableAutoFocus={enableAutoFocus} >
      {(injection)=>{
        return (
          <Component
            {...props}
            {...injection}
          />
        )
      }}
    </CommonFilter>
  )
}
