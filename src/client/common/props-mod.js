/**
 * 一个组件的装饰器，传入的 mapper 可以修改被装饰组件的 props
 */
import React from 'react'
import _ from 'lodash'

export default function propsModDec(mapper = _.identity) {
  return Component => props => <Component {...mapper(props)} />
}