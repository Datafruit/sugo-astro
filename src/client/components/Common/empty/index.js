/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-18 21:08:52
 * @modify date 2019-03-18 21:08:52
 * @description [description]
 */
import React from 'react'
import classNames from 'classnames'
import emptyImg from '../../../images/empty.svg'
import './css.styl'

export class Empty extends React.PureComponent {
  render() {
    const {
      className,
      image,
      description = '暂无数据',
      children,
      ...restProps
    } = this.props
  
    const des = description
    const alt = typeof des === 'string' ? des : 'empty'
  
    let imageNode = null
    if (!image) {
      imageNode = <img alt={alt} src={emptyImg} />
    } else if (typeof image === 'string') {
      imageNode = <img alt={alt} src={image} />
    } else {
      imageNode = image
    }
    const prefixCls = 'sugo-empty'
    return (
      <div className={classNames(prefixCls, className)} {...restProps}>
        <div className={`${prefixCls}-image`}>{imageNode}</div>
        <p className={`${prefixCls}-description`}>{des}</p>
        {children && <div className={`${prefixCls}-footer`}>{children}</div>}
      </div>
    )
  }
}
