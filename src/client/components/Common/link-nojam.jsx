/**
 * 无阻塞链接
 * 当页面还在加载数据,使用强制路径变更
 * 否则使用history api更改状态
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import {Link} from 'react-router'

export default class LinkNoJam extends React.Component {

  static propTypes = {
    to: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }

  static defaultProps = {
    onClick: function() {}
  }

  onClick = (e, to) => {
    if (window.__fetchCount) {
      e.preventDefault()
      window.location = to
    }
    this.props.onClick(to, e)
  }

  render() {
    let {to, children = '', ...rest} = this.props
    return (
      <Link
        to={to}
        {...rest}
        onClick={e => this.onClick(e, to)}
      >{children}</Link>
    )
  }
}
