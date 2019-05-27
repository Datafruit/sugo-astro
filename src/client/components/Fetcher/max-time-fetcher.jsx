import React, {PropTypes} from 'react-proptypes-proxy'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {handleErr} from '../../common/fetch-final'
import _ from 'lodash'

export default class MaxTimeFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    dataSourceId: PropTypes.string.isRequired,
    onMaxTimeLoaded: PropTypes.func,
    timezone: PropTypes.string,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true,
    onMaxTimeLoaded: _.noop
  }

  shouldComponentUpdate(nextProps) {
    let props = ['dataSourceId', 'timezone', 'doFetch']
    return !_.isEqual(_.pick(nextProps, props), _.pick(this.props, props))
  }

  extractMaxTime(data) {
    return data && data[0] && data[0].maxTime
  }

  render() {
    let {dataSourceId, timezone, doFetch, onMaxTimeLoaded} = this.props

    return (
      <DruidDataFetcher
        dataSourceId={dataSourceId}
        customMetrics={[
          {name: 'maxTime', formula: '$main.max($__time)'}
        ]}
        forceUpdate
        onError={err => {
          // 查询 maxTime 报错不提示到界面，只显示在命令行
          throw err
        }}
        doFetch={doFetch}
        onData={data => {
          onMaxTimeLoaded(this.extractMaxTime(data))
        }}
        timezone={timezone}
        children={props => {
          if (!this.props.children) {
            return null
          }
          return this.props.children({
            isFetchingMaxTime: props.isFetching,
            maxTime: this.extractMaxTime(props.data)
          })
        }}
      />
    )
  }
}

