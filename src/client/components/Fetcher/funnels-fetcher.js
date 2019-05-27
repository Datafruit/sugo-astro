import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {handleErr} from '../../common/fetch-final'

export default class FunnelsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    onLoaded: PropTypes.func
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let {doFetch, onLoaded} = this.props

    let url = '/app/funnel/get'
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
          return this.props.children({isFetching, data: funnels, error, fetch})
        }}
      </Fetch>
    )
  }
}

export const withFunnels = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <FunnelsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            sugoFunnels={data || []}
            isFetchingSugoFunnels={isFetching}
            reloadSugoFunnels={fetch}
          />
        )
      }}
    </FunnelsFetcher>
  )
}
