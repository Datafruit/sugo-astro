
import React, {PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import _ from 'lodash'

const placeholderTitleHeight = 30

function Separator(props) {
  let propsOverwrite = {
    ...props,
    className: `horizontal-separator ${props.className || ''}`
  }
  return (
    <div {...propsOverwrite}></div>
  )
}

const alwaysGetArray = mayByArray => !mayByArray ? [] : [].concat(mayByArray)


// children props: defaultWeight, collapseTitle

export default class VerticalSplitHelper extends React.Component {
  static propTypes = {
    isAdjustable: PropTypes.bool,
    collapseHeight: PropTypes.number
  }

  static defaultProps = {
    isAdjustable: true,
    collapseHeight: 60
  }

  state = {
    forceWeight0: null
  }

  componentWillMount() {
    let {children} = this.props
    children = alwaysGetArray(children).filter(_.identity)
    this.totalWeight = _.sum(children.map(c => (c.props.defaultWeight || 1) * 1).filter(_.isNumber))
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.children, this.props.children)) {
      let {children} = nextProps
      children = alwaysGetArray(children).filter(_.identity)

      let newWeight = _.sum(children.map(c => (c.props.defaultWeight || 1) * 1).filter(_.isNumber))

      let isChildrenLenChange = alwaysGetArray(nextProps.children).length !== alwaysGetArray(this.props.children).length
      if (isChildrenLenChange || newWeight !== this.totalWeight) {
        this.totalWeight = newWeight
        this.setState({
          forceWeight0: null
        })
      }
    }
  }

  isAdjusting = false

  onSeparatorMouseDown = (ev) => {
    ev.stopPropagation()
    ev.preventDefault()
    this.isAdjusting = true
    this.startDragY = ev.clientY
    let helperDOM = ReactDOM.findDOMNode(this)

    this.totalHeight = helperDOM.offsetHeight
    this.initHeight1 = helperDOM.children[2].offsetHeight
  }

  onMouseMoveThrottle = _.throttle(clientY => {
    let {collapseHeight} = this.props

    let offsetY = clientY - this.startDragY

    // 分隔符是占用总的高度的，不会影响 children 权重的计算（计算的时候先将总体高度减 1）
    let totalChildrenHeight = this.totalHeight - 1

    let forceHeight1 = this.initHeight1 - offsetY
    let forceHeight0 = totalChildrenHeight - forceHeight1

    if (forceHeight0 < collapseHeight) {
      // children0 折叠
      if (this.state.forceWeight0 !== 0) {
        this.setState({ forceWeight0: 0 })
      }
    } else if (forceHeight1 < collapseHeight) {
      // children1 折叠
      if (this.state.forceWeight0 !== this.totalWeight) {
        this.setState({ forceWeight0: this.totalWeight })
      }
    } else {
      this.setState({
        forceWeight0: this.totalWeight * forceHeight0 / totalChildrenHeight
      })
    }
  }, 100, {leading: false})

  onMouseUp = ev => {
    if (!this.isAdjusting) {
      return
    }
    ev.stopPropagation()
    ev.preventDefault()
    this.isAdjusting = false
  }

  renderCollapsedChild(collapseTitle) {
    return (
      <div
        key="placeholder"
        className="color-black aligncenter border-dashed mg1 pointer"
        onClick={() => {
          let children = alwaysGetArray(this.props.children)
          if (_.some(children, ch => ch && ch.props.defaultWeight === 0)) {
            this.setState({forceWeight0: this.totalWeight / 2})
          } else {
            this.setState({forceWeight0: null})
          }
        }}
      >{collapseTitle || '。。。'}</div>
    )
  }

  recreateChildren(originalChild, key) {
    let isFirstChild = key === 0
    let {forceWeight0} = this.state

    let nextHeight = null, collapsedChild = null
    if (isFirstChild) {
      if (forceWeight0 === null) {
        forceWeight0 = originalChild.props.defaultWeight || 0
      }
      if (forceWeight0 === 0) {
        collapsedChild = this.renderCollapsedChild(originalChild.props.collapseTitle)
      } else if (this.totalWeight - forceWeight0 <= 1) {
        nextHeight = `calc(100% - 1px - ${placeholderTitleHeight}px)`
      } else {
        nextHeight = `${100 * forceWeight0 / this.totalWeight}%`
      }
    } else {
      if (forceWeight0 === null) {
        forceWeight0 = _.get(alwaysGetArray(this.props.children).filter(_.identity), '[0].props.defaultWeight') || 0
      }
      if (forceWeight0 === 0) {
        nextHeight = `calc(100% - 1px - ${placeholderTitleHeight}px)`
      } else if (this.totalWeight - forceWeight0 <= 1) {
        collapsedChild = this.renderCollapsedChild(originalChild.props.collapseTitle)
      } else {
        let firstChildWidth = `${100 * forceWeight0 / this.totalWeight}%`
        nextHeight = `calc(100% - 1px - ${firstChildWidth})`
      }
    }

    let {
      type: Child,
      props: {
        collapseTitle,
        defaultWeight,
        style,
        ...rest
      },
      ref
    } = originalChild

    return [
      <Child
        key={key}
        ref={ref}
        style={{
          ...style,
          height: nextHeight === null ? undefined : nextHeight,
          display: nextHeight === null ? 'none' : undefined
        }}
        {...rest}
      />,
      collapsedChild
    ]
  }

  render() {
    let {children, isAdjustable, collapseHeight, ...rest} = this.props

    let propsOverwrite = {
      ...rest,
      className: `split-helper vertical ${rest.className || ''}`,
      style: {
        height: '100%',
        ...rest.style
      },
      onMouseMove: ev => {
        if (!this.isAdjusting) {
          return
        }
        ev.stopPropagation()
        ev.preventDefault()
        let cY = ev.clientY
        this.onMouseMoveThrottle(cY)
      },
      onMouseUp: this.onMouseUp
    }

    children = alwaysGetArray(children).filter(_.identity)

    if (children.length <= 0) {
      return (
        <div {...propsOverwrite}>
        </div>
      )
    }

    if (children.length === 1) {
      return (
        <div {...propsOverwrite}>
          {this.recreateChildren(children[0], 0)}
        </div>
      )
    }

    if (children.length === 2) {
      return (
        <div {...propsOverwrite}>
          {this.recreateChildren(children[0], 0)}
          {isAdjustable ? <Separator onMouseDown={this.onSeparatorMouseDown} /> : null}
          {this.recreateChildren(children[1], 1)}
        </div>
      )
    }

    let recurComponent = (
      <VerticalSplitHelper
        className="split-helper vertical"
        isAdjustable={isAdjustable}
        collapseHeight={collapseHeight}
        defaultWeight={this.totalWeight - children[0].props.defaultWeight}
      >
        {_.drop(children, 1)}
      </VerticalSplitHelper>
    )
    return (
      <div {...propsOverwrite}>
        {this.recreateChildren(children[0], 0)}
        {isAdjustable ? <Separator onMouseDown={this.onSeparatorMouseDown} /> : null}
        {this.recreateChildren(recurComponent, 1)}
      </div>
    )
  }
}