/**
 * Created by heganjie on 16/10/6.
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {handleErr} from '../../common/fetch-final'

export default class DataSourceFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    limit: PropTypes.number,
    onSearch: PropTypes.func,
    onLoaded: PropTypes.func,
    dataSourceFilter: PropTypes.func,
    doFetch: PropTypes.bool,
    noAuth: PropTypes.bool,
    includeChild: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true,
    noAuth: false,
    includeChild: false,
    limit: 999
  }

  state = {
    searching: ''
  }

  updateNameFilter = _.debounce(val => {
    if (val !== this.state.searching) {
      this.setState({searching: val})
    }
  }, 1300)

  render() {
    let {limit, doFetch, onLoaded, noAuth, includeChild, dataSourceFilter} = this.props

    let url
    let q = {
      where: {
        status: 1
      },
      noauth: noAuth ? 1 : '',
      includeChild
    }
    if (limit) {
      q.limit = limit
    }
    let {searching} = this.state
    if (searching) {
      q.where.$or = [
        {
          title: {
            $like: searching
          }, name: {
            $like: searching
          }
        }
      ]
    }

    url = '/app/datasource/get'

    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded ? data => onLoaded((data && data.result || []).filter(dataSourceFilter)) : undefined}
        url={url}
        body={q}
        children={({data: dataAndTotal, ...rest}) => {
          let dataSources = dataAndTotal && dataAndTotal.result || []
          return this.props.children({...rest, data: dataSources.filter(dataSourceFilter), onSearch: this.updateNameFilter})
        }}
      />
    )
  }
}

export function withDataSourcesDec(mapPropsToFetcherProps = () => ({}), dataSourceFilter = _.identity) {
  return WrappedComponent => withDataSources(WrappedComponent, mapPropsToFetcherProps, dataSourceFilter)
}

export function withDataSources(WrappedComponent, mapPropsToFetcherProps = () => ({}), dataSourceFilter = _.identity) {
  function WithDataSources(props) {
    return (
      <DataSourceFetcher
        {...mapPropsToFetcherProps(props)}
        dataSourceFilter={dataSourceFilter}
      >
        {({isFetching, data}) => {
          return (
            <WrappedComponent
              {...props}
              dataSources={data}
              isFetchingDataSources={isFetching}
            />
          )
        }}
      </DataSourceFetcher>
    )
  }

  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  WithDataSources.displayName = `withDataSources(${wrappedComponentName})`

  return WithDataSources
}
