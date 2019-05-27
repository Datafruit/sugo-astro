/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal from 'client/common/fetch-final'

export default class DataSourceCompareUserGroupFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    dataSourceId: PropTypes.string,
    onData: PropTypes.func,
    doFetch: PropTypes.bool,
    query: PropTypes.object
  }

  static defaultProps = {
    doFetch: true
  }

  state = {
    isPosting: false
  }

  detectPosting = func => {
    return async (...args) => {
      this.setState({isPosting: true})
      let res = await func(...args)
      this.setState({isPosting: false})
      return res
    }
  }

  addUserGroup = this.detectPosting(async usergroup => {
    if (_.startsWith(usergroup.id, 'temp')) {
      usergroup = _.omit(usergroup, 'id')
    }
    return await FetchFinal.post('/app/usergroup/create', {usergroup})
  })

  updateUserGroup = this.detectPosting(async userGroup => {
    return await FetchFinal.post('/app/usergroup/update', {
      query: {
        where: {
          id: userGroup.id
        }
      },
      update: userGroup
    })
  })

  render() {
    let { dataSourceId, doFetch, children, query, ...rest } = this.props
    let where = {}
    if (_.isString(dataSourceId)) {
      where = {
        druid_datasource_id: dataSourceId || { $ne: null }
      }
    } else if (_.isArray(dataSourceId)) {
      where = {
        druid_datasource_id: {
          $in: dataSourceId
        }
      }
    }
    let q = _.defaultsDeep({
      where
    }, query)

    let url = '/app/usergroup/get'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        body={q}
        url={url}
        {...rest}
      >
        {({isFetching, data: dataAndTotal, error, fetch}) => {
          return children({
            isFetching: isFetching || this.state.isPosting,
            data: dataAndTotal && dataAndTotal.result || [],
            error,
            fetch,
            addUserGroup: this.addUserGroup,
            updateUserGroup: this.updateUserGroup
          })
        }}
      </Fetch>
    )
  }
}

export const withUserGroupsDec = (mapPropsToFetcherProps) => Component => {
  return withUserGroups(Component, mapPropsToFetcherProps)
}

export const withUserGroups = (Component, mapPropsToFetcherProps) => props => {
  return (
    <DataSourceCompareUserGroupFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, addUserGroup, updateUserGroup}) => {
        data = data || []
        return (
          <Component
            {...props}
            reloadUserGroups={fetch}
            dataSourceCompareUserGroups={data}
            isFetchingDataSourceCompareUserGroups={isFetching}
            addUserGroup={addUserGroup}
            updateUserGroup={updateUserGroup}
          />
        )
      }}
    </DataSourceCompareUserGroupFetcher>
  )
}
