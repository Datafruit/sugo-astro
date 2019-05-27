/**
 * 协助子组件获得是否被用户看见的状态
 * https://stackoverflow.com/questions/487073/check-if-element-is-visible-after-scrolling
 * https://stackoverflow.com/questions/24270036/listening-to-all-scroll-events-on-a-page
 */


export function isScrolledIntoView(el) {
  let rect = el.getBoundingClientRect(), top = rect.top, height = rect.height
  el = el.parentNode
  do {
    rect = el.getBoundingClientRect()
    if (top <= rect.bottom === false) return false
    // Check if the element is out of view due to a container scrolling
    if ((top + height) < rect.top) return false
    el = el.parentNode
  } while (el !== document.body)
  // Check its within the document viewport
  return top <= document.documentElement.clientHeight
}

import React, {Component, PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import setStatePromise from '../../common/set-state-promise'

@setStatePromise
export default class IsInViewport extends Component {
  static propTypes = {
    onIsInViewportChange: PropTypes.func,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node])
  }

  static defaultProps = {
    children: _.constant(<div />)
  }

  state = {
    onceInViewport: false,
    isInViewport: false,
    autoWrapped: false // 保证 findDOMNode 不返回 null
  }

  async componentDidMount() {
    let rootNode = ReactDOM.findDOMNode(this)
    if (rootNode) {
      await this.initDetector(rootNode)
    } else {
      await this.setStatePromise({autoWrapped: true})
      await this.initDetector(ReactDOM.findDOMNode(this))
    }
    // 可能一开始就在视线内
    this.onWindowScrollThrottle()
  }

  async initDetector(rootNode) {
    this.node = rootNode
    let isInViewport = isScrolledIntoView(rootNode)
    await this.setStatePromise({
      isInViewport: isInViewport,
      onceInViewport: isInViewport
    })

    document.addEventListener('scroll', this.onWindowScrollThrottle, true)
  }

  componentDidUpdate() {
    // 界面内容改变可能会导致控件不可见
    this.onWindowScrollThrottle()
  }

  componentWillUnmount() {
    if (this.node) {
      document.removeEventListener('scroll', this.onWindowScrollThrottle, true)
    }
  }

  onWindowScroll = () => {
    // unmount 后可能导致 parentNode 为 null，忽略后续操作
    if (!this.node || !this.node.parentNode) {
      return
    }
    let isInViewport = isScrolledIntoView(this.node)
    if (isInViewport !== this.state.isInViewport) {
      let {onIsInViewportChange} = this.props
      if (onIsInViewportChange) {
        onIsInViewportChange(isInViewport)
      }
      if (isInViewport) {
        this.setState({isInViewport: true, onceInViewport: true})
      } else {
        this.setState({isInViewport: false})
      }
    }
  }

  onWindowScrollThrottle = _.throttle(this.onWindowScroll, 150)

  resetState = () => {
    if (!isScrolledIntoView(this.node)) {
      this.setState({onceInViewport: false, isInViewport: false})
    }
  }

  render() {
    let {children} = this.props
    if (!_.isFunction(children)) {
      return children
    }
    let {autoWrapped} = this.state
    if (autoWrapped) {
      return (
        <div>
          {children({...this.state, resetState: this.resetState})}
        </div>
      )
    }
    return children({...this.state, resetState: this.resetState})
  }
}

export function isInViewportDec(Component) {
  return props => (
    <IsInViewport>
      {state => {
        return (
          <Component
            {...props}
            {...state}
          />
        )
      }}
    </IsInViewport>
  )
}
