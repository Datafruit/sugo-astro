import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'
import withPropsRemoteControl from '../Common/props-remote-control'

// 功能，查询全部概览、查询某个概览、加入/移除概览
export default class SubscribeFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    idOnly: PropTypes.bool,
    // 下面四个参数填写一个，或者不填
    type: PropTypes.oneOf(['slice', 'dashboard', 'gallery']),
    sliceId: PropTypes.string,
    dashboardId: PropTypes.string,
    galleryId: PropTypes.string
  }

  static defaultProps = {
    doFetch: true
  }

  addToSubscribe = async (id, type = this.props.type) => {
    let q
    if (type === 'slice') {
      q = { where: { slice_id: id } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: id } }
    } else if (type === 'dashboard') {
      q = { where: { dashboard_id: id } }
    } else {
      throw new Error('Unknown type: ' + type)
    }
    return await FetchFinal.post('/app/subscribe/create', {subscribe: q})
  }

  removeFromSubscribe = async (id, type = this.props.type) => {
    let q
    if (type === 'slice') {
      q = { where: { slice_id: id } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: id } }
    } else if (type === 'dashboard') {
      q = { where: { dashboard_id: id } }
    } else {
      throw new Error('Unknown type: ' + type)
    }
    return await FetchFinal.post('/app/subscribe/delete', q)
  }

  render() {
    let { doFetch, type, sliceId, galleryId, dashboardId, idOnly} = this.props

    let url = '/app/subscribe/get'
    let q
    if (sliceId) {
      q = { where: { slice_id: sliceId } }
    } else if (galleryId) {
      q = { where: { gallery_id: galleryId } }
    } else if (dashboardId) {
      q = { where: { dashboard_id: dashboardId } }
    } else if (type === 'slice') {
      q = { where: { slice_id: {$ne: null} } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: {$ne: null} } }
    } else if (type === 'dashboard') {
      q = { where: { dashboard_id: {$ne: null} } }
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        body={{idOnly: idOnly ? 1 : '', query: q}}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          return this.props.children({
            isFetching,
            data: data || {},
            error,
            fetch,
            addToSubscribe: this.addToSubscribe,
            removeFromSubscribe: this.removeFromSubscribe
          })
        }}
      </Fetch>
    )
  }
}

export const withSubscribes = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <SubscribeFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, ...rest}) => {
        return (
          <Component
            {...props}
            subscribes={data && data.subscribes || []}
            subscribedSlices={data && data.slices || []}
            subscribedDashboards={data && data.dashboards || []}
            subscribedGalleries={data && data.galleries || []}
            isFetchingSubscribes={isFetching}
            reloadSubscribes={fetch}
            {...rest}
          />
        )
      }}
    </SubscribeFetcher>
  )
}
