import React, {PropTypes} from 'react-proptypes-proxy'
import classNames from 'classnames'
import _ from 'lodash'

export default class HighlightString extends React.Component {
  static propTypes = {
    text: PropTypes.string,
    highlight: PropTypes.any, // string or regex
    className: PropTypes.string
  }

  highlightInString() {
    let { text, highlight} = this.props
    if (!highlight) return text

    let startIndex = null
    let highlightString = null
    if (_.isFunction(highlight)) {
      if (highlight(text)) {
        return (
          <span className="bold" key="bold">{text}</span>
        )
      }
      return text
    } else if (typeof highlight === 'string') {
      let strLower = text.toLowerCase()
      startIndex = strLower.indexOf(highlight.toLowerCase())
      if (startIndex === -1) return text
      highlightString = highlight.toLowerCase()
    } else {
      let match = text.match(highlight)
      if (!match) return text
      highlightString = match[0]
      startIndex = match.index
    }
    let endIndex = startIndex + highlightString.length

    return [
      <span className="pre" key="pre">{text.substring(0, startIndex)}</span>,
      <span className="bold" key="bold">{text.substring(startIndex, endIndex)}</span>,
      <span className="post" key="post">{text.substring(endIndex)}</span>
    ]
  }

  render() {
    let { className } = this.props

    return (
      <span className={classNames('highlight-string', className)}>
        {this.highlightInString()}
      </span>
    )
  }
}
