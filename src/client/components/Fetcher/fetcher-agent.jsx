/**
 * fetcher 代理，主要用于合并多次 fetcher 的结果
 * DEPRECATED: 推荐使用 AsyncTaskRunner 代替
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'

export default class FetcherAgent extends React.Component {
  static propTypes = {
    fetcherComponent: PropTypes.any.isRequired,
    initState: PropTypes.object,
    getFetcherProps: PropTypes.func.isRequired,
    setStateWhenFetchDone: PropTypes.func.isRequired,
    onFetchingStateChange: PropTypes.func,
    onFetcherUnmount: PropTypes.func,
    onData: PropTypes.func
  }

  static defaultProps = {
  }

  static defaultState = {
    isFetcherFetching: false,
    isAgentFetching: false,
    data: null,
    error: null
  }

  state = {...FetcherAgent.defaultState}

  componentWillMount() {
    let {initState} = this.props
    if (initState) {
      this.setState({
        ...FetcherAgent.defaultState,
        ...initState
      })
    }
  }

  componentWillUnmount() {
    let {onFetcherUnmount} = this.props
    if (onFetcherUnmount) {
      onFetcherUnmount()
    }
  }

  resetState = (state = this.props.initState) => {
    this.setState({...FetcherAgent.defaultState, ...state})
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.initState, this.props.initState) && nextProps.initState) {
      this.resetState(nextProps.initState)
    }
  }

  componentDidUpdate(prevProps, prevState) {
    let {onFetchingStateChange, onData} = this.props
    if (!this.state.isAgentFetching && prevState.isAgentFetching) {
      if (onFetchingStateChange) {
        onFetchingStateChange(false)
      }
      if (onData) {
        onData(this.state.data)
      }
    }
  }

  render() {
    let {fetcherComponent: FetcherComponent, getFetcherProps, setStateWhenFetchDone, onFetchingStateChange} = this.props
    let {isFetcherFetching} = this.state
    let fetcherProps = getFetcherProps(this.state)
    return (
      <FetcherComponent
        {...fetcherProps}
        onFetchingStateChange={isFetching => {
          if (isFetching !== isFetcherFetching) {
            this.setState({isFetcherFetching: isFetching})
            if (isFetching) {
              onFetchingStateChange(true)
            }
          }
        }}
        onData={data => {
          this.setState(setStateWhenFetchDone(data, this.state))
        }}
      />
    )
  }
}
