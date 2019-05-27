import React from 'react'
import { InputNumber, Select, DatePicker } from 'antd'
import classnames from 'classnames'
import moment from 'moment'
import {
  getPeriodOptions,
  getMinuteOptions,
  getHourOptions,
  getDayOptions,
  getMonthDaysOptions,
  getMonthOptions,
  getCron,
  SELECT_PERIOD,
  getNextTriggerDateByLater
 } from '../../common/cron-picker-kit'
import _ from 'lodash'
import './cron-picker.styl'

const OPTIONS = {
  periodOptions: getPeriodOptions(),
  minuteOptions: getMinuteOptions(),
  hourOptions: getHourOptions(),
  dayOptions: getDayOptions(),
  monthDaysOptions: getMonthDaysOptions(),
  monthOptions: getMonthOptions()
}

/**
 * @description cron expression editor
 * @export
 * @class CronPicker
 * @extends {PureComponent}
 */
export default class CronPicker extends React.Component {

  // static propTypes = {
  //   className: PropTypes.string,
  //   cron: PropTypes.string,
  //   period: PropTypes.string,
  //   value: PropTypes.Object
  // }

  constructor(props) {
    super(props)
    const defaultVal = {
      unitType: '0',  // 0=每；1=每隔；2=自定义
      period: SELECT_PERIOD.Hour,
      option: {
        minute: '0',
        hour: '0',
        day: '1',
        month: '1'
      }
    }
    const { currentDate } = this.props
    let startMinute = 0 , startHour = 0
    if(currentDate) {
      startMinute = moment(currentDate).minute()
      startHour = moment(currentDate).hour()
    }
    const value = Object.assign({}, defaultVal, this.props.value || {})
    const { option } = value
    this.state = {
      unitType: value.unitType,
      selectedPeriod: value.period,
      cronExpression: '0 * * * *',
      hourValue: value.hourValue || null,
      selectedHourOption: {
        minute: option.minute
      },
      selectedDayOption: {
        hour: option.hour,
        minute: option.minute
      },
      selectedWeekOption: {
        day: option.day,
        hour: option.hour,
        minute: option.minute
      },
      selectedMonthOption: {
        day: option.day,
        hour: option.hour,
        minute: option.minute
      },
      selectedYearOption: {
        month: option.month,
        day: option.day,
        hour: option.hour,
        minute: option.minute
      },
      selectedIntervalOption: {
        hour: option.hour,
        minute: startMinute,
        startHour: startHour 
      },
      taskStartTime: currentDate ? moment(currentDate).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss'),
      ...value
    }
  }


  componentWillReceiveProps(nextProps) {
    if ('value' in nextProps) {
      const value = nextProps.value
      if (value && value !== 'undefined') {
        if (value.selectedPeriod === 'atInterval'
          && nextProps.currentDate !== this.props.currentDate) {
          let startMinute = 0, startHour = 0
          if (nextProps.currentDate) {
            startMinute = moment(nextProps.currentDate).minute()
            startHour = moment(nextProps.currentDate).hour()
          }
          _.set(value, 'selectedIntervalOption', {
            ..._.get(value, 'selectedIntervalOption', {}),
            minute: startMinute,
            startHour: startHour
          })
        }
        this.setState(value)
      }
    }
  }

  onPeriodSelect = (val) => {
    const changedValue = {
      selectedPeriod: val
    }
    this.handleItemChange(changedValue)
  }

  handleItemChange = changedValue => {
    if (!('value' in this.props)) {
      this.setState(changedValue)
    }
    const { unitType } = this.state
    // if (unitType === '0') {
      const cronExpression = getCron(Object.assign({}, this.state, changedValue))
      this.setState({cronExpression})
      changedValue.cronExpression = cronExpression
    // } 
    this.triggerChange(changedValue)
  }

  triggerChange = (changedValue) => {
    // Should provide an event to pass value to Form.
    const onChange = this.props.onChange
    if (onChange) {
      onChange(Object.assign({}, this.state, changedValue))
    }
  }

