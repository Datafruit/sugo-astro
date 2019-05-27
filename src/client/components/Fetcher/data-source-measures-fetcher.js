/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON, noCache} from '../../common/fetch-utils'
import _ from 'lodash'
import {toQueryParams} from '../../../common/sugo-utils'
//import {handleErr} from '../../common/fetch-final'


export default class DataSourceMeasuresFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    limit: PropTypes.number,
    dataSourceId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool,
    useOpenAPI: PropTypes.bool,
    exportNameDict: PropTypes.bool,
    disabledCache: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  state = {
    searching: '',
    metricNameDict: null
  }

  updateNameFilter = _.debounce(val => {
    if (val !== this.state.searching) {
      this.setState({searching: val})
    }
  }, 1300)

  onData = (data) => {
    let {onData, exportNameDict} = this.props
    if (onData) {
      onData(data)
    }
    if (exportNameDict) {
      this.setState({dimNameDict: _.keyBy(data, dbDim => dbDim.name)})
    }
  }

  render() {
    let {limit, dataSourceId, doFetch, useOpenAPI, exportNameDict, disabledCache} = this.props
    let {metricNameDict} = this.state

    let url
    if (limit || this.state.searching || useOpenAPI) {
      let query = {limit: limit || 999, name: this.state.searching || '', noauth: useOpenAPI ? 1 : ''}
      url = `/app/measure/get/${dataSourceId}?${toQueryParams(query)}`
    } else {
      url = `/app/measure/get/${dataSourceId}`
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={disabledCache ? {...recvJSON.headers, ...noCache.headers} : recvJSON.headers}
        url={url}
        onData={this.onData}
      >
        {({isFetching, data: dataAndTotal, error}) => {
          let measures = dataAndTotal ? dataAndTotal.data : []
          return this.props.children({
            isFetching,
            data: measures,
            error,
            onSearch: this.updateNameFilter,
            metricNameDict: exportNameDict ? metricNameDict || _.keyBy(measures, 'name') : undefined
          })
        }}
      </Fetch>
    )
  }
}

export const withDbMetrics = (mapPropsToFetcherProps = _.constant({})) => Component => {
  return withDataSourceMeasures(Component, mapPropsToFetcherProps)
}

export const withDataSourceMeasures = (Component, mapPropsToFetcherProps) => props => {
  return (
    <DataSourceMeasuresFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, metricNameDict}) => {
        return (
          <Component
            {...props}
            dataSourceMeasures={data || []}
            isFetchingDataSourceMeasures={isFetching}
            metricNameDict={metricNameDict}
          />
        )
      }}
    </DataSourceMeasuresFetcher>
  )
}
