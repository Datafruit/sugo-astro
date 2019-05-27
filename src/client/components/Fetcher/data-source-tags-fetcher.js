import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import {handleErr} from '../../common/fetch-final'
import {TagTypeEnum} from 'common/constants'


export default class DataSourceTagsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    dataSourceId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool,
    type: PropTypes.oneOf(Object.keys(TagTypeEnum))
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let {dataSourceId, doFetch, type} = this.props

    let url = `/app/tag/get/${dataSourceId}`
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        url={url}
        body={{ type }}
      >
        {({isFetching, data: dataAndTotal, error, ...rest}) => {
          let tags = dataAndTotal && dataAndTotal.data || []
          return this.props.children({isFetching, data: tags, error, ...rest})
        }}
      </Fetch>
    )
  }
}

export const withDataSourceTagsDec = (mapPropsToFetcherProps = _.identity) => ComposedComponent => props => {
  return (
    <DataSourceTagsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <ComposedComponent
            {...props}
            dataSourceTags={data || []}
            isFetchingDataSourceTags={isFetching}
            reloadDataSourceTags={fetch}
          />
        )
      }}
    </DataSourceTagsFetcher>
  )
}

export const withDataSourceTags = (Component, mapPropsToFetcherProps = _.identity) => props => {
  return withDataSourceTagsDec(mapPropsToFetcherProps)(Component)(props)
}
