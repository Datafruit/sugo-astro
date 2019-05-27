/**
 * Created by heganjie on 2017/6/9.
 * 通用的 druid 查询筛选组件
 * 顶部有时间筛选、应用筛选（顶部可以自定义）
 * 下边是维度值的筛选、支持字符串、数值、时间类型
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import DateRangePicker from '../Common/time-picker'
import _ from 'lodash'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {DruidColumnTypeInverted, isNumberDimension, isTimeDimension} from '../../../common/druid-column-type'
import {Icon, Select, Row, Col, Input, message} from 'antd'
import {convertDateType, isRelative} from '../../../common/param-transform'
import moment from 'moment'
import {immutateUpdate} from '../../../common/sugo-utils'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import MultiSelect from '../Common/multi-select'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {withApps} from '../Fetcher/app-fetcher'
import LazyInput from '../Common/lazy-input'
import {AccessDataOriginalType, EMPTY_VALUE_OR_NULL} from '../../../common/constants'
import DruidColumnType from 'common/druid-column-type'
import BindedDimensionOptionsFetcher from '../ErrorCode/binded-dimension-options-fetcher'
import CommonSearch from './search'

const {
  distinctDropDownFirstNLimit = 10,
  analyticFilterStrategy = 'normal'
} = window.sugo

const {Option} = Select

const TextDimFilterOpNameMap = analyticFilterStrategy === 'lite'
  ? {
    in: '包含',
    'not in': '排除'
  }
  : {
    in: '包含',
    'not in': '排除',
    contains: '含有',
    'not contains': '不含有'
  }

const TimeDimFilterOpNameMap = {
  in: '包含',
  'not in': '排除'
}

const NumberDimFilterOpNameMap = {
  in: '包含',
  'not in': '排除'
  /*
    暂未支持：
    equal: '精确匹配',
    'not equal': '不等于',
    nullOrEmpty: '为空',
    'not nullOrEmpty': '非空',
    greaterThan: '大于',
    lessThan: '小于',
    greaterThanOrEqual: '大于等于',
    lessThanOrEqual: '小于等于'*/
}

let hasTokenAppSet = new Set([AccessDataOriginalType.Android, AccessDataOriginalType.Ios, AccessDataOriginalType.Web])

const defaultDimFilter = dbDim => dbDim.name !== '__time' && !_.get(dbDim.params, 'type')

@withApps(props => {
  return {
    projectId: props.projectId,
    doFetch: !!props.projectId
  }
})
@withDbDims(props => {
  let {dataSourceId, dimensionOptionFilter = defaultDimFilter} = props
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId,
    datasourceType: 'all',
    resultFilter: dimensionOptionFilter
  }
})
class CommonDruidFilterPanel extends React.Component {
  static propTypes = {
    dataSourceId: PropTypes.string.isRequired,
    timePickerProps: PropTypes.object,
    filters: PropTypes.array.isRequired,
    onFiltersChange: PropTypes.func.isRequired,
    dataSourceDimensions: PropTypes.array,
    isFetchingDataSourceDimensions: PropTypes.bool,
    uniqFilter: PropTypes.bool,
    mainTimeDimFilterDeletable: PropTypes.bool,
    dimensionOptionFilter: PropTypes.func,
    // 查询维度值时，修改时间范围, args: timeFltEq, searchingKeyword
    queryDistinctValueTimeRangeOverwrite: PropTypes.func,

    //默认维度不设定值，适应变化的数据源
    noDefaultDimension: PropTypes.bool,
    dimensionExtraSettingDict: PropTypes.object,
    getPopupContainer: PropTypes.func
  }

  static defaultProps = {
    filters: [],
    noDefaultDimension: false,
    uniqFilter: false,
    mainTimeDimFilterDeletable: false,
    dimensionExtraSettingDict: {}
  }

  state = {
    visiblePopoverKey: ''
  }

