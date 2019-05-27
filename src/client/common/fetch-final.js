// the final fetch
// 仅仅使用post/get减少代码
// 所有的请求数据都被放在q=data....并压缩
// 在服务器端会被统一解压缩和传递给ctx.q
// options默认为空
// options.headers 默认是json header，但是你可以通过 options.headers 来覆盖默认的json header
// options.credentials 默认包含cookie，也是可以通过 options.credentials 来覆盖默认的credentials
                      // omit: 默认值，忽略cookie的发送
                      // same-origin: 表示cookie只能同域发送，不能跨域发送
                      // include: cookie既可以同域发送，也可以跨域发送
// options.handleResponse 默认是转换为json, 如果不需要可以自己指定处理方法
// options.handleErr 默认是antd弹窗提示错误信息, 可以自己指定处理方法, 注意抛出的是整个response

import { notification } from 'antd'
import {compressUrlQuery, tryJsonParse} from '../../common/sugo-utils'
import _ from 'lodash'
import * as ls from './localstorage'
import CryptoJS from 'crypto-js'
import { abortableFetch } from '../../common/abortcontroller'
import {sendJSON, withExtraQuery} from './fetch-utils'
import {browserHistory} from 'react-router'

//更新顶部载入动画条
const updateLoadingState = (index) => {
  let id = `loading-bar${index}`
  let dom = document.getElementById(id)

  if (dom) {
    return dom.parentNode && dom.parentNode.removeChild(dom)
  }

  let html = document.createElement('div')
  html.className = 'loading-bar loading'
  html.id = id
  document.body.appendChild(html)
  //`<div id="${id}" className="loading-bar"></div>`
}

//正在取数据计数
window.__fetchCount = 0

let fetchIndex = 0

const jsonHeader = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

export function parseResponse(response) {
  let druidQueryError = response.headers.get('x-druid-query-error') || ''
  if (/not enough .+ space to .+ query/i.test(druidQueryError)) {
    notification.warn({
      message: '提示',
      key: CryptoJS.MD5('内存不足，请优化查询').toString(),
      description: (
        <div
          className="mw300 common-err-msg animate wordbreak"
        >
          内存不足，请尝试以下操作优化查询：
          <br/>
          降低去重计数中 sketch 的精度或不使用 sketch 去重算法；
          <br/>
          数值分组避免使用“按值”分组；
          <br/>
          减少指标数量等
        </div>
      ),
      duration: 20
    })
  }
  let contentType = response.headers.get('content-type') || ''
  let isJsonResult = contentType.toLowerCase().indexOf('application/json') !== -1
  return isJsonResult ? response.json() : response.text()
}

export function serialized(data) {
  return data
    ? `?q=${compressUrlQuery(JSON.stringify(data), 'fetching...')}`
    : ''
}

export async function handleErr(res) {
  console.log(res)
  let text = _.isFunction(res.text)
    ? await res.text()
    : _.isObject(res) ? JSON.stringify(res) : res

  console.log(text, '错误信息')
  try {
    const ret = tryJsonParse(text)
    text = ret.error || ret.message || text
  } catch (e) {
    console.log('not a json error')
  }

  //空错误显示为 '网络错误'
  if (text === '{}' || text === '') {
    text = '网络连接失败，请检查网络连接！'
  } else if (res.status === 504) {
    text = '网络连接超时，重试或者检查网络连接！'
  }

  if (res.status === 401) {
    browserHistory.push('/console/403')
  }

  notification.warn({
    message: '提示',
    key: CryptoJS.MD5(text).toString(),
    description: (
      <div
        className="mw300 common-err-msg animate wordbreak"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    ),
    duration: 20
  })
}

//使用promise包装fetch做 timeout处理
function _fetch(fetch_promise, timeout) {
  let abort_fn = null

  //这是一个可以被reject的promise
  let abort_promise = new Promise(function (resolve, reject) {
    abort_fn = function () {
      reject('获取数据超时了，试试刷新页面')
    }
  })

  //这里使用Promise.race，以最快 resolve 或 reject 的结果来传入后续绑定的回调
  let abortable_promise = Promise.race([fetch_promise, abort_promise])

  setTimeout(function () {
    abort_fn && abort_fn()
  }, timeout)

  return abortable_promise
}

export default class Fetch {

  static get(url, data, options) {
    let finalUrl = data
      ? withExtraQuery(url, {q: compressUrlQuery(JSON.stringify(data), 'fetching...')})
      : url
    if (2000 <= finalUrl.length && _.get(options, '_autoSwitchToPostWhenUrlTooLong')) {
      return Fetch.post(url, data, _.defaultsDeep({}, _.omit(options, '_autoSwitchToPostWhenUrlTooLong'), sendJSON))
    }
    return Fetch.connect(finalUrl, 'get', null, options)
  }

  static post(url, data, options) {
    return Fetch.connect(url, 'post', data, options)
  }

  static delete(url, data, options) {
    return Fetch.connect(url, 'delete', data, options)
  }

  static put(url, data, options) {
    return Fetch.connect(url, 'put', data, options)
  }

  static patch(url, data, options) {
    return Fetch.connect(url, 'patch', data, options)
  }

  //todo jsonp if needed
  static async connect(url, method, data, options = {}) {
    let body = {
      method,
      body: data
        ? JSON.stringify({
          q: compressUrlQuery(JSON.stringify(data))
        })
        : undefined,
      credentials: 'include',
      headers: jsonHeader,
      timeout: 180000, // 默认超时改为3分钟
      ...options
    }
    
    if (!options.hasOwnProperty('redirect')) {
      options.redirect = 'manual'
    }

    if (!options.hasOwnProperty('throwMessageWhenErrorStatus')) {
      options.throwMessageWhenErrorStatus = true
    }

    let start = new Date().getTime()
    let index = fetchIndex + 0
    fetchIndex++
    if (fetchIndex > 1 << 29) {
      fetchIndex = 0
    }

    window.__fetchCount++
    updateLoadingState(index)

    try {
      let res = await _fetch(abortableFetch(url, body), body.timeout)
      // SSO登陆时会产生重定向，需要在前端跳转
      // https://fetch.spec.whatwg.org/#concept-filtered-response-opaque-redirect
      if (res.type === 'opaqueredirect') {
        window.location.reload(true)
      }

      let date = res.headers.get('Date')
      if (date) {
        let end = new Date().getTime()
        let serverTime = new Date(date).getTime() + end - start
        ls.set('serverTime', serverTime + '')
      }
      if (options.throwMessageWhenErrorStatus && res.status > 304) {
        throw res
      }
      return (options.handleResponse || parseResponse)(res)
    } catch (e) {
      (options.handleErr || handleErr)(e)
    } finally {
      window.__fetchCount--
      updateLoadingState(index)
    }
  }
}
