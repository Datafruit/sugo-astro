/**
 * Created by wuzhuoheng on 17/5/18.
 * 参考了 ./fetch.jsx
 * 提供给DruidDataFetcher使用,实现后台自动刷新druid推送到前端
 */

import {Component, PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import shortid from 'shortid'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import getSocket from '../../common/websocket'
import setStatePromise from '../../common/set-state-promise'

const serviceName = 'trafficAnalytics'
let socket = null

async function waitSocket(callback) {
  // 没有流量分析则不需要请求socket
  if (!_.flatMap(window.sugo.menus, m => _.map(m.children, p => p.path)).includes('/console/traffic-analytics')) {
    return
  }
  if(!socket) {
    socket = await getSocket()
    socket.register(serviceName)
  }
  callback ? callback(socket) : null
}

// waitSocket()

@setStatePromise
export default class SocketFetch extends Component {
  static propTypes = {
    method: PropTypes.oneOf(['get', 'post', 'put', 'delete']),
    url: PropTypes.string.isRequired,
    params: PropTypes.object,
    headers: PropTypes.object,
    body: PropTypes.object,
    lazy: PropTypes.bool,
    onData: PropTypes.func,
    onError: PropTypes.func,
    onFetchingStateChange: PropTypes.func,
    onFetcherUnmount: PropTypes.func,
    children: PropTypes.func.isRequired,
    debounce: PropTypes.number,
    cleanDataWhenFetching: PropTypes.bool
  }

  static defaultProps = {
    method: 'get',
    onFetchingStateChange: _.noop,
    cleanDataWhenFetching: false
  }

  state = {
    isFetching: false,
    response: null,
    data: null,
    error: null
  }

  componentDidMount() {
    let {debounce} = this.props
    if (0 < debounce) {
      this._fetch = this.fetch
      this.fetch = _.debounce(this._fetch, debounce)
    }
    waitSocket(socket => {
      if (socket) {
        socket.on(serviceName, 'query', this.onData)
      }
    })
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
    let {onFetcherUnmount} = this.props
    if (socket) {
      socket.off(serviceName, 'query', this.onData)
      socket.sendTo(serviceName, 'unmount', this.key)
    }
    if (onFetcherUnmount) {
      onFetcherUnmount()
    }
    this.willUnmount = true
  }

  fetchCount = 0
  key = shortid()

  async parseResponse(response) {
    if (response.status === 504) {
      return '网络连接超时，重试或者检查网络连接！'
    }
    let contentType = response.headers.get('content-type') || ''
    let isJsonResult = contentType.toLowerCase().indexOf('application/json') !== -1

    return isJsonResult ? await response.json() : await response.text()
  }

  onError = fetchId => {
    return async response => {
      if (this.willUnmount) {
        return
      }
      this.props.onFetchingStateChange(false)
      let res = await this.parseResponse(response)
      await this.setState2(fetchId, {
        isFetching: false,
        error: res
      })
      this.props.onError(this.state.error)
    }
  }

  afterUpdateState = async (fetchId, body) => {
    waitSocket(socket => {
      if (socket) {
        socket.sendTo(serviceName, 'query', {
          [this.key]: body
        })
      }
    })
  }

  onData = async res => {
    const {key, tag, result: data} = res
    if((key === this.key || tag === this.tag) && data){
      this.tag = tag //更新tag
      let {onData} = this.props
      const fetchId = this.fetchCount
      this.props.onFetchingStateChange(false)
      await this.setState2(fetchId, {
        isFetching: false,
        data,
        error: null
      })
      if (fetchId === this.fetchCount && onData) {
        onData(data)
      }
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

    return await this.afterUpdateState(fetchId, body, params)
  }

  render() {
    return this.props.children({
      ...this.state
    })
  }
}
