import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'


export default class UserGroupUserFetcher extends React.Component {
  static propTypes = {
    userGroup: PropTypes.object,
    doFetch: PropTypes.bool,
    pageIndex: PropTypes.number,
    pageSize: PropTypes.number,
    children: PropTypes.func
  }

  static defaultProps = {
    doFetch: true,
    children: _.constant(null),
    pageIndex: 0,
    pageSize: 100
  }

  static userGroupToQuery = ({userGroup, pageIndex, pageSize}) => {
    return userGroup && {
      groupReadConfig: {
        pageIndex: pageIndex,
        pageSize: pageSize
      },
      dataConfig: {
        ...(_.get(userGroup, 'params.dataConfig') || undefined),
        groupId: _.get(userGroup, 'params.md5') || `usergroup_${userGroup.id}`
      }
    }
  }

  render() {
    let {doFetch, userGroup} = this.props

    let url = '/app/usergroup/info'
    let query = UserGroupUserFetcher.userGroupToQuery(this.props)
    return (
      <Fetch
        lazy={!(doFetch && userGroup)}
        params={includeCookie}
        body={{query}}
        headers={recvJSON.headers}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let {count, ids, totalCount} = data || {}
          return this.props.children({
            isFetching,
            data: ids,
            totalCount,
            count,
            error,
            fetch: (body, params) => {
              return fetch(_.isFunction(body) ? body({query}) : body, params)
            }
          })
        }}
      </Fetch>
    )
  }
}

export const withUserGroupUsersDec = (mapPropsToFetcherProps = () => ({})) => Component => props => {
  return withUserGroupUserFetcher(Component, mapPropsToFetcherProps)(props)
}

export const withUserGroupUserFetcher = (Component, mapPropsToFetcherProps = ()=>({})) => props => {
  return (
    <UserGroupUserFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, totalCount, count, fetch}) => {
        return (
          <Component
            {...props}
            userGroupIds={data || []}
            userGroupCurrPageUserCount={count}
            userGroupTotalUserCount={totalCount}
            isFetchingUserGroupData={isFetching}
            reloadUserGroupIds={fetch}
          />
        )
      }}
    </UserGroupUserFetcher>
  )
}
