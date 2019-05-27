import React from 'react'
import _ from 'lodash'

// 允许暴露一个"遥控器"组件，这个组件的属性将会覆盖 WrappedComponent 的 props，主要用于 fetcher

const withPropsRemoteControl = WrappedComponent => class extends React.Component {
  state = {
    remoteControlProps: {}
  }

  remoteControl = (() => {
    let this0 = this
    return class extends React.Component {
      componentWillMount() {
        this0.setState({ remoteControlProps: this.props })
      }
      componentWillReceiveProps(nextProps) {
        if (!_.isEqual(this.props, nextProps)) {
          this0.setState({ remoteControlProps: nextProps })
        }
      }
      componentWillUnmount() {
        this0.setState({ remoteControlProps: {} })
      }
      render() {
        return null
      }
    }
  })()

  render() {
    let {children, ...rest} = this.props
    return (
      <WrappedComponent {...rest} {...this.state.remoteControlProps}>
        {(props)=>{
          return children({...props, remoteControl: this.remoteControl})
        }}
      </WrappedComponent>
    )
  }
}

export default withPropsRemoteControl