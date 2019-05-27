import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'

export default class CommonModelsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    onLoaded: PropTypes.func,
    url: PropTypes.string
  }

  static defaultProps = {
    doFetch: true
  }

  addModel = (model) => {
    let {url} = this.props
    return FetchFinal.post(url, model)
  }

  updateModel = (modelId, patch) => {
    let {url} = this.props
    return FetchFinal.put(`${url}/${modelId}`, patch)
  }

  deleteModel = modelId => {
    let {url} = this.props
    return FetchFinal.delete(`${url}/${modelId}`)
  }

  render() {
    let {doFetch, onLoaded, url} = this.props

    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={onLoaded ? (data => onLoaded(data && data.result || [])) : undefined}
        url={url}
      >
        {({isFetching, data, error, fetch}) => {
          let funnels = data && data.result || []
          return this.props.children({
            isFetching,
            data: funnels,
            error,
            fetch,
            addModel: this.addModel,
            updateModel: this.updateModel,
            deleteModel: this.deleteModel
          })
        }}
      </Fetch>
    )
  }
}

export const withCommonModels = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <CommonModelsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, ...rest}) => {
        return (
          <Component
            {...props}
            models={data || []}
            isFetchingModels={isFetching}
            reloadModels={fetch}
            {...rest}
          />
        )
      }}
    </CommonModelsFetcher>
  )
}
