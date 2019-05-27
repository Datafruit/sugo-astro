
import React, {PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import _ from 'lodash'

const placeholderTitleWidth = 30

function Separator(props) {
  let propsOverwrite = {
    ...props,
    className: `vertical-separator ${props.className || ''}`
  }
  return (
    <div {...propsOverwrite}></div>
  )
}

const alwaysGetArray = mayByArray => !mayByArray ? [] : [].concat(mayByArray)

// HorizontalSplitHelper 可能需要添加 class: height-100
// children props: defaultWeight, collapseTitle
// children 需要接收 style

export default class HorizontalSplitHelper extends React.Component {
  static propTypes = {
    isAdjustable: PropTypes.bool,
    collapseWidth: PropTypes.number
  }

  static defaultProps = {
    isAdjustable: true,
    collapseWidth: 60
  }

  state = {
    forceWeight0: null
  }

  componentWillMount() {
    let {children} = this.props
    children = alwaysGetArray(children).filter(_.identity)
    this.totalWeight = children.map(c => c.props.defaultWeight).filter(_.isNumber)
      .reduce((prev, curr) => prev + curr, 0)
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.children, this.props.children)) {
      let {children} = nextProps
      children = alwaysGetArray(children).filter(_.identity)

      let newWeight = children.map(c => c.props.defaultWeight).filter(_.isNumber)
        .reduce((prev, curr) => prev + curr, 0)

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
    this.startDragX = ev.clientX
    let helperDOM = ReactDOM.findDOMNode(this)

    this.totalWidth = helperDOM.offsetWidth
    this.initWidth1 = helperDOM.children[2].offsetWidth
  }

  onMouseMoveThrottle = _.throttle(clientX => {
    let {collapseWidth, isAdjustable} = this.props

    let offsetX = clientX - this.startDragX

    // 分隔符是占用总的宽度的，不会影响 children 权重的计算（计算的时候先将总体宽度减 1）
    let totalChildrenWidth = isAdjustable ? this.totalWidth - 1 : this.totalWeight

    let forceWidth1 = this.initWidth1 - offsetX
    let forceWidth0 = totalChildrenWidth - forceWidth1

    if (forceWidth0 < collapseWidth) {
      // 左侧折叠
      if (this.state.forceWeight0 !== 0) {
        this.setState({ forceWeight0: 0 })
      }
    } else if (forceWidth1 < collapseWidth) {
      // 右侧折叠
      if (this.state.forceWeight0 !== this.totalWeight) {
        this.setState({ forceWeight0: this.totalWeight })
      }
    } else {
      this.setState({
        forceWeight0: this.totalWeight * forceWidth0 / totalChildrenWidth
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
        className="color-black itblock aligncenter border-dashed mg1 width20 pointer"
        style={{
          height: 'calc(100% - 10px)',
          position: 'relative'
        }}
        onClick={() => this.setState({forceWeight0: null})}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            wordBreak: 'break-word'
          }}
        >
          {collapseTitle || '。。。'}
        </div>
      </div>
    )
  }

  recreateChildren(originalChild, key) {
    let isFirstChild = key === 0
    let {forceWeight0} = this.state

    let totalChildrenWidth = this.props.isAdjustable ? '100% - 1px' : '100%'

    let nextWidth = null, collapsedChild = null
    if (isFirstChild) {
      if (forceWeight0 === 0) {
        collapsedChild = this.renderCollapsedChild(originalChild.props.collapseTitle)
      } else if (forceWeight0 === this.totalWeight) {
        nextWidth = `calc(${totalChildrenWidth} - ${placeholderTitleWidth}px)`
      } else {
        nextWidth = `${100 * (forceWeight0 || originalChild.props.defaultWeight) / this.totalWeight}%`
      }
    } else {
      if (forceWeight0 === 0) {
        nextWidth = `calc(${totalChildrenWidth} - ${placeholderTitleWidth}px)`
      } else if (forceWeight0 === this.totalWeight) {
        collapsedChild = this.renderCollapsedChild(originalChild.props.collapseTitle)
      } else {
        let firstChildWidth = `${100 * (forceWeight0 || this.props.children[0].props.defaultWeight) / this.totalWeight}%`
        nextWidth = `calc(${totalChildrenWidth} - ${firstChildWidth})`
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
        ref={ref}
        key={key}
        style={{
          ...style,
          width: nextWidth === null ? undefined : nextWidth,
          display: nextWidth === null ? 'none' : 'inline-block',
          verticalAlign: 'top'
        }}
        {...rest}
      />,
      collapsedChild
    ]
  }

  render() {
    let {children, isAdjustable, collapseWidth, ...rest} = this.props

    let propsOverwrite = {
      ...rest,
      className: `split-helper horizontal ${rest.className || ''}`,
      onMouseMove: ev => {
        if (!this.isAdjusting) {
          return
        }
        ev.stopPropagation()
        ev.preventDefault()
        let cX = ev.clientX
        this.onMouseMoveThrottle(cX)
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
      <HorizontalSplitHelper
        className="height-100 itblock split-helper horizontal"
        isAdjustable={isAdjustable}
        collapseWidth={collapseWidth}
        defaultWeight={this.totalWeight - children[0].props.defaultWeight}
      >
        {_.drop(children, 1)}
      </HorizontalSplitHelper>
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
