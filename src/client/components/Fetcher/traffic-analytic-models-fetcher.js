import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'

export default class TrafficAnalyticModelsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    onLoaded: PropTypes.func
  }

  static defaultProps = {
    doFetch: true
  }

  addTrafficAnalyticsModel = (model) => {
    return FetchFinal.post('/app/traffic-analytics/models', model)
  }

  updateTrafficAnalyticsModel = (modelId, patch) => {
    return FetchFinal.put(`/app/traffic-analytics/models/${modelId}`, patch)
  }

  deleteTrafficAnalyticsModel = modelId => {
    return FetchFinal.delete(`/app/traffic-analytics/models/${modelId}`)
  }

  render() {
    let {doFetch, onLoaded} = this.props

    let url = '/app/traffic-analytics/models'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded ? (data => onLoaded(data && data.result || [])) : undefined}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let funnels = data && data.result || []
          return this.props.children({
            isFetching,
            data: funnels,
            error,
            fetch,
            addTrafficAnalyticsModel: this.addTrafficAnalyticsModel,
            updateTrafficAnalyticsModel: this.updateTrafficAnalyticsModel,
            deleteTrafficAnalyticsModel: this.deleteTrafficAnalyticsModel
          })
        }}
      </Fetch>
    )
  }
}

export const withTrafficAnalyticsModelsDec = (mapPropsToFetcherProps = _.constant({})) => Component => {
  return withTrafficAnalyticModels(Component, mapPropsToFetcherProps)
}

export const withTrafficAnalyticModels = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <TrafficAnalyticModelsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, ...rest}) => {
        return (
          <Component
            {...props}
            trafficAnalyticModels={data || []}
            isFetchingTrafficAnalyticModels={isFetching}
            reloadTrafficAnalyticModels={fetch}
            {...rest}
          />
        )
      }}
    </TrafficAnalyticModelsFetcher>
  )
}
