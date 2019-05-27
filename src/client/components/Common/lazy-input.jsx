import React from 'react'
import {Input} from 'antd'

function withLazyOnChange(WrappedComponent) {
  return class WithLazyOnChange extends React.Component {
    state = {
      tempVal: undefined
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.value !== nextProps.value) {
        this.setState({tempVal: undefined})
      }
    }

    onChange = (ev) => {
      this.setState({tempVal: ev.target.value})
    }

    render() {
      let {onChange, value, ...rest} = this.props
      let {tempVal} = this.state
      return (
        <WrappedComponent
          value={tempVal === undefined ? value : tempVal}
          onChange={this.onChange}
          onBlur={onChange}
          {...rest}
        />
      )
    }
  }
}

export default withLazyOnChange(Input)
