/**
 * Created by heganjie on 2016/10/13.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'

export default class FixWidthHelper extends React.Component {
  static propTypes = {
    toFix: PropTypes.oneOf(['first', 'last']).isRequired,
    children: PropTypes.array.isRequired,
    toFixWidth: PropTypes.string
  }

  static defaultProps = {toFixWidth: '200px'}


  render() {
    let {children, toFixWidth, toFix, ...rest} = this.props
    return (
      <div {...rest}>
        <div style={{width: toFixWidth, float: toFix === 'first' ? 'left' : 'right'}} >
          {toFix === 'first' ? children[0] : _.last(children)}
        </div>
        <div style={{overflow: 'hidden'}}>
          {toFix === 'first' ? _.drop(children, 1) : _.take(children, children.length - 1)}
        </div>
      </div>
    )
  }
}
