/**
 * 查询 lookups，主要用于判断分群是否有效
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'

export default class UserGroupLookupsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    onData: PropTypes.func,
    doFetch: PropTypes.bool,
    groupId: PropTypes.string, // md5 or usergroup_xxx
    dataSourceId: PropTypes.string,
    exportNameDict: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  state = {
    lookupNameDict: null,
    tIndexLookupNameDict: null,
    uIndexLookupNameDict: null
  }

  onData = (data) => {
    let {onData, exportNameDict} = this.props
    if (_.isFunction(onData)) {
      onData(data)
    }
    if (exportNameDict) {
      let {tIndexLookups, uIndexLookups} = data || {}
      let lookups = [...(tIndexLookups || []), ...(uIndexLookups || [])]
      this.setState({
        lookupNameDict: _.keyBy(lookups, _.identity),
        tIndexLookupNameDict: _.keyBy(tIndexLookups, _.identity),
        uIndexLookupNameDict: _.keyBy(uIndexLookups, _.identity)
      })
    }
  }

  render() {
    let {doFetch, children, groupId, exportNameDict, dataSourceId, ...rest} = this.props
    let {lookupNameDict, tIndexLookupNameDict, uIndexLookupNameDict} = this.state

    let url = `/app/usergroup/queryValidLookups/${groupId || ''}${dataSourceId && `?dataSourceId=${dataSourceId}` || ''}`
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        url={url}
        {...rest}
      >
        {({isFetching, data, error, fetch}) => {
          let {tIndexLookups, uIndexLookups} = data || {}
          let lookups = [...(tIndexLookups || []), ...(uIndexLookups || [])]
          return children({
            isFetching,
            data: lookups || [],
            error,
            fetch,
            lookupNameDict: exportNameDict ? lookupNameDict || _.keyBy(lookups, _.identity) : undefined,
            tIndexLookupNameDict: exportNameDict ? tIndexLookupNameDict || _.keyBy(tIndexLookups, _.identity) : undefined,
            uIndexLookupNameDict: exportNameDict ? uIndexLookupNameDict || _.keyBy(uIndexLookups, _.identity) : undefined
          })
        }}
      </Fetch>
    )
  }
}

export const withUserGroupLookupsDec = (mapPropsToFetcherProps) => Component => {
  return withUserGroupLookups(Component, mapPropsToFetcherProps)
}

export const withUserGroupLookups = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <UserGroupLookupsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, lookupNameDict, tIndexLookupNameDict, uIndexLookupNameDict, fetch}) => {
        data = data || []
        return (
          <Component
            {...props}
            reloadUserGroupLookups={fetch}
            userGroupLookups={data}
            isFetchingUserGroupLookups={isFetching}
            lookupNameDict={lookupNameDict}
            tIndexLookupNameDict={tIndexLookupNameDict}
            uIndexLookupNameDict={uIndexLookupNameDict}
          />
        )
      }}
    </UserGroupLookupsFetcher>
  )
}
