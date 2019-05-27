/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'


export default class SlicesFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    sliceId: PropTypes.string,
    doFetch: PropTypes.bool,
    useOpenAPI: PropTypes.bool,
    onLoaded: PropTypes.func
  }

  static defaultProps = {
    doFetch: true,
    usePublicAPI: false,
    children: _.constant(null)
  }

  adaptData = data => {
    let {sliceId} = this.props
    if (!sliceId) {
      data = data && data.slices
    } else {
      if (_.isObject(data)) {
        if ('result' in data) {
          data = data.result
        }
      }
    }
    if (!data) {
      data = []
    }
    if (data && !_.isArray(data)) {
      data = [data]
    }
    return data.map(s => {
      let params =  s.params

      // 临时兼容、以后删掉
      if (!params.vizType) {
        params.vizType = params.viz_type
      }

      s.params = params
      return s
    })
  }

  saveSlice = async (newSlice) => {
    let errStatus = null
    let res = await FetchFinal.post(
      newSlice.id ? '/app/slices/update/slices' : '/app/slices/create/slices',
      newSlice,
      {handleErr: async resp => {
        handleErr(resp)
        errStatus = resp.status
      }}
    )

    return errStatus ? {...(res || {}), status: errStatus} : res
  }

  render() {
    let {sliceId, useOpenAPI, children, doFetch, onLoaded} = this.props

    let url
    if (sliceId) {
      url = useOpenAPI
        ? `/api/slices/${sliceId}`
        : `/app/slices/get/slices/${sliceId}`
    } else {
      url = '/app/slices/get/slices'
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded ? (data => onLoaded(this.adaptData(data))) : null}
        url={url}
      >
        {children && (({isFetching, data, error, fetch}) => {
          data = this.adaptData(data)
          return children({isFetching, data, error, fetch, saveSlice: this.saveSlice})
        })}
      </Fetch>
    )
  }
}

export const withSlicesDec = (mapPropsToFetcherProps = () => ({})) => Component => props => {
  return withSlices(Component, mapPropsToFetcherProps)(props)
}

export const withSlices = (Component, mapPropsToFetcherProps = () => ({})) => props => {
  return (
    <SlicesFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, saveSlice}) => {
        return (
          <Component
            {...props}
            slices={data || []}
            saveSlice={saveSlice}
            isFetchingSlices={isFetching}
            reloadSlices={fetch}
          />
        )
      }}
    </SlicesFetcher>
  )
}
