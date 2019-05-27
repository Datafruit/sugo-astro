import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'
import withPropsRemoteControl from '../Common/props-remote-control'

// 功能，查询全部概览、查询某个概览、加入/移除概览
export default class OverviewFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    // 下面三个参数填写一个，或者不填
    type: PropTypes.oneOf(['slice', 'gallery']),
    sliceId: PropTypes.string,
    galleryId: PropTypes.string,
    idOnly: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  addToOverview = async (id, type = this.props.type) => {
    let q
    if (type === 'slice') {
      q = { where: { slice_id: id } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: id } }
    } else {
      throw new Error('Unknown type: ' + type)
    }
    return await FetchFinal.post('/app/overview/create', q)
  }

  removeFromOverview = async (id, type = this.props.type) => {
    let q
    if (type === 'slice') {
      q = { where: { slice_id: id } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: id } }
    } else {
      throw new Error('Unknown type: ' + type)
    }
    return await FetchFinal.post('/app/overview/delete', q)
  }

  render() {
    let { doFetch, type, sliceId, galleryId, idOnly} = this.props

    let url = '/app/overview/get'
    let q
    if (sliceId) {
      q = { where: { slice_id: sliceId } }
    } else if (galleryId) {
      q = { where: { gallery_id: galleryId } }
    } else if (type === 'slice') {
      q = { where: { slice_id: {$ne: null} } }
    } else if (type === 'gallery') {
      q = { where: { gallery_id: {$ne: null} } }
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
          let overviews = data && data.result || []
          return this.props.children({
            isFetching,
            data: overviews,
            error,
            fetch,
            addToOverview: this.addToOverview,
            removeFromOverview: this.removeFromOverview
          })
        }}
      </Fetch>
    )
  }
}

let OverviewFetcherWithRemoteControl = withPropsRemoteControl(OverviewFetcher)

export const withOverviews = (Component, mapPropsToFetcherProps = _.constant({}), withRemoteControl = false) => props => {
  let OverviewFetcher0 = withRemoteControl ? OverviewFetcherWithRemoteControl : OverviewFetcher
  return (
    <OverviewFetcher0
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, remoteControl, ...rest}) => {
        return (
          <Component
            {...props}
            remoteControlForOverviewFetcher={remoteControl}
            overviews={data || []}
            isFetchingOverviews={isFetching}
            reloadOverviews={fetch}
            {...rest}
          />
        )
      }}
    </OverviewFetcher0>
  )
}
