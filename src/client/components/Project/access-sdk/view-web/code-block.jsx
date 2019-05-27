import React, { PropTypes } from 'react'
import * as hljs from 'highlight.js'
import './mark-down.styl'

/**
 * Web SDK
 */
hljs.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'))
hljs.registerLanguage('json', require('highlight.js/lib/languages/json'))

/**
 * Android SDK
 */
hljs.registerLanguage('groovy', require('highlight.js/lib/languages/groovy'))
hljs.registerLanguage('xml', require('highlight.js/lib/languages/xml'))
hljs.registerLanguage('java', require('highlight.js/lib/languages/java'))

/**
 * iOS SDK (Swift + Objective-C)
 */
hljs.registerLanguage('objectivec', require('highlight.js/lib/languages/objectivec'))
hljs.registerLanguage('swift', require('highlight.js/lib/languages/swift'))
hljs.registerLanguage('nginx', require('highlight.js/lib/languages/nginx'))
hljs.registerLanguage('cmake', require('highlight.js/lib/languages/cmake'))

export default class CodeBlock extends React.Component {

  static defaultProps = {
    language: ''
  }

  static propTypes = {
    value: PropTypes.string.isRequired,
    language: PropTypes.string
  }

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    //hljs.registerLanguage(this.props.language, require('./languages/'+this.props.language))
    this.highlightCode()
  }

  componentDidUpdate() {
    this.highlightCode()
  }

  setRef = (el) => {
    this.codeEl = el
  }

  highlightCode = () => {
    //console.log("----", hljs)
    hljs.highlightBlock(this.codeRef)
  }

  render() {
    return (
      <pre className="markdown-pre">
        <code
          ref={ref => this.codeRef = ref}
          className={this.props.language}
        >
          {this.props.value}
        </code>
      </pre>
    )
  }
}
