import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'

export default class AppFetcher extends React.Component {
  static propTypes = {
    projectId: PropTypes.string.isRequired,
    children: PropTypes.func,
    onLoaded: PropTypes.func,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true,
    children: _.constant(null)
  }

  render() {
    let { doFetch, onLoaded, projectId } = this.props

    let url = '/app/project/tables'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded}
        body={{project_id: projectId}}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let apps = _.get(data, 'result.model') || []
          return this.props.children({isFetching, data: apps, error, fetch})
        }}
      </Fetch>
    )
  }
}

export const withApps = (mapPropsToFetcherProps = _.constant({})) => Component => {
  return withAppFetcher(Component, mapPropsToFetcherProps)
}

export const withAppFetcher = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <AppFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            apps={data || []}
            isFetchingApps={isFetching}
            reloadApps={fetch}
          />
        )
      }}
    </AppFetcher>
  )
}
