/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import {handleErr} from '../../common/fetch-final'
import _ from 'lodash'

export default class DataSourceCustomOrdersFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    dataSourceId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let {dataSourceId, doFetch, children, dataType} = this.props

    let url = `/app/custom-orders/get/${dataSourceId}?dataType=${dataType || ''}`
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        url={url}
        children={children}
      />
    )
  }
}


export const withDataSourceCustomOrders = (Component, mapPropsToFetcherProps) => props => {
  return (
    <DataSourceCustomOrdersFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            dataSourceCustomOrders={data && data.result}
            isFetchingDataSourceCustomOrders={isFetching}
            reloadCustomOrders={fetch}
          />
        )
      }}
    </DataSourceCustomOrdersFetcher>
  )
}

export const useOrders = (options, orders, includeHidden) => {
  if (orders) {
    let nameDict = _.keyBy(options, op => op.name)

    let inOrders = orders.map(name => {
      if (_.startsWith(name, 'hide:')) {
        if (!includeHidden) {
          // 非设置排序的时候、不显示隐藏的数值
          return null
        }
        let op = nameDict[name.substr(5)]
        // __visible !== false 即显示
        return op ? {...op, __visible: false} : null
      }
      return nameDict[name]
    }).filter(_.identity)

    let notInOrders = _.difference(_.keys(nameDict), orders.map(n => _.startsWith(n, 'hide:') ? n.substr(5) : n))
    .map(name => nameDict[name])
    return [...inOrders, ...notInOrders]
  } else {
    return options
  }
}