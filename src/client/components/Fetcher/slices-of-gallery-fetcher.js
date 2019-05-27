import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {handleErr} from '../../common/fetch-final'

export default class GallerySlicesFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    galleryId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let { doFetch, galleryId} = this.props

    let url = `/app/gallery/collection/frames/${galleryId}`
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let frames = data && _.get(data, 'result.result') || []
          let slices = _.flatMap(frames, f => f.slice_ids)
          return this.props.children({isFetching, data: slices, error, fetch})
        }}
      </Fetch>
    )
  }
}

export const withSlicesOfGallery = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <GallerySlicesFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch}) => {
        return (
          <Component
            {...props}
            slicesOfGallery={data || []}
            isFetchingSlicesOfGallery={isFetching}
            reloadSlicesOfGallery={fetch}
          />
        )
      }}
    </GallerySlicesFetcher>
  )
}
