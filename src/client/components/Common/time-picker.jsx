
import React, {PropTypes} from 'react-proptypes-proxy'
import {Popover, Icon, Button, DatePicker, Tooltip} from 'antd'
import moment from 'moment'
import _ from 'lodash'
import classNames from 'classnames'
import {convertDateType, defaultFormat, isRelative} from 'common/param-transform'
import {immutateUpdate} from '../../../common/sugo-utils'
import {dateOptionsGen} from '../../../common/constants'

const units = {
  years: '年',
  months: '月',
  weeks: '周',
  days: '天',
  hours: '小时',
  minutes: '分钟',
  seconds: '秒',
  quarter: '季度'
}

const oldThisYear = ['startOf year', 'endOf year']
export const dateOptions = dateOptionsGen

//convert '6 days' => [6, 'days']
function convert(dateType) {
  let arr = dateType.split(' ')
  return [Number(arr[0]), arr[1]]
}

export function buildTitle (dateType) {
  let arr = convert(dateType)
  let title = `最近${Math.abs(arr[0])}${units[arr[1]] || '天'}`
  return {
    title
  }
}

function adjustFormat (obj) {
  let {format} = obj
  obj.dateRange = obj.dateRange.map((str, i) => {
    return str.length < obj.format.length && i
      ? moment(str, 'YYYY-MM-DD').endOf('day').format(format)
      : str
  })
  if (_.isEqual(obj.dateType, oldThisYear)) {
    obj.dateType = '-1 years'
  }
  return obj
}

export default class TimePicker extends React.Component {

  static propTypes = {
    dateTypes: PropTypes.object,
    dateType: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
    dateRange: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    style: PropTypes.object,
    className: PropTypes.string,
    prefix: PropTypes.string,
    type: PropTypes.oneOf(['exact', 'natrual']),
    format: PropTypes.string, //传入dateRange的格式, 也是返回的格式
    showFormat: PropTypes.func, //展示格式
    showPop: PropTypes.bool,
    tooltipProps: PropTypes.object
  }

  static defaultProps = {
    dateTypes: dateOptions(),
    format: defaultFormat(),
    defaultType: 'exact',
    disabled: false,
    style: {},
    className: '',
    prefix: '',
    showPop: false,
    showFormat: ({dateType, dateRange, title, format}) => {
      let arr = isRelative(dateType) ? convertDateType(dateType) : dateRange
      let rangeTxtArr = arr
        .map(d => moment(d, format).format('YYYY-MM-DD'))
      let rangeTxt = rangeTxtArr[0] === rangeTxtArr[1]
        ? rangeTxtArr[0]
        : rangeTxtArr.join('~')
      
      let text = dateType === 'custom'
        ? rangeTxt
        : <span>{title}({rangeTxt})</span>
      return {
        text,
        title: arr.map(d => moment(d, format).format(defaultFormat())).join('~')
      }
    }
  }

  constructor(props) {
    super(props)
    let obj = _.pick(props, ['dateRange', 'dateType', 'format', 'showPop'])
    if (!obj.dateRange) {
      obj.dateRange = convertDateType(obj.dateType, obj.format)
    }
    obj = adjustFormat(obj)
    this.state = {
      ...obj,
      showPop: false
    }
    this.oldState = _.cloneDeep(this.state)
  }

  componentDidMount() {
    this.dom1 = document.getElementById('container')
  }

  componentWillReceiveProps(nextProps) {
    // 对话框显示的时候，状态不应受外部影响（修正: 用户设置时间时，外部 setState 会触发时间重置）
    let modalCanHideOrHidden = !nextProps.showPop && !_.get(nextProps, 'popoverProps.visible')
    if (modalCanHideOrHidden) {
      if (_.isEqual(nextProps.dateType, oldThisYear)) {
        nextProps = immutateUpdate(nextProps, 'dateType', () => '-1 year')
      }
      this.setState(_.pick(nextProps, ['dateType', 'dateRange', 'format', 'showPop']), () => {
        this.oldState = _.cloneDeep(this.state)
      })
    } else {
      //如果showPop有更改，验证不通过变成了true,就不能关闭
      if (!_.isEqual(nextProps.showPop, this.state.showPop)) {
        this.setState({
          showPop: nextProps.showPop
        })
      }
    }
  }

