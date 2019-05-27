import React, {PropTypes} from 'react-proptypes-proxy'
import { Select } from 'antd'
import _ from 'lodash'
import Loading from './loading'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'

const Option = Select.Option

export default class DistinctSelect extends React.Component {

  static propTypes = {
    dbDim: PropTypes.object.isRequired,
    doFetch: PropTypes.bool,
    since: PropTypes.string.isRequired,
    until: PropTypes.string.isRequired,
    dataSourceId: PropTypes.string.isRequired,
    prevLayerValues: PropTypes.array,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array
    ]),
    style: PropTypes.object,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
    loadingClassName: PropTypes.string,
    showSelectAll: PropTypes.bool,
    showAllowClear: PropTypes.bool,
    selectAllPrefix: PropTypes.string
  }

  static defaultProps = {
    doFetch: false,
    style: {},
    className: 'width-100',
    loadingClassName: 'iblock width120 mg1r',
    prevLayerValues: [],
    showSelectAll: false,
    showAllowClear: true,
    selectAllPrefix: '全部'
  }

  shouldComponentUpdate(nextProps) {
    return true || !_.isEqual(this.props, nextProps)
  }

  render () {
    let {
      dbDim,
      doFetch,
      since,
      until,
      relativeTime,
      dataSourceId,
      prevLayerValues,
      value,
      onChange,
      style,
      className,
      loadingClassName,
      showSelectAll,
      showAllowClear,
      selectAllPrefix,
      ...rest
    } = this.props

    let noContentHint = `${(since || '').slice(5, 10) || since} ~ ${(until || '').slice(5, 10) || until} 查无数据`

    let {name: columnName, title: columnTitle} = dbDim || {}

    return (
      <DistinctCascadeFetcher
        dbDim={dbDim}
        key={columnName}
        doFetch={doFetch}
        since={since}
        until={until}
        relativeTime={relativeTime}
        dataSourceId={dataSourceId}
        columnName={columnName}
        prevLayerValues={prevLayerValues}
      >
        {({isFetching, data, onSearchAutoFetch, isWaitingForInput, fetch}) => {
          let arr = isFetching ? ['载入中...'] : data
          let dropdownClassName = isFetching || isWaitingForInput ? 'is-fetching' : 'not-fetching'

          let options = (arr || []).filter(_.identity).map(pl => <Option key={pl} value={pl}>{pl}</Option>)
          if (showSelectAll) {
            options.unshift(
              <Option key={''} value={''}>{`${selectAllPrefix}${columnTitle || columnName}`}</Option>
            )
          }
          return (
            <Loading
              className={loadingClassName}
              isLoading={isFetching}
              style={style}
              indicatorWrapperStyle={{marginRight: '25px'}}
              indicatePosition="right"
            >
              <Select
                className={className}
                value={value || (showSelectAll ? '' : undefined)}
                allowClear={showAllowClear}
                showSearch
                optionFilterProp="children"
                dropdownMatchSelectWidth={false}
                placeholder={columnTitle || columnName}
                notFoundContent={isFetching ? '加载中' : isWaitingForInput ? '等待输入' : noContentHint}
                onSearch={onSearchAutoFetch}
                onFocus={doFetch || this.props.disabled ? undefined : (() => fetch())}
                dropdownClassName={dropdownClassName}
                onChange={onChange}
                defaultActiveFirstOption={false}
                {...rest}
              >
                {options}
              </Select>
            </Loading>
          )
        }}
      </DistinctCascadeFetcher>
    )
  }
}
