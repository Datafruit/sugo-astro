import React from 'react'
import {notification} from 'antd'
import _ from 'lodash'

export default class ZoomWarn extends React.Component {

  state = {
    isWarning: false
  }

  componentDidMount() {
    window.addEventListener('resize', this.onWindowResizeRef)
    this.onWindowResizeRef()
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResizeRef)
  }

  onWindowResizeRef = _.throttle(() => {
    let zoomLevel = Math.abs(window.outerWidth - window.innerWidth)
    if (zoomLevel > 10 && window.sugo.chrome) {
      if (this.state.isWarning) return
      this.setState({
        isWarning: true
      })
      notification.warning({
        message: <p className="font16">您的浏览器处于缩放状态!</p>,
        description: <p className="font11">缩放状态下，某些元素可能显示不正常，请调整到100%显示并刷新</p>,
        duration: 8,
        onClose: () => {
          this.setState({
            isWarning: false
          })
        }
      })
    }
  }, 300)

  render() {
    return null
  }
}

