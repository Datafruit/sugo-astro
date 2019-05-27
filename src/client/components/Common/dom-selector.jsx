
import React, {PropTypes} from 'react-proptypes-proxy'
import ReactDOM from 'react-dom'
import {isEqualWithFunc} from '../../../common/sugo-utils'

// 因为 antd 的文件上传 picture-card 不支持选择，所以就有了这个
export default class DomSelector extends React.Component {
  static propTypes = {
    selectableDomSelector: PropTypes.string.isRequired,
    inactiveStyle: PropTypes.object,
    activeStyle: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    children: PropTypes.any.isRequired,
    idIndexList: PropTypes.array.isRequired,
    currentSelectedId: PropTypes.any
  }

  static defaultProps = {

  }

  propsUpdated = false

  componentDidMount() {
    this.prepare()

    this.root.addEventListener('click', this.onRootClick)
  }

  prepare() {
    // 初次设置 class
    let {selectableDomSelector, idIndexList, currentSelectedId, inactiveStyle, activeStyle} = this.props
    this.root = ReactDOM.findDOMNode(this)
    let doms = this.root.querySelectorAll(selectableDomSelector)
    doms.forEach((dom, i) => {
      dom.setAttribute('data-extra-id', idIndexList[i])
      if (idIndexList[i] === currentSelectedId) {
        Object.assign(dom.style, activeStyle)
      } else {
        Object.assign(dom.style, inactiveStyle)
      }
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!isEqualWithFunc(this.props, nextProps)) {
      this.propsUpdated = true
    }
  }

  componentDidUpdate() {
    if (this.propsUpdated) {
      this.prepare()
      this.propsUpdated = false
    }
  }

  componentWillUnmount() {
    this.root.removeEventListener('click', this.onRootClick)
    this.root = null
  }

  onRootClick = ev => {
    const recurFindBindingId = (dom) => {
      if (dom === this.root) {
        return null
      }
      let selectedId = dom.getAttribute('data-extra-id')
      if (selectedId) {
        return selectedId
      }
      return recurFindBindingId(dom.parentNode)
    }
    let selectedId = recurFindBindingId(ev.target)
    if (!selectedId) {
      return
    }
    let {onSelect} = this.props
    onSelect(selectedId)
  }

  render() {
    return this.props.children
  }
}

