/**
 * Created by heganjie on 16/9/26.
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import DruidDataFetcher from './druid-data-fetcher'

const {distinctDropDownFirstNLimit = 10} = window.sugo

export default class DistinctCascadeFetcher extends React.Component {
  static propTypes = {
    dataSourceId: PropTypes.string.isRequired,
    dbDim: PropTypes.object.isRequired,
    prevLayerValues: PropTypes.array,
    children: PropTypes.func.isRequired,
    since: PropTypes.string,
    until: PropTypes.string,
    relativeTime: PropTypes.any,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    prevLayerValues: [],
    doFetch: true
  }

  state = {
    searching: '',
    isWaitingForInput: false
  }

  componentWillReceiveProps(nextProps) {
    //clear keyword query if prop change
    if (!_.isEqual(nextProps, this.props)) {
      this.setState({searching: ''})
    }
  }

  updateKeyword = _.debounce((val, callback) => {
    if (val !== this.state.searching) {
      this.setState({searching: val, isWaitingForInput: false}, callback)
    } else {
      this.setState({isWaitingForInput: false})
    }
  }, 1300)

  onSearchingKeywordChange = (val, callback) => {
    if (!this.state.isWaitingForInput) {
      this.setState({isWaitingForInput: true})
    }
    this.updateKeyword(val, callback)
  }

  render() {
    let {dataSourceId, dbDim, prevLayerValues, doFetch, since, until, relativeTime} = this.props
    let {isWaitingForInput, searching} = this.state

    let columnName = dbDim && dbDim.name

    //no columnName no fetch, avoid 404
    if (!columnName) {
      return this.props.children({})
    }

    let timeFilter = null
    if (relativeTime || since || until) {
      timeFilter = {
        col: '__time',
        op: 'in',
        eq: relativeTime !== 'custom' ? relativeTime : [since, until]
      }
    }
    let searchingFilter = searching ? {col: columnName, op: 'startsWith', eq: [searching]} : null
    let cascadeFilters = prevLayerValues ? prevLayerValues.map(({col, val}) => ({col, op: 'equal', eq: [val]})) : []

    return (
      <DruidDataFetcher
        dbDimensions={[dbDim]}
        dataSourceId={dataSourceId}
        dimensions={[columnName]}
        customMetrics={[{name: 'rowCount', formula: '$main.count()'}]}
        filters={[timeFilter, searchingFilter, ...cascadeFilters].filter(_.identity)}
        doFetch={doFetch}
        dimensionExtraSettingDict={{ [columnName]: { sortCol: 'rowCount', sortDirect: 'desc', limit: distinctDropDownFirstNLimit } }}
        groupByAlgorithm="topN"
        children={({data, ...rest}) => {
          return this.props.children({
            ...rest,
            data: data && data.map(d => d[columnName]) || [],
            isWaitingForInput: isWaitingForInput,
            onSearch: this.onSearchingKeywordChange,
            // 适用于禁用了自动加载数据的时候
            onSearchAutoFetch: val => this.onSearchingKeywordChange(val, rest.fetch)
          })
        }}
      />
    )
  }
}

export function withTopN(WrappedComponent, mapPropsToFetcherProps = () => ({})) {
  function WithTopN(props) {
    return (
      <DistinctCascadeFetcher
        {...mapPropsToFetcherProps(props)}
      >
        {({isFetching, data, error}) => {
          return (
            <WrappedComponent
              {...props}
              topN={data || []}
              isFetchingTopN={isFetching}
            />
          )
        }}
      </DistinctCascadeFetcher>
    )
  }

  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  WithTopN.displayName = `withTopN(${wrappedComponentName})`

  return WithTopN
}