  renderTimePickerPart() {
    let {timePickerProps, filters, onFiltersChange, getPopupContainer, mainTimeDimFilterDeletable} = this.props
    if (!_.isEmpty(timePickerProps) && 'onChange' in timePickerProps && 'dateType' in timePickerProps && 'dateRange' in timePickerProps) {
      return (
        <DateRangePicker {...timePickerProps} getPopupContainer={getPopupContainer} />
      )
    }
    let mainTimeFltIdx = _.findIndex(filters, flt => flt.col === '__time' && flt.op === 'in')
    if (mainTimeFltIdx === -1 || mainTimeDimFilterDeletable) {
      return null
    }
    // timePickerProps 不控制 eq，那就在组件内控制
    let {eq} = filters[mainTimeFltIdx]
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime)

    timePickerProps = {
      getPopupContainer,
      dateType: relativeTime,
      dateRange: [since, until],
      onChange: ({dateType: nextRelativeTime, dateRange: [nextSince, nextUntil]}) => {
        onFiltersChange(immutateUpdate(filters, [mainTimeFltIdx], () => {
          return {
            col: '__time',
            op: 'in',
            eq: nextRelativeTime === 'custom' ? [nextSince, nextUntil] : nextRelativeTime
          }
        }))
      },
      ...(timePickerProps || {})
    }
    return (
      <DateRangePicker {...timePickerProps} />
    )
  }

  renderHeaderPart() {
    let {filters, onFiltersChange, apps, getPopupContainer} = this.props
    let appFilterIdx = _.findIndex(filters, flt => flt.col === 'token' && flt.hidden)
    let currApp = _.get(filters, `[${appFilterIdx}].eq[0]`)
    if (_.isArray(apps)) {
      apps = apps.filter(app => hasTokenAppSet.has(app.access_type))
    }
    return (
      <div className="mg2b height32">
        {this.renderTimePickerPart()}

        {_.some(apps) ? (
          <Select
            {...enableSelectSearch}
            className="width140 itblock"
            placeholder="全部应用系统"
            allowClear
            dropdownMatchSelectWidth={false}
            value={currApp || ''}
            getPopupContainer={getPopupContainer}
            onChange={nextAppId => {
              if (nextAppId) {
                if (appFilterIdx === -1) {
                  onFiltersChange([...filters, {col: 'token', op: 'in', eq: [nextAppId], hidden: true}])
                } else {
                  onFiltersChange(immutateUpdate(filters, [appFilterIdx, 'eq', 0], () => nextAppId))
                }
              } else {
                onFiltersChange(filters.filter(flt => !(flt.col === 'token' && flt.hidden)))
              }
            }}
          >
            {[(
              <Option value={''} key={''}>全部应用系统</Option>
            ), ...apps.map(app => {
              return (
                <Option value={app.id} key={app.id}>{app.name}</Option>
              )
            })]}
          </Select>
        ) : null}
      </div>
    )
  }

  renderFilterEqSetter(filter, idx) {
    let {
      dataSourceId, dataSourceDimensions,
      isFetchingDataSourceDimensions,
      noDefaultDimension,
      filters, onFiltersChange, dimensionExtraSettingDict,
      queryDistinctValueTimeRangeOverwrite,
      getPopupContainer,
      projectId
    } = this.props

    let dbDim = _.find(dataSourceDimensions, dim => dim.name === filter.col)
    if (noDefaultDimension && !dbDim) {
      return <div className="itblock width200 color-999 aligncenter">请选择维度</div>
    }
    if (!dbDim) {
      return isFetchingDataSourceDimensions ? null : <div className="itblock width200 color-999 aligncenter">没有此维度的权限</div>
    }
    let dimName = dbDim.name

    if (_.endsWith(filter.op, 'in-ranges') && (isNumberDimension(dbDim) || isTimeDimension(dbDim))) {
      return this.renderMultiRangesSelector(dbDim, filter, idx)
    }

    if (isTimeDimension(dbDim)) {
      let relativeTime = isRelative(filter.eq) ? filter.eq : 'custom'
      let [since, until] = relativeTime === 'custom' ? filter.eq : convertDateType(relativeTime)
      let {visiblePopoverKey} = this.state
      let selfVisiblePopoverKey = `${idx}:time-range-picker`
      return (
        <DateRangePicker
          getPopupContainer={getPopupContainer}
          className="width200 height32 itblock line-height18"
          alwaysShowRange
          hideCustomSelection
          style={{width: '100%'}}
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            let newDateFlt = {
              col: dimName,
              eq: relativeTime === 'custom' ? [since, until] : relativeTime,
              dateStringComparingFormat: _.get(this.state.dateStringComparingFormatDict, dimName) || null
            }
            onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
              return Object.assign({}, prevFilter, newDateFlt)
            }))
          }}
          popoverProps={{
            visible: visiblePopoverKey === selfVisiblePopoverKey,
            onVisibleChange: (visible, by) => {
              console.log(`visible: ${visible} by clicking: `, by && by.target || by)
              // 关闭的话，只能点击确认或取消按钮才能关闭
              if (!visible && (by !== 'onOk' && by !== 'onCancel')) {
                return
              }
              this.setState({
                visiblePopoverKey: visible ? selfVisiblePopoverKey : ''
              })
            }
          }}
        />
      )
    } else if (isNumberDimension(dbDim)) {
      let [from, to] = _.isArray(filter.eq) && filter.eq || []
      return (
        <Row className="width200 itblock" style={{marginTop: '1px'}}>
          <Col span={11}>
            <LazyInput
              value={from}
              size="large"
              type="number"
              placeholder="不限"
              onChange={ev => {
                let val = ev.target.value
                onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
                  return {...prevFilter, eq: [val ? val * 1 : null, to]}
                }))
              }}
            />
          </Col>
          <Col span={2} className="aligncenter line-height32">至</Col>
          <Col span={11}>
            <LazyInput
              value={to}
              size="large"
              type="number"
              placeholder="不限"
              onChange={ev => {
                let val = ev.target.value
                onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
                  return {...prevFilter, eq: [from, val ? val * 1 : null]}
                }))
              }}
            />
          </Col>
        </Row>
      )
    }

    if (_.endsWith(filter.op, 'contains')) {
      let val = _.isArray(filter.eq) ? filter.eq[0] : filter.eq
      return (
        <Input
          placeholder="未输入关键字"
          className="itblock width200"
          value={val}
          onChange={ev => {
            let nextVal = ev.target.value
            onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
              let nextEq = [nextVal]
              return {
                ...prevFilter,
                eq: nextEq,
                containsNull: false
              }
            }))
          }}
        />
      )
    }

    let otherDimsFilters = filters.filter(flt => flt.col !== dimName)
    let timeDimFilterIdx = _.findIndex(otherDimsFilters, flt => flt.col === '__time')

    let Fetcher = _.get(dbDim, 'params.bindToErrorCode') ? BindedDimensionOptionsFetcher : DruidDataFetcher
    return (
      <Fetcher
        dbDimensions={dataSourceDimensions}
        projectId={projectId} // 只有 BindedDimensionOptionsFetcher 会用到
        dataSourceId={dataSourceId}
        dimensions={[dbDim.name]}
        doFetch={analyticFilterStrategy !== 'lite'}
        metrics={[]}
        customMetrics={[{name: 'count', formula: '$main.count()'}]}
        filters={queryDistinctValueTimeRangeOverwrite && timeDimFilterIdx !== -1
          ? immutateUpdate(otherDimsFilters, [timeDimFilterIdx, 'eq'], queryDistinctValueTimeRangeOverwrite)
          : otherDimsFilters}
        dimensionExtraSettingDict={{
          [dimName]: {
            ...(dimensionExtraSettingDict[dimName] || {}),
            sortCol: 'count',
            sortDirect: 'desc',
            limit: distinctDropDownFirstNLimit
          }
        }}
        groupByAlgorithm="topN"
        debounce={500}
      >
        {({isFetching, data, fetch}) => {
          let topN = _(data || []).map(d => d[dimName] || EMPTY_VALUE_OR_NULL)
            .thru(vals => !_.some(vals, v => !v) ? [EMPTY_VALUE_OR_NULL, ...vals] : vals)
            .uniq()
            .value()

          return (
            <MultiSelect
              ref={ref => this._valuePicker = ref}
              getPopupContainer={getPopupContainer}
              options={topN}
              className="itblock width200 height32"
              isLoading={isFetching}
              value={_.isString(filter.eq) ? filter.eq.split(/,/) : filter.eq.filter(_.identity)}
              searchBarPlaceholder={analyticFilterStrategy === 'lite' ? '输入目标值并回车添加' : '搜索'}
              onChange={newVals => {
                onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
                  let nextEq = _.sortBy(newVals, v => v === EMPTY_VALUE_OR_NULL ? -1 : 1)
                  return {
                    ...prevFilter,
                    eq: nextEq,
                    containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL
                  }
                }))
              }}
              searchBarComponent={CommonSearch}
              onSearchBarPressEnter={analyticFilterStrategy !== 'lite' ? undefined : ev => {
                let newVals = [...filter.eq, ev.target.value].filter(_.identity)
                onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
                  let nextEq = _.sortBy(newVals, v => v === EMPTY_VALUE_OR_NULL ? -1 : 1)
                  return {
                    ...prevFilter,
                    eq: nextEq,
                    containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL
                  }
                }))
                this._valuePicker.setState({
                  searching: ''
                })
              }}
              onSearch={keyword => {
                if (analyticFilterStrategy === 'lite') {
                  return
                }
                if (keyword) {
                  fetch(bodyByProps => {
                    return immutateUpdate(bodyByProps, 'filters', filters => {
                      let timeFltIdx = _.findIndex(filters, flt => flt.col === '__time')
                      if (timeFltIdx !== -1 && queryDistinctValueTimeRangeOverwrite) {
                        filters = immutateUpdate(filters, [timeFltIdx, 'eq'], prevEq => {
                          return queryDistinctValueTimeRangeOverwrite(prevEq, keyword)
                        })
                      }
                      return [...(filters || []), {col: dimName, op: 'startsWith', eq: [keyword]}]
                    })
                  })
                } else {
                  fetch()
                }
              }}
            />
          )
        }}
      </Fetcher>
    )
  }

  renderFilterTile = ({filter, idx, dbDimDict, className}) => {
    let {
      dataSourceDimensions, filters, onFiltersChange, getPopupContainer, mainTimeDimFilterDeletable, uniqFilter
    } = this.props
    let {col: dimName, op, hidden} = filter
    if (hidden || (dimName === '__time' && !mainTimeDimFilterDeletable)) {
      return null
    }
    if (uniqFilter) {
      // 筛选维度选过了就不能再选了
      let excludeFilterColSet = new Set(filters.filter((f, i) => i < idx).map(f => f.col))
      dataSourceDimensions = dataSourceDimensions.filter(dbDim => !excludeFilterColSet.has(dbDim.name))
    }
    let dbDim = dbDimDict[dimName] || {name: dimName, type: DruidColumnType.String}
    let filterOpNameMap = isNumberDimension(dbDim)
      ? NumberDimFilterOpNameMap
      : isTimeDimension(dbDim)
        ? TimeDimFilterOpNameMap
        : TextDimFilterOpNameMap
    return (
      <div
        key={idx}
        className={className}
      >
        <Select
          size="large"
          className="width120 itblock mg1r"
          {...enableSelectSearch}
          dropdownMatchSelectWidth={false}
          value={dimName || undefined}
          placeholder="请选择维度"
          getPopupContainer={getPopupContainer}
          onChange={val => {
            let nextDbDim = dbDimDict[val]
            onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
              return {
                ...prevFilter,
                col: val,
                eq: isTimeDimension(nextDbDim) ? '-1 days' : [],
                type: DruidColumnTypeInverted[nextDbDim.type]
              }
            }))
          }}
        >
          {dataSourceDimensions.map(dbDim0 => {
            return (
              <Option key={dbDim0.name} value={dbDim0.name}>{dbDim0.title || dbDim0.name}</Option>
            )
          })}
        </Select>

        <Select
          size="large"
          className="width100 mg1r itblock"
          {...enableSelectSearch}
          value={op}
          onChange={nextOp => {
            onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
              // 如果是时间列的话，切换 op 时需要保持值
              return {
                ...prevFilter,
                op: nextOp,
                eq: isTimeDimension(dbDim) ? prevFilter.eq : []
              }
            }))
          }}
          getPopupContainer={getPopupContainer}
        >
          {_.keys(filterOpNameMap).map(op => {
            return (
              <Option value={op} key={op}>{filterOpNameMap[op]}</Option>
            )
          })}
        </Select>

        {this.renderFilterEqSetter(filter, idx)}
        <div className="itblock width30 aligncenter">
          <Icon
            type="minus-circle"
            title="移除这个过滤条件"
            className="color-grey font16 pointer line-height32 hover-color-red"
            data-filter-idx={idx}
            onClick={this.onRemoveFilterClick}
          />
        </div>
      </div>
    )
  }

  onRemoveFilterClick = ev => {
    let filterIdx = +ev.target.getAttribute('data-filter-idx')

    let {filters, onFiltersChange} = this.props
    onFiltersChange(filters.filter((f, i) => i !== filterIdx))
  }

  onAppendFilter = () => {
    let {dataSourceDimensions, filters, onFiltersChange, uniqFilter} = this.props
    if (uniqFilter) {
      // 筛选维度选过了就不能再选了
      let excludeFilterColSet = new Set(filters.map(f => f.col))
      dataSourceDimensions = dataSourceDimensions.filter(dbDim => !excludeFilterColSet.has(dbDim.name))
    }
    let dbDim = dataSourceDimensions[0]
    if (!dbDim) {
      message.warn('没有属性项可选')
      return
    }
    let nextFilters = [...filters, {
      col: dbDim.name,
      op: 'in',
      eq: isTimeDimension(dbDim) ? '-1 days' : [],
      type: DruidColumnTypeInverted[dbDim.type]
    }]
    onFiltersChange(nextFilters)
  }

  render() {
    let {
      headerDomMapper, filters,
      dataSourceDimensions,
      noDefaultDimension,
      className, style, timePickerProps, onFiltersChange
    } = this.props

    let dbDimDict = _.keyBy(dataSourceDimensions, 'name')

    if (!timePickerProps && !filters.length && dataSourceDimensions.length && noDefaultDimension) {
      if (!dataSourceDimensions[0]) {
        message.error('没有属性项可选')
        return
      }
      let dbDim = dataSourceDimensions[0]
      filters = [{
        col: undefined,
        op: 'in',
        eq: isTimeDimension(dbDim) ? '-1 days' : [],
        type: DruidColumnTypeInverted[dbDim.type]
      }]
      onFiltersChange(filters)
    }
    return (
      <div className={className} style={style}>
        {_.isFunction(headerDomMapper)
          ? headerDomMapper === _.noop
            ? null
            : headerDomMapper(this.renderHeaderPart())
          : this.renderHeaderPart()}
        <div className="mg1b">
          {(filters || []).map((flt, idx) => {
            return this.renderFilterTile({
              key: idx,
              filter: flt,
              idx,
              dbDimDict,
              className: idx !== filters.length - 1 ? 'mg1b' : undefined
            })
          })}
        </div>

        <div className="pd1t">
          <span
            className="pointer color-black font12"
            onClick={this.onAppendFilter}
            title="增加一个过滤条件"
          >
            <Icon className="mg1r color-green font14" type="plus-circle" />
            增加一个过滤条件
          </span>
        </div>
      </div>
    )
  }
}

export default CommonDruidFilterPanel
