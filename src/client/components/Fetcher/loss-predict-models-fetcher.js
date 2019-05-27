import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'

export default class LossPredictModelsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    modelId: PropTypes.string
  }

  static defaultProps = {
    doFetch: true
  }

  createLossPredictModel = (record) => {
    return FetchFinal.post('/app/loss-predict/models', record)
  }

  updateLossPredictModel = (partialRecord) => {
    return FetchFinal.put(`/app/loss-predict/models/${partialRecord.id}`, partialRecord)
  }

  deleteLossPredictModel = id => {
    return FetchFinal.delete(`/app/loss-predict/models/${id}`)
  }

  doTraining = id => {
    return FetchFinal.get(`/app/loss-predict/models/${id}/run`)
  }

  render() {
    let { doFetch, modelId, children } = this.props

    let url = modelId ? `/app/loss-predict/models/${modelId}` : '/app/loss-predict/models'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        url={url}
      >
        {({isFetching, data: codeAndResult, error, fetch}) => {
          let result = codeAndResult && codeAndResult.result
          if (!_.isArray(result)) {
            result = [result].filter(_.identity)
          }
          return children({
            isFetching, data: result || [], error, fetch,
            createLossPredictModel: this.createLossPredictModel,
            updateLossPredictModel: this.updateLossPredictModel,
            deleteLossPredictModel: this.deleteLossPredictModel,
            doTraining: this.doTraining
          })
        }}
      </Fetch>
    )
  }
}

export const withLossPredictModels = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <LossPredictModelsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, ...rest}) => {
        return (
          <Component
            {...props}
            lossPredictModels={data || []}
            isFetchingLossPredictModels={isFetching}
            reloadLossPredictModels={fetch}
            {...rest}
          />
        )
      }}
    </LossPredictModelsFetcher>
  )
}