  onHourOptionSelect = (key, val) => {
    const obj = {}
    obj[key] = val
    const { selectedHourOption } = this.state
    const hourOption = Object.assign({}, selectedHourOption, obj)
    const changedValue = {
      selectedHourOption: hourOption
    }
    this.handleItemChange(changedValue)
  }

  onDayOptionSelect = (key, val) => {
    const obj = {}
    obj[key] = val
    const { selectedDayOption } = this.state
    const dayOption = Object.assign({}, selectedDayOption, obj)
    const changedValue = {
      selectedDayOption: dayOption
    }
    this.handleItemChange(changedValue)
  }

  onWeekOptionSelect = (key, val) => {
    const obj = {}
    obj[key] = val
    const { selectedWeekOption } = this.state
    const weekOption = Object.assign({}, selectedWeekOption, obj)
    const changedValue = {
      selectedWeekOption: weekOption
    }
    this.handleItemChange(changedValue)
  }

  onMonthOptionSelect = (key, val) => {
    const obj = {}
    obj[key] = val
    const { selectedMonthOption } = this.state
    const monthOption = Object.assign({}, selectedMonthOption, obj)
    const changedValue = {
      selectedMonthOption: monthOption
    }
    this.handleItemChange(changedValue)
  }

  onYearOptionSelect = (key, val) => {
    const obj = {}
    obj[key] = val
    const { selectedYearOption } = this.state
    const yearOption = Object.assign({}, selectedYearOption, obj)
    const changedValue = {
      selectedYearOption: yearOption
    }
    this.handleItemChange(changedValue)
  }

  getOptionComponent = (key) => {
    return (o, i) => {
      return (
        <Select.Option key={`${key}_${i}`} value={o.value.toString()}>{o.label}</Select.Option>
      )
    }
  }

