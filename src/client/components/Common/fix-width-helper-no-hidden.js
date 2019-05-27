/**
 * Created by heganjie on 2016/10/31.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import classNames from 'classnames'

export default class FixWidthHelperNoHidden extends React.Component {
  static propTypes = {
    toFix: PropTypes.oneOf(['first', 'last']).isRequired,
    children: PropTypes.array.isRequired,
    toFixWidth: PropTypes.string,
    wrapperStyle: PropTypes.object,
    wrapperClass: PropTypes.string,
    wrapperClassFirst: PropTypes.string,
    wrapperClassLast: PropTypes.string
  }

  static defaultProps = {toFixWidth: '200px'}


  render() {
    let {
      children, toFixWidth, toFix, wrapperStyle, wrapperClass, wrapperClassFirst, wrapperClassLast, ...rest
    } = this.props

    if (toFix === 'first') {
      return (
        <div {...rest}>
          <div
            className={classNames('itblock', wrapperClass, wrapperClassFirst)}
            style={{...wrapperStyle, width: toFixWidth}}
          >
            {children[0]}
          </div>
          <div
            className={classNames('itblock', wrapperClass, wrapperClassLast)}
            style={{...wrapperStyle, width: `calc(100% - ${toFixWidth})`}}
          >
            {_.drop(children, 1)}
          </div>
        </div>
      )
    }
    return (
      <div {...rest}>
        <div
          className={classNames('itblock', wrapperClass, wrapperClassFirst)}
          style={{...wrapperStyle, width: `calc(100% - ${toFixWidth})`}}
        >
          {_.take(children, children.length - 1)}
        </div>
        <div
          className={classNames('itblock', wrapperClass, wrapperClassLast)}
          style={{...wrapperStyle, width: toFixWidth}}
        >
          {_.last(children)}
        </div>
      </div>
    )
  }
}
