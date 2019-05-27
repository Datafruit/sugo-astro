import _ from 'lodash'
import React, {PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import elementResizeEvent, { unbind } from 'element-resize-event'
import setStatePromise from '../../common/set-state-promise'

function pxStr2Num(str) {
  return str.substr(0, str.length - 2) * 1
}

@setStatePromise
export default class SizeProvider extends React.Component {

  static defaultProps = {
    doMeasure: true,
    cleanSizeWhenMeasure: false
  }

  static propTypes = {
    children: PropTypes.func.isRequired,
    onSizeChange: PropTypes.func,
    doMeasure: PropTypes.bool,
    cleanSizeWhenMeasure: PropTypes.bool
  }

  state =  {
    spWidth: null,
    spHeight: null
  }

  mounted = false

  componentDidMount() {
    this.mounted = true

    let rootNode = ReactDOM.findDOMNode(this) // div.height-100
    this.monitorNode = rootNode.parentNode
    elementResizeEvent(this.monitorNode, this.onParentResizeDebounced)

    if (this.props.doMeasure) {
      this.onParentResizeDebounced()
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevProps.doMeasure && this.props.doMeasure) {
      this.onParentResizeDebounced()
    }
  }
  
  componentWillUnmount() {
    if (this.monitorNode) {
      unbind(this.monitorNode, this.onParentResizeDebounced)
    }
    this.monitorNode = null
    this.mounted = false
  }

  onParentResize = async () => {
    if (!this.mounted) {
      return
    }
    let {onSizeChange, cleanSizeWhenMeasure} = this.props
    if (cleanSizeWhenMeasure) {
      await this.setStatePromise({spWidth: null, spHeight: null})
    }

    let rootNode = ReactDOM.findDOMNode(this)
    if (!rootNode) {
      return
    }
    // 计算父节点的内部大小
    let parentNodeStyle = window.getComputedStyle(rootNode.parentNode)

    let paddingTop = parentNodeStyle.paddingTop
    let paddingBottom = parentNodeStyle.paddingBottom
    let paddingLeft = parentNodeStyle.paddingLeft
    let paddingRight = parentNodeStyle.paddingRight
    this.setState({
      spWidth: rootNode.parentNode.clientWidth - pxStr2Num(paddingLeft) - pxStr2Num(paddingRight),
      spHeight: rootNode.parentNode.clientHeight - pxStr2Num(paddingTop) - pxStr2Num(paddingBottom)
    }, onSizeChange && (() => onSizeChange(this.state)))
  }

  onParentResizeDebounced = _.throttle(this.onParentResize, 150, {leading: false})

  render() {
    let {children} = this.props
    if (!this.mounted) {
      return <div className="height-100" >{'\u00a0'}</div>
    }

    return children(this.state)
  }
}

export const withSizeProviderDec = (mapPropsToSizeProviderProps = _.constant({})) => ComposedComponent => props => {
  return (
    <SizeProvider {...mapPropsToSizeProviderProps(props)}>
      {({spWidth, spHeight}) => {
        return (
          <ComposedComponent
            {...props}
            spWidth={spWidth}
            spHeight={spHeight}
          />
        )
      }}
    </SizeProvider>
  )
}

export const withSizeProvider = (ComposedComponent) => props => {
  return withSizeProviderDec()(ComposedComponent)(props)
}