  componentWillUnmount() {
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  onClickHidePopover = (by) => {
    let {getPopupContainer} = this.props
    // 如果设置了滚动固定，则只能通过点击按钮关闭
    if (getPopupContainer && !_.isString(by)) {
      return
    }
    this.setState({
      showPop: false
    })
    this.dom1.removeEventListener('click', this.onClickHidePopover)

    // 允许外部直接通过 visible 和 onVisibleChange 直接控制 Popover 的显示和隐藏
    let {popoverProps} = this.props
    if (popoverProps && popoverProps.onVisibleChange) {
      popoverProps.onVisibleChange(false, by)
    }
  }

  cancel = () => {
    this.setState(this.oldState, () => {
      this.onClickHidePopover('onCancel')
    })
  }

  getDateRange = (dateType = this.state.dateType) => {
    let { dateRange, format } = this.state
    return dateType === 'custom'
      ? dateRange
      : convertDateType(dateType, format)
  }

  onSelectDateType = obj => {
    let dateTypeValue = obj.dateType
    this.setState({
      dateType: dateTypeValue,
      dateRange: this.getDateRange(dateTypeValue)
    })
  }

  onStartDateChange = _start => {
    let { format, dateRange } = this.state
    let arr = [_start.format(format), dateRange[1]]
    this.setState({
      dateRange: arr,
      dateType: 'custom'
    })
  }

  onEndDateChange = _end => {
    let { format, dateRange } = this.state
    let arr = [dateRange[0], _end.format(format)]
    this.setState({
      dateRange: arr,
      dateType: 'custom'
    })
  }

  confirm = () => {
    let {dateType, dateRange, format} = this.state
    this.props.onChange({dateType, dateRange, format})
    this.setState({
      showPop: this.props.showPop
    })
    // 允许外部直接通过 visible 和 onVisibleChange 直接控制 Popover 的显示和隐藏
    let {popoverProps} = this.props
    if (popoverProps && popoverProps.onVisibleChange) {
      popoverProps.onVisibleChange(false, 'onOk')
    }
  }

  onClick = () => {
    if (!this.props.disabled) {
      let {showPop} = this.state
      if (!showPop) {
        this.dom1.addEventListener('click', this.onClickHidePopover)
      } else {
        this.dom1.removeEventListener('click', this.onClickHidePopover)
      }
      this.setState({showPop: !this.state.showPop})
    }
  }

  blurFindRelativeTime(relativeTypes, relativeTime) {
    let oldThisYear = ['startOf year', 'endOf year']
    return _.find(relativeTypes, ({dateType}) => {
      if (_.isEqual(dateType, relativeTime)) {
        return true
      }
      // startOf xxx -1 seconds 改为 startOf xxx -1 ms 了，需要兼容
      if (_.isArray(relativeTime) && _.isArray(dateType)) {
        return _.isEqual(relativeTime.map(str => str.replace(/seconds?/gi, 'ms')), dateType)
      }
      // ['startOf year', 'endOf year'] 改为 -1 years，需要兼容
      return _.isEqual(relativeTime, oldThisYear) && dateType === '-1 years'
    })
  }

  getTitle = () => {
    let {dateType} = this.state
    let {dateTypes} = this.props
    // startOf xxx -1 seconds 改为 startOf xxx -1 ms 了，需要兼容
    let obj = this.blurFindRelativeTime(dateTypes.natural, dateType) ||
              _.find(dateTypes.exact, {dateType}) ||
              buildTitle(dateType)
    return obj.title
  }

  disabledStartDate = startValue => {
    let {format, dateRange} = this.state
    const endValue = dateRange[1]
    return startValue.format(format) > endValue
  }

  disabledEndDate = endValue => {
    let {format, dateRange} = this.state
    const startValue = dateRange[0]
    return endValue.format(format) <= startValue
  }

  renderText = () => {
    let {showFormat, format} = this.props
    let {dateType, dateRange} = this.state
    return showFormat({
      dateType,
      dateRange,
      format,
      title: this.getTitle()
    })
  }

  renderOption = (obj, i) => {
    let {dateType} = this.state
    let dtype = obj.dateType
    let type = dateType === dtype
      ? 'primary'
      : 'ghost'
    return (
      <Button
        type={type}
        className="time-picker-option"
        style={{margin: '0 5px 5px 0'}}
        key={i + 'time-pikcer-opt' + dtype}
        onClick={() => this.onSelectDateType(obj)}
      >
        {obj.title}
      </Button>
    )

  }

  renderOptions = () => {
    let {dateTypes} = this.props
    return (
      <div className="time-picker-options pd2y">
        {
          dateTypes.natural.length > 0 ? (<p className="color-grey">相对时间</p>) : null
        }
        <div className="time-picker-section">
          {
          //Leon filter those unwanted to show button
            dateTypes.natural.map(this.renderOption)
          }
        </div>
        <p className="color-grey">相对当前时刻</p>
        <div className="time-picker-section">
          {
            dateTypes.exact.map(this.renderOption)
          }
        </div>
        <p className="color-grey">绝对时间</p>
        <div className="time-picker-section">
          {
            dateTypes.custom.map(this.renderOption)
          }
        </div>
      </div>
    )
  }

  renderCustomOptions = () => {
    //todo
    return null
  }

  render () {
    let {
      showPop
    } = this.state

    let {
      prefix,
      disabled,
      className,
      style,
      format,
      tooltipProps,
      popoverProps,
      getPopupContainer
    } = this.props
    let range = this.getDateRange()
    let cls = classNames('time-picker-format relative iblock', {disabled}, className)

    const content = (
      <div className="time-picker-pop" style={{padding: '16px'}}>
        <div className="time-picker-show pd1b">
          <b className="iblock mg1r">从</b>
          <DatePicker
            disabledDate={this.disabledStartDate}
            showTime
            className="iblock mg1r"
            format={format}
            value={moment(range[0], format)}
            onChange={this.onStartDateChange}
          />
          <b className="iblock mg1x">到</b>
          <DatePicker
            disabledDate={this.disabledEndDate}
            showTime
            className="iblock"
            format={format}
            value={moment(range[1], format)}
            placeholder="Start"
            onChange={this.onEndDateChange}
          />
        </div>
        {this.renderOptions()}
        {this.renderCustomOptions()}
        <div className="pd1y alignright">
          <Button
            icon="close-circle-o"
            type="ghost"
            onClick={this.cancel}
            className="iblock mg1r"
          >取消</Button>
          <Button
            icon="check-circle"
            type="primary"
            onClick={this.confirm}
            className="iblock mg1r"
          >确定</Button>
        </div>
      </div>
    )

    let title = this.renderText()
    return (
      <Popover
        getPopupContainer={getPopupContainer}
        content={content}
        visible={showPop}
        placement="bottomLeft"
        overlayClassName="custom-time-picker"
        trigger="click"
        zIndex={1000} //funnel-main, error.message z-index: 1010 , 20170407
        {...popoverProps}
      >
        <Tooltip
          title={title.title}
          {...tooltipProps}
        >
          <div style={style} className={cls} onClick={this.onClick}>
            <Icon type="clock-circle-o" className="mg1r iblock time-picker-icon" />
            <span className="iblock elli time-picker-text">{prefix ? prefix : null}{title.text}</span>
          </div>
        </Tooltip>
      </Popover>
    )
  }

}





