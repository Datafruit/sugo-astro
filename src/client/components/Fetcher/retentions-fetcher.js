/**
 * Created by heganjie on 16/10/6.
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {handleErr} from '../../common/fetch-final'

export default class RetentionsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    onLoaded: PropTypes.func,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let { doFetch, onLoaded } = this.props

    let url = '/app/retention/get'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let retentions = data || []
          return this.props.children({isFetching, data: retentions, error, fetch})
        }}
      </Fetch>
    )
  }
}

export const withRetentions = (mapPropsToFetcherProps = _.constant({})) => (Component) => props => {
  return (
    <RetentionsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            retentions={data || []}
            isFetchingRetentions={isFetching}
            reloadRetention={fetch}
          />
        )
      }}
    </RetentionsFetcher>
  )
}
