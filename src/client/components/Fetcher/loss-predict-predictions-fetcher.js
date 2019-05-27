import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'

export default class LossPredictPredictionsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool,
    modelId: PropTypes.string.isRequired,
    predictionId: PropTypes.string
  }

  static defaultProps = {
    doFetch: true
  }

  createLossPredictPrediction = (record, saveAfterTest = false) => {
    return FetchFinal.post(`/app/loss-predict/models/${record.by_model_id}/predictions?saveAfterTest=${saveAfterTest ? 1 : ''}`, record)
  }

  updateLossPredictPrediction = (partialRecord) => {
    return FetchFinal.put(`/app/loss-predict/models/${partialRecord.by_model_id}/predictions/${partialRecord.id}`, partialRecord)
  }

  deleteLossPredictPrediction = (pId, modelId = this.props.modelId) => {
    return FetchFinal.delete(`/app/loss-predict/models/${modelId}/predictions/${pId}`)
  }

  doPredict = (pId, modelId = this.props.modelId) => {
    return FetchFinal.get(`/app/loss-predict/models/${modelId}/predictions/${pId}/run`)
  }

  render() {
    let { doFetch, modelId, predictionId } = this.props

    let url = predictionId
      ? `/app/loss-predict/models/${modelId}/predictions/${predictionId}`
      : `/app/loss-predict/models/${modelId}/predictions`
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
          return this.props.children({
            isFetching, data: result || [], error, fetch,
            createLossPredictPrediction: this.createLossPredictPrediction,
            updateLossPredictPrediction: this.updateLossPredictPrediction,
            deleteLossPredictPrediction: this.deleteLossPredictPrediction,
            doPredict: this.doPredict
          })
        }}
      </Fetch>
    )
  }
}

export const withLossPredictPredictions = (Component, mapPropsToFetcherProps = _.constant({})) => props => {
  return (
    <LossPredictPredictionsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, ...rest}) => {
        return (
          <Component
            {...props}
            lossPredictPredictions={data || []}
            isFetchingLossPredictPredictions={isFetching}
            reloadLossPredictPredictions={fetch}
            {...rest}
          />
        )
      }}
    </LossPredictPredictionsFetcher>
  )
}
