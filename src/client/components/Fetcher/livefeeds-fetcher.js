/**
 * Created by heganjie on 16/10/6.
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {handleErr} from '../../common/fetch-final'

export default class LivefeedsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    fetchTemplate: PropTypes.bool,
    doFetch: PropTypes.bool,
    livefeedId: PropTypes.string,
    useOpenAPI: PropTypes.bool
  }

  static defaultProps = {
    fetchTemplate: false,
    doFetch: true,
    useOpenAPI: false
  }

  render() {
    let { doFetch, livefeedId, useOpenAPI, fetchTemplate } = this.props

    let url = useOpenAPI
      ? '/api/sugo-livefeeds/get'
      : '/app/sugo-livefeeds/get'
    let q = {
      where: {
        id: livefeedId,
        is_template: fetchTemplate
      }
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        body={q}
        url={url}
      >
        {({isFetching, data: codeAndResult, error, fetch}) => {
          let result = codeAndResult && codeAndResult.result
          return this.props.children({isFetching, data: result || [], error, fetch})
        }}
      </Fetch>
    )
  }
}

export const withLivefeeds = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <LivefeedsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            livefeeds={data || []}
            isFetchingLivefeeds={isFetching}
            reloadLivefeeds={() => fetch() /* 不允许传参数 */}
          />
        )
      }}
    </LivefeedsFetcher>
  )
}
