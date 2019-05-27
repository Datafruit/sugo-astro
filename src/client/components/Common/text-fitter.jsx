import React from 'react'
import {withSizeProvider} from './size-provider'
import measureTextWidth from '../../common/measure-text-width'
import _ from 'lodash'

class TextFitter extends React.Component {
  state = {
    fittedFontSize: 12
  }

  componentWillMount() {
    this.state.fittedFontSize = this.props.maxFontSize || 12
  }

  componentDidMount() {
    this.setState({
      fittedFontSize: this.calcMaxFontSize()
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props, nextProps)) {
      this.setState({
        fittedFontSize: this.calcMaxFontSize(nextProps)
      })
    }
  }

  calcMaxFontSize(props = this.props) {
    let {text, fontFamily = 'sans-serif', maxFontSize, spWidth} = props

    let maxTextLength = measureTextWidth(text, maxFontSize, fontFamily)
    if (maxTextLength < spWidth - 10) {
      return maxFontSize
    }
    // maxFontSize / maxWidth == ? / spWidth
    return maxFontSize * (spWidth - 10) / maxTextLength
  }

  render() {
    let {text, fontFamily, maxFontSize, spWidth, spHeight, ...rest} = this.props
    let {fittedFontSize} = this.state
    return (
      <span style={{fontSize: fittedFontSize}} {...rest}>{text}</span>
    )
  }
}

export default withSizeProvider(TextFitter)
