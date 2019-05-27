
//countdown
import React, {PropTypes} from 'react-proptypes-proxy'

export default class Bread extends React.Component {

  static propTypes = {
    count: PropTypes.number,
    state: PropTypes.string, // 'init', 'start', 'pause', 'reset'
    children: PropTypes.func.isRequired
  }

  static defaultProps = {
    count: 60, //秒
    state: 'init'
    /* children example
    children: ({ count, onCountdown }) => {
      return (
        <Button
          type="ghost"
          disabled={onCountdown}
          onClick={doSomething}
        />{count}秒后可以再次发送</Button>
      )
    }
    */
  }

  constructor(props) {
    super(props)
    let {count, state} = this.props
    this.state = {
      total: count + 0,
      count,
      state,
      onCountdown: false,
      pause: false
    }
  }

  componentWillReceiveProps(nextProps) {
    let {index, state} = nextProps
    if (index === this.props.index) return
    this.setState({
      state
    })
    this[state]()
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  init = () => {
    this.reset()
  }

  pause = () => {
    this.setState({
      pause: true
    })
  }

  reset = () => {
    clearTimeout(this.timer)
    this.setState({
      pause: false,
      count: this.state.total,
      onCountdown: false,
      state: 'init'
    })
  }

  count = () => {
    let {count, pause} = this.state
    let nextCount = count - 1
    if (nextCount < 0) nextCount = 0

    let state = {
      count: nextCount
    }

    if (!nextCount) {
      return this.reset()
    }

    if(!pause) {
      this.setState(state)
    }
    this.start()
  }

  start = () => {
    this.setState({
      onCountdown: true
    })
    this.timer = setTimeout(this.count, 1000) 
  }

  render() {
    let {children} = this.props
    return (
      children(this.state)
    )
  }

}

