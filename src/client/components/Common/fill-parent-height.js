/**
 * Created by heganjie on 2017/6/20.
 */
import React from 'react'
import {withSizeProviderDec} from '../Common/size-provider'

export default function fillParentHeight(WrappedComponent) {
  @withSizeProviderDec(props => ({doMeasure: props.doMeasure, cleanSizeWhenMeasure: true}))
  class FillParentHeight extends React.Component {
    render() {
      let {spWidth, spHeight, style, doMeasure, ...rest} = this.props
      if (!spHeight) {
        return (
          <WrappedComponent {...rest} style={style} />
        )
      }
      return (
        <WrappedComponent {...rest} style={{...style, height: spHeight}} />
      )
    }
  }
  return FillParentHeight
}
