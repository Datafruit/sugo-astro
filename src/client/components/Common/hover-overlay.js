/**
 * Created by heganjie on 16/9/28.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import {Icon} from 'antd'
import _ from 'lodash'

export default class HoverOverlay extends React.Component {
  static propTypes = {
    children: PropTypes.object,
    style: PropTypes.object,
    overlayComponent: PropTypes.func,
    overlayVisible: PropTypes.bool
  }

  static defaultProps = {
    style: {},
    overlayComponent: props => <Icon type="caret-down" {...props} />
  }

  state = {
    isHover: false
  }

  render() {
    let {children, style, overlayComponent, overlayVisible, ...rest} = this.props
    let {isHover} = this.state

    let isHoverFinal = overlayVisible === undefined ? isHover : overlayVisible
    return (
      <div
        {...rest}
        style={_.assign({position: 'relative'}, style)}
        onMouseEnter={() => this.setState({isHover: true})}
        onMouseLeave={() => this.setState({isHover: false})}
      >
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            height: '100%',
            width: '100%',
            zIndex: 4,
            backgroundColor: 'rgba(255,255,255,0.65)',
            transition: '.2s',
            opacity: isHoverFinal ? 1 : 0
          }}
        >
          {overlayComponent({style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transition: '.2s',
            transform: 'translate(-50%,-50%)',
            opacity: isHoverFinal ? 1 : 0
          }})}
        </div>
        {children}
      </div>
    )
  }
}
