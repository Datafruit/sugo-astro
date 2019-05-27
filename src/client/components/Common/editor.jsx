//countdown
import React, {PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import _ from 'lodash'

const DefaultCls = 'ant-input'

export default class SugoEditor extends React.Component {

  static propTypes = {
    rows: PropTypes.number,
    cols: PropTypes.number,
    className: PropTypes.string,
    value: PropTypes.string,
    style: PropTypes.object,
    disabled: PropTypes.bool,
    onChange: PropTypes.func.isRequired
  }

  static defaultProps = {
    rows: 4,
    cols: 10,
    className: '',
    style: {},
    value: ''
  }

  state = {}

  componentDidMount() {
    this.dom = ReactDOM.findDOMNode(this)
  }

  autoGrow = () => {

    let {dom} = this

    if (dom.scrollHeight > dom.clientHeight) {
      dom.style.height = (dom.scrollHeight + 10) + 'px'
    }
    //end
  }

  insertParedContent = (contentLeft, contentRight) => {
    let {dom} = this
    let nSelStart = dom.selectionStart
    let nSelEnd = dom.selectionEnd
    let sOldText = dom.value
    let len1 = contentLeft.length
    let len2 = len1 + contentRight.length

    let {onChange} = this.props

    dom.value = 
      sOldText.substring(0, nSelStart) +
      contentLeft + 
      sOldText.substring(nSelStart, nSelEnd) + 
      contentRight +
      sOldText.substring(nSelEnd)

    dom.selectionStart = nSelStart === nSelEnd?nSelStart + len1:nSelStart
    dom.selectionEnd = nSelEnd + (nSelStart === nSelEnd?len1:len2)

    onChange(dom.value)
    this.autoGrow()

  }

  onChange = e => {
    let {onChange} = this.props
    let value = e.target.value
    onChange(value)
  }

  render() {
    let {rows, cols, className, style, value, disabled} = this.props
    let cls = `${DefaultCls} ${className}`
    return (
      <textarea
        rows={rows}
        cols={cols}
        className={cls}
        style={style}
        value={value}
        disabled={disabled}
        onChange={this.onChange}
      />
    )
  }

}