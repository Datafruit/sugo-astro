import React, {PropTypes} from 'react-proptypes-proxy'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {handleErr} from '../../common/fetch-final'
import _ from 'lodash'

export default class BoundaryTimeFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    dataSourceId: PropTypes.string.isRequired,
    childProjectId: PropTypes.string,
    onTimeLoaded: PropTypes.func,
    filters: PropTypes.array,
    timezone: PropTypes.string,
    doFetch: PropTypes.bool,
    forceLuceneTimeSeries: PropTypes.bool,
    onFetchingStateChange: PropTypes.func,
    debounce: PropTypes.number,
    doQueryMaxTime: PropTypes.bool,
    doQueryMinTime: PropTypes.bool,
    timeDimName: PropTypes.string
  }

  static defaultProps = {
    onTimeLoaded: _.noop,
    doFetch: true,
    doQueryMinTime: true,
    doQueryMaxTime: true,
    forceLuceneTimeSeries: false,
    timeDimName: '__time'
  }

  render() {
    let {
      dataSourceId, timezone, doFetch, doQueryMaxTime, doQueryMinTime, onTimeLoaded, onFetchingStateChange,
      debounce, filters, forceLuceneTimeSeries, timeDimName, childProjectId
    } = this.props

    return (
      <DruidDataFetcher
        dataSourceId={dataSourceId}
        childProjectId={childProjectId}
        debounce={debounce}
        filters={filters}
        forceUpdate
        customMetrics={[
          doQueryMaxTime && {name: 'maxTime', formula: `$main.max($${timeDimName})`},
          doQueryMinTime && {name: 'minTime', formula: `$main.min($${timeDimName})`},
          // 强制使用 timeSeries 查询，而不是 timeBoundary
          forceLuceneTimeSeries && (doQueryMaxTime
            ? {name: 'maxTime1', 'formula': '$maxTime.cast("NUMBER") * 1'}
            : {name: 'minTime1', 'formula': '$minTime.cast("NUMBER") * 1'})
        ].filter(_.identity)}
        onError={err => {
          // 查询 maxTime 报错不提示到界面，只显示在命令行
          throw err
        }}
        doFetch={doFetch}
        onData={data => {
          onTimeLoaded(data && data[0]) // {maxTime, minTime}
        }}
        timezone={timezone}
        onFetchingStateChange={onFetchingStateChange}
        children={props => {
          if (!this.props.children) {
            return null
          }
          let {maxTime, minTime} = _.get(props, 'total') || {}
          return this.props.children({
            isFetchingMaxTime: props.isFetching,
            maxTime,
            minTime,
            fetch: props.fetch
          })
        }}
      />
    )
  }
}

export const withBoundaryTime = (mapPropsToFetcherProps = _.constant({})) => Component => props => {
  return (
    <BoundaryTimeFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetchingMaxTime, maxTime, minTime, fetch}) => {
        return (
          <Component
            {...props}
            maxTime={maxTime}
            minTime={minTime}
            isFetchingMaxTime={isFetchingMaxTime}
            reloadTimeBoundary={fetch}
          />
        )
      }}
    </BoundaryTimeFetcher>
  )
}
