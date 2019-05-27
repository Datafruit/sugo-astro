//自动调整卡片列表的宽度
import _ from 'lodash'

//decorate class 
export function autoWidth(target) {

  target.prototype.calculateWidth = function (options) {

    //slice width compute
    let {dom, margin, offset} = options
    let width = dom.clientWidth - offset
    let maxItem = Math.floor(width / 300)
    let extra = width - 300 * maxItem
    maxItem = extra >= margin * (maxItem - 1) ? maxItem : maxItem - 1
    let sliceWidth = (width - margin * (maxItem - 1)) / maxItem

    //which slice should show
    this.setState({
      sliceWidth,
      maxItem
    }, this.calculateVisibleSlice.bind(this, options))

  }

  target.prototype.onWindowResize = function (options) {
    this.calculateWidth(options)
  }

  target.prototype.calculateVisibleSlice = function ({scrollTop = 0, topOffset, sliceHeight}) {
    let {maxItem, shouldShowCount} = this.state
    let wh = window.innerHeight
    let shouldShowCount1 = Math.ceil((wh - topOffset + scrollTop) / sliceHeight) * maxItem
    this.setState({
      shouldShowCount: shouldShowCount1 > shouldShowCount ? shouldShowCount1 : shouldShowCount
    })
  }

  target.prototype.onScroll = function (options, e = {
    target: {
      scrollTop: 0
    }
  }) {
    this.calculateVisibleSlice({...options, scrollTop: e.target.scrollTop})
  }

  target.prototype.initOnResize = function ({
    dom = document.getElementById('main-content'),
    margin = 15,
    offset = 71,
    topOffset = 109,
    sliceHeight = 408,
    scrollDom = document.getElementById('scroll-content')
  }) {
    let options = {dom, margin, offset, topOffset, sliceHeight, scrollDom}
    this.onWindowResizeRef = _.debounce(this.onWindowResize.bind(this, options), 30)
    this.onScrollRef = _.debounce(this.onScroll.bind(this, options), 30)
    this.scrollDom = scrollDom
    window.addEventListener('resize', this.onWindowResizeRef)
    scrollDom.addEventListener('scroll', this.onScrollRef)
    this.onWindowResize(options)
  }

  target.prototype.removeResizeEvt = function () {
    window.removeEventListener('resize', this.onWindowResizeRef)
    this.scrollDom.removeEventListener('scroll', this.onScrollRef)
    this.onWindowResizeRef.cancel()
    this.onScrollRef.cancel()
  }

}
