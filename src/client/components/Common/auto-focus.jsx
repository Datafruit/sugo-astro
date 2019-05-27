import {Component} from 'react'
import ReactDOM from 'react-dom'

// http://stackoverflow.com/a/21696585/1745885
export function isHidden(el) {
  return el.offsetParent === null
}

export default (ComposedComponent, autoFocusSelector, select, delay) => class AutoFocus extends Component {
  state = {
    runed: false
  }

  componentDidMount() {
    if (delay) {
      setTimeout(() => this.gainFocus(), delay)
    } else {
      this.gainFocus()
    }
  }

  componentWillReceiveProps(nextProps) {
    let dom = this.getDom()
    if (dom && dom.value !== nextProps.value) { //说明并不是由用户输入的，而是从上级设置的
      this.setState({runed: false})
    }
  }

  componentDidUpdate() {
    if (delay) {
      setTimeout(() => this.gainFocus(), delay)
    } else {
      if (document.body === document.activeElement) {
        this.gainFocus()
      }
    }
  }

  getDom() {
    let root = ReactDOM.findDOMNode(this)
    let dom = autoFocusSelector ? root.querySelector(autoFocusSelector) : root
    return isHidden(dom) ? null : dom
  }

  gainFocus() {
    let dom = this.getDom()
    if (dom) {
      dom.focus()
      if (!this.state.runed && select && dom.value) {
        dom.select()
        this.setState({runed: true})
      }
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}
