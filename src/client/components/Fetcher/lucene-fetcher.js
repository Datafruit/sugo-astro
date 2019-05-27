/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {DefaultDruidQueryCacheOpts, includeCookie, recvJSON, withExtraQuery} from '../../common/fetch-utils'
import _ from 'lodash'
import {compressUrlQuery, isEqualWithFunc} from '../../../common/sugo-utils'
import {convertDateType, isRelative} from '../../../common/param-transform'
import moment from 'moment'
import {inQueue, invalidById} from '../../../common/in-queue'
import {AbortController} from '../../../common/abortcontroller'
import FetchFinal, {handleErr} from '../../common/fetch-final'

export default class LuceneFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    queryType: PropTypes.string.isRequired,
    sketchSize: PropTypes.number,
    dataSourceName: PropTypes.string.isRequired,
    field: PropTypes.string.isRequired,
    timeField: PropTypes.string,
    granularity: PropTypes.string,
    relativeTime: PropTypes.any,
    since: PropTypes.string,
    until: PropTypes.string,
    onFetcherUnmount: PropTypes.func,
    filter: PropTypes.any,
    onFetchingStateChange: PropTypes.func,
    onData: PropTypes.func,
    onError: PropTypes.func,
    doFetch: PropTypes.bool,
    alwaysUpdate: PropTypes.bool,
    debounce: PropTypes.number,
    sCache: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    cCache: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    _triggerReloadVal: PropTypes.any
  }

  static defaultProps = {
    doFetch: true,
    sketchSize: 16384,
    // 当 relativeTimeType 是 business 时，不能总是刷新参数，因为结束时间会变化，会不断地触发刷新单图数据
    // 如果需要通过另外的参数触发刷新，可传入 _triggerReloadVal
    alwaysUpdate: window.sugo.relativeTimeType === 'tool',
    filter: '*:*',
    granularity: 'P1D',
    children: _.constant(null),
    ...DefaultDruidQueryCacheOpts
  }

  shouldComponentUpdate(prevProps) {
    if (this.props.alwaysUpdate) {
      return true
    }
    return !isEqualWithFunc(this.props, prevProps)
  }

  componentWillUnmount() {
    this.componentUnmounted = true
    this.cancelFetching()
  }

  id = _.uniqueId('lucene-fetcher_')

  cancelFetching = () => {
    if (this._cancelFetching) {
      let func = this._cancelFetching
      this._cancelFetching = null
      func()
    }
    invalidById('druid-data-fetch-queue', this.id)
  }

  fetchOverwrite = inQueue('druid-data-fetch-queue', this.id, async (url, data, opts) => {
    if (this.componentUnmounted) {
      // throw new Error('component already unmount')
      return
    }
    let abortCtrl = new AbortController()

    this._cancelFetching = () => {
      abortCtrl.abort()
    }

    try {
      return await FetchFinal.get(url, data, {...opts, signal: abortCtrl.signal})
    } catch (e) {
      throw e
    } finally {
      this._cancelFetching = null
    }
  }, this.cancelFetching)

  onError = err => {
    let {onError} = this.props
    if (onError) {
      onError(err)
    }
    // 手动取消的话，提示会显示在图表窗口
    if (/aborted$/i.test(err.message)) {
      return
    }
    handleErr(err)
  }


  render() {
    let {
      queryType, dataSourceName, field, granularity, relativeTime, since, until, filter, onFetchingStateChange,
      onError, onData, doFetch, onFetcherUnmount, debounce, alwaysUpdate, _triggerReloadVal, sketchSize, sCache, cCache,
      ...rest
    } = this.props

    if (!queryType || !dataSourceName || !field) {
      return null
    }
    if (!relativeTime) {
      relativeTime = ['1000', '3000']
    }

    if (isRelative(relativeTime)) {
      let arr = convertDateType(relativeTime, 'iso')
      since = arr[0]
      until = arr[1]
    } else {
      since = moment(since).toISOString()
      until = moment(until).toISOString().replace('59.000', '59.999')
    }

    let query = {
      queryType,
      dataSource: dataSourceName,
      filter,
      field,
      descending: 'false',
      granularity: {'type': 'period', 'period': granularity, 'timeZone': '+08:00'},
      intervals: [ `${since}/${until}` ],
      sketchSize,
      ...rest
    }
  
    let cacheParams = _.pickBy({sCache, cCache}, v => !_.isNil(v))
    let url = `/app/plyql/lucene?query=${compressUrlQuery(JSON.stringify(query))}`
    return (
      <Fetch
        lazy={!doFetch}
        onFetchingStateChange={onFetchingStateChange}
        onData={onData}
        onError={this.onError}
        params={includeCookie}
        onFetcherUnmount={onFetcherUnmount}
        headers={recvJSON.headers}
        url={withExtraQuery(url, cacheParams)}
        debounce={debounce}
        fetchMethod={this.fetchOverwrite}
      >
        {({isFetching, data, error}) => {
          return this.props.children({isFetching, data, error})
        }}
      </Fetch>
    )
  }
}

