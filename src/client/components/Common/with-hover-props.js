/**
 * Created by heganjie on 2017/6/19.
 * 可用于包装 Icon，实现鼠标移上后变更图标
 */
import React, {PropTypes} from 'react-proptypes-proxy'

const withHoverProps = WrappedComponent => class extends React.Component {
  static propTypes = {
    hoverProps: PropTypes.object
  }

  static defaultProps = {
    hoverProps: {}
  }

  state = {
    isMouseOver: false
  }

  onMouseOver = () => this.setState({isMouseOver: true})
  onMouseOut = () => this.setState({isMouseOver: false})

  render() {
    let {hoverProps, ...rest} = this.props
    let {isMouseOver} = this.state
    return (
      <WrappedComponent
        onMouseOver={this.onMouseOver}
        onMouseOut={this.onMouseOut}
        {...rest}
        {...(isMouseOver ? hoverProps : {})}
      />
    )
  }
}
export default withHoverProps
