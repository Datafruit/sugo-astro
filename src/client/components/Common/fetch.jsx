/**
 * Created by heganjie on 16/9/26.
 * 参考了 https://github.com/smalldots/smalldots/blob/master/src/Fetch.js
 * DEPRECATED: 推荐使用 AsyncTaskRunner 代替
 */

import {Component, PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import fetchFinal, {handleErr} from '../../common/fetch-final'
import setStatePromise from '../../common/set-state-promise'
import {translateError} from '../../../common/translate-error'

@setStatePromise
export default class Fetch extends Component {
  static propTypes = {
    method: PropTypes.oneOf(['get', 'post', 'put', 'delete']),
    url: PropTypes.string.isRequired,
    params: PropTypes.object,
    headers: PropTypes.object,
    body: PropTypes.object,
    lazy: PropTypes.bool,
    onResponse: PropTypes.func,
    fetchMethod: PropTypes.func,
    onData: PropTypes.func,
    onError: PropTypes.func,
    onFetchingStateChange: PropTypes.func,
    onFetcherUnmount: PropTypes.func,
    children: PropTypes.func,
    debounce: PropTypes.number,
    cleanDataWhenFetching: PropTypes.bool
  }

  static defaultProps = {
    method: 'get',
    onFetchingStateChange: _.noop,
    cleanDataWhenFetching: false,
    children: _.constant(null)
  }

  state = {
    isFetching: false,
    response: null,
    data: null,
    error: null
  }

  componentWillMount() {
    let {lazy, debounce} = this.props
    this.state.isFetching = !lazy
    if (0 < debounce) {
      this._fetch = this.fetch
      this.fetch = _.debounce(this._fetch, debounce)
    }
  }

  componentDidMount() {
    // 注意，如果 fetcher 嵌套于 children，则 children 的 fetcher 先加载，因为它的 componentDidMount 先调用
    // 放到 componentWillMount 可解决这个问题，但是需要系统地测试一次
    // 或者实现嵌套逻辑时，需要先加载的放到里层，再或者通过 doFetch 控制加载顺序
    if (!this.props.lazy) {
      this.fetch()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.debounce !== nextProps.debounce) {
      if (0 < nextProps.debounce) {
        if (!this._fetch) {
          this._fetch = this.fetch
        }
        this.fetch = _.debounce(this._fetch, nextProps.debounce)
      } else {
        if (this._fetch) {
          this.fetch = this._fetch
          this._fetch = null
        }
      }
    }

    if (!nextProps.lazy && !isEqualWithFunc(this.props, nextProps)) {
      this.fetch(nextProps.body, nextProps.params)
    }
  }

  componentWillUnmount() {
    this.willUnmount = true
    this.fetchCount = -1
    let {onFetcherUnmount} = this.props
    if (onFetcherUnmount) {
      onFetcherUnmount()
    }
  }

  fetchCount = 0

  async parseResponse(response) {
    if (response.status === 504) {
      return '网络连接超时，重试或者检查网络连接！'
    }
    let contentType = response.headers.get('content-type') || ''
    let isJsonResult = contentType.toLowerCase().indexOf('application/json') !== -1

    return isJsonResult ? await response.json() : await response.text()
  }

  onError = async (fetchId, response) => {
    if (this.willUnmount || fetchId !== this.fetchCount) {
      return
    }
    if (this.props.onFetchingStateChange) {
      this.props.onFetchingStateChange(false)
    }
    // 非服务器返回的错误
    if (!('status' in response)) {
      let error = response
      console.warn(`Fetch component crash on ${this.props.method.toUpperCase()} ${this.props.url} :`)
      await this.setState2(fetchId, {
        isFetching: false,
        error: translateError(error)
      })
      if (this.props.onError) {
        this.props.onError(error)
      } else {
        handleErr(error)
      }
      return
    }
    let res = await this.parseResponse(response.clone())
    await this.setState2(fetchId, {
      isFetching: false,
      response: response,
      error: res
    })
    if (this.props.onError) {
      this.props.onError(this.state.error, response)
    } else {
      handleErr(response)
    }
  }

  afterUpdateState = async (fetchId, body, params) => {
    let {method, headers, url, onData, fetchMethod} = this.props
    let opts = {
      headers,
      ...params,
      handleErr: err => { throw err }
    }
    try {
      let fetchFunc = fetchMethod || fetchFinal[method.toLowerCase()]
      let data = await fetchFunc(url, body, opts)
      if (this.props.onFetchingStateChange) {
        this.props.onFetchingStateChange(false)
      }
      await this.setState2(fetchId, {
        isFetching: false,
        data,
        error: null
      })

      if (fetchId === this.fetchCount && _.isFunction(onData)) {
        onData(data)
      }
      return data
    } catch (e) {
      // 捕获等待时退出队列的错误，或 fetch 异常
      this.onError(fetchId, e)
    }
  }

  setState2 = (fetchId, newState) => {
    if (fetchId === this.fetchCount) {
      return this.setStatePromise(newState)
    }
  }

  fetch = async (body = this.props.body, params = this.props.params) => {
    // 只取最后一次 fetch 的结果
    this.fetchCount += 1
    const fetchId = this.fetchCount
    if (this.props.onFetchingStateChange) {
      this.props.onFetchingStateChange(true)
    }

    let fetchingState = this.props.cleanDataWhenFetching
      ? {isFetching: true, data: null, error: null, response: null}
      : {isFetching: true, error: null, response: null}
    await this.setState2(fetchId, fetchingState)
    return await this.afterUpdateState(fetchId, body, params)
  }

  render() {
    return this.props.children({
      ...this.state,
      fetch: this.fetch
    })
  }
}
