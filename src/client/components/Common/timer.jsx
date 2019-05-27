import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'

export default class Timer extends React.Component {
  static propTypes = {
    interval: PropTypes.number.isRequired,
    onTick: PropTypes.func,
    children: PropTypes.func
  }

  static defaultProps = {
    onTick: _.noop
  }

  state = {

  }

  // 避免判断 onTick prop 变更
  _onTick = () => {
    this.props.onTick()
  }

  componentDidMount() {
    this.timerId = setInterval(this._onTick, this.props.interval)
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.interval !== nextProps.interval) {
      clearInterval(this.timerId)
      this.timerId = setInterval(this._onTick, nextProps.interval)
    }
  }

  componentWillUnmount() {
    clearInterval(this.timerId)
  }

  render() {
    let {children} = this.props
    if (!_.isFunction(children)) {
      return null
    }
    return children(this.state)
  }
}