  getHourComponent = () => {
    let {disabled, getPopupContainer} = this.props
    const { selectedHourOption } = this.state
    return (
      (this.state.selectedPeriod === SELECT_PERIOD.Hour) &&
      <cron-hour-component>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedHourOption.minute}
          onChange={(val) => this.onHourOptionSelect(SELECT_PERIOD.Minute, val)}
          className="mg1r"
          showSearch
          style={{ width: 60, display: 'inline-block' }}
        >
          {OPTIONS.minuteOptions.map(this.getOptionComponent('minute_option'))}
        </Select>
        <span>分钟</span>
      </cron-hour-component>
    )
  }

  getDayComponent = () => {
    let {disabled, getPopupContainer} = this.props
    const { selectedDayOption } = this.state
    return (
      (this.state.selectedPeriod === SELECT_PERIOD.Day) &&
      <cron-day-component>
        <Select
          disabled={disabled}
          value={selectedDayOption.hour}
          onChange={(val) => this.onDayOptionSelect(SELECT_PERIOD.Hour, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
          getPopupContainer={getPopupContainer}
        >
          {OPTIONS.hourOptions.map(this.getOptionComponent('hour_option'))}
        </Select>
        <span className="mg1r">:</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedDayOption.minute}
          onChange={(val) => this.onDayOptionSelect(SELECT_PERIOD.Minute, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
        >
          {OPTIONS.minuteOptions.map(this.getOptionComponent('minute_option'))}
        </Select>
      </cron-day-component>
    )
  }

  getWeekComponent = () => {
    let {disabled, getPopupContainer} = this.props
    const { selectedWeekOption } = this.state

    return (
      (this.state.selectedPeriod === SELECT_PERIOD.Week) &&
      <cron-week-component>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedWeekOption.day}
          onChange={(val) => this.onWeekOptionSelect(SELECT_PERIOD.Day, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.dayOptions.map(this.getOptionComponent('week_option'))}
        </Select>
        <span className="mg1r">at</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedWeekOption.hour}
          onChange={(val) => this.onWeekOptionSelect(SELECT_PERIOD.Hour, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
        >
          {OPTIONS.hourOptions.map(this.getOptionComponent('hour_option'))}
        </Select>
        <span className="mg1r">:</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedWeekOption.minute}
          onChange={(val) => this.onWeekOptionSelect(SELECT_PERIOD.Minute, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
        >
          {OPTIONS.minuteOptions.map(this.getOptionComponent('minute_option'))}
        </Select>
      </cron-week-component>
    )
  }

  getMonthComponent = () => {
    let {disabled, getPopupContainer} = this.props
    const { selectedMonthOption } = this.state

    return (
      (this.state.selectedPeriod === SELECT_PERIOD.Month) &&
      <cron-month-component>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedMonthOption.day}
          onChange={(val) => this.onMonthOptionSelect(SELECT_PERIOD.Day, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.monthDaysOptions.map(this.getOptionComponent('month_days_option'))}
        </Select>
        <span className="mg1r">at</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedMonthOption.hour}
          onChange={(val) => this.onMonthOptionSelect(SELECT_PERIOD.Hour, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
        >
          {OPTIONS.hourOptions.map(this.getOptionComponent('hour_option'))}
        </Select>
        :
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedMonthOption.minute}
          onChange={(val) => this.onMonthOptionSelect(SELECT_PERIOD.minute, val)}
          className="mg1r"
          showSearch
          style={{ width: 60 }}
        >
          {OPTIONS.minuteOptions.map(this.getOptionComponent('minute_option'))}
        </Select>
      </cron-month-component>
    )
  }

  getYearComponent = () => {
    let {disabled, getPopupContainer} = this.props
    const { selectedYearOption } = this.state
    return (
      (this.state.selectedPeriod === SELECT_PERIOD.Year) &&
      <cron-year-component>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedYearOption.day}
          onChange={(val) => this.onYearOptionSelect(SELECT_PERIOD.Day, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.monthDaysOptions.map(this.getOptionComponent('month_days_option'))}
        </Select>
        <span className="mg1r">of</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedYearOption.month}
          onChange={(val) => this.onYearOptionSelect(SELECT_PERIOD.Month, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.monthOptions.map(this.getOptionComponent('month_option'))}
        </Select>
        <span className="mg1r">at</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedYearOption.hour}
          onChange={(val) => this.onYearOptionSelect(SELECT_PERIOD.Hour, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.hourOptions.map(this.getOptionComponent('hour_option'))}
        </Select>
        <span className="mg1r">:</span>
        <Select
          getPopupContainer={getPopupContainer}
          disabled={disabled}
          value={selectedYearOption.minute}
          onChange={(val) => this.onYearOptionSelect(SELECT_PERIOD.Minute, val)}
          className="mg1r"
          showSearch
          style={{ width: 80 }}
        >
          {OPTIONS.minuteOptions.map(this.getOptionComponent('minute_option'))}
        </Select>
      </cron-year-component>
    )
  }

  onUnitTypeChange = (val) => {
    const { selectedIntervalOption } = this.state
    const changedValue = {
      unitType: val,
      hourValue: null
    }
    if(val === '1') {
      changedValue.selectedPeriod = 'atInterval'
      changedValue.selectedIntervalOption = {
        ...selectedIntervalOption,
        hour: 1
      }
    } else {
      changedValue.selectedPeriod = 'day'
    }
    this.handleItemChange(changedValue)
  }

  onEveryHourChange = (hour) => {
    if (isNaN(hour) || !_.isInteger(hour)) {
      return
    }
    const { selectedIntervalOption } = this.state
    const changedValue = {
      selectedIntervalOption: {
        ...selectedIntervalOption,
        hour
      }
    }
    this.handleItemChange(changedValue)
  }

  unitHandleChange = value => {
    const { selectedIntervalOption } = this.state
    let taskStartTime =  moment(value).format('YYYY-MM-DD HH:mm:ss')
    let minute = moment(value).minute()
    let startHour = moment(value).hour()

    this.handleItemChange({ 
      taskStartTime,
      selectedIntervalOption: {
        ...selectedIntervalOption,
        minute,
        startHour
      }
    })
  }

  range = (start, end) => {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  }

  disabledDate = (current) => {
    const { taskStartTime } = this.props
    return current && current <= moment(taskStartTime).subtract(1, 'days')//.endOf('day')

  }
  
  disabledDateTime = () => {
    const parent = this.props.taskStartTime
    const curr = this.state.taskStartTime

    const hour = moment(parent).hour()
    const minute = moment(parent).minute()
    const second = moment(parent).second()

    // console.log(moment(curr).format(), moment(parent).format())

    if(moment(curr).isSame(moment(parent),'day')) {
      // 时间相同，要进行比较 
      return {
        disabledHours: () => this.range(0, 24).splice(0, hour),
        disabledMinutes: () => this.range(0, minute),
        disabledSeconds: () => []
      }
    } else {
      // 日期不同，不用隔离时间
      return {
        disabledHours: () => [],
        disabledMinutes: () => [],
        disabledSeconds: () => []
      }
    }
  }

  render() {
    const { className, disabled, currentDate, getPopupContainer } = this.props
    const { selectedPeriod, unitType, selectedIntervalOption, taskStartTime } = this.state
    let { cronExpression } = this.state
    cronExpression = getCron(this.state)
    const interval = getNextTriggerDateByLater(cronExpression)
    return (
      <div className={classnames(className, 'cron-row')}>
        <div className="cron-frequency">
          <Select
            getPopupContainer={getPopupContainer}
            disabled={disabled}
            value={unitType}
            onChange={this.onUnitTypeChange}
            className="mg1r"
            showSearch
            style={{ width: 80 }}
          >
            <Select.Option key="every" value="0">每</Select.Option>
            <Select.Option key="atInterval" value="1">每隔</Select.Option>
          </Select>
          <span className={classnames({'hide': unitType !== '0'})}>
            <Select
              getPopupContainer={getPopupContainer}
              disabled={disabled}
              value={selectedPeriod}
              onChange={this.onPeriodSelect}
              className="mg1r"
              showSearch
              style={{ width: 80 }}
            >
              {OPTIONS.periodOptions.map((t, idx) => {
                return (
                  <Select.Option key={`period_option_${idx}`} value={t.value}>{t.label}</Select.Option>
                )
              })}
            </Select>
            {/** getPeriodPrep() */}
            {this.getHourComponent()}
            {this.getDayComponent()}
            {this.getWeekComponent()}
            {this.getMonthComponent()}
            {/** this.getYearComponent() */}
          </span>
          <span className={classnames({'hide': unitType !== '1'})}>
            <InputNumber
              disabled={disabled}
              value={selectedIntervalOption.hour}
              onChange={this.onEveryHourChange}
              className="mg1r"
              min={1}
              max={23}
              step={1}
              style={{ width: 60 }}
            /> 小时
            {
              currentDate && 
                <div className="task-start-time">
                  <span style={{color: '#333', fontWeight:'bold', marginTop: '10px'}}>开始时间:</span>
                  <DatePicker
                    disabled={disabled}
                    className="inline-date-picker"
                    // disabledDate={this.disabledDate}
                    // disabledTime={this.disabledDateTime}
                    value={moment(taskStartTime)}
                    allowClear={false}
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    onChange={(value) => this.unitHandleChange(value)}
                  />
                </div>
            }
          </span>
        </div>
        <div>
          <span className="color-grey mg1r bold">Cron表达式：</span>
          <span className="mg1r">{cronExpression}</span>
        </div>
        <div>
          <span className="color-grey mg1r bold">接下来3次触发时间：</span>
          {
            interval.map((p, i) => <div style={{lineHeight: '20px'}} key={`next_time${i}`} className="mg1r">{p}</div>)
          }
        </div>
      </div>
    )
  }
}
