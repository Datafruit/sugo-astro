/**
 * Created by asd on 17-7-6.
 * @file 设置resource库的server
 */

import Fetch from '../common/fetch-final'
import { Resource } from 'sugo-resource'

/**
 * @typedef {Object} RequestInit
 * @property {String} [method]
 * @property {*} [headers]
 * @property {*} [body]
 * @property {String} [referrer]
 * @property {String} [referrerPolicy]
 * @property {String} [mode]
 * @property {String} [credentials]
 * @property {String} [cache]
 * @property {String} [redirect]
 * @property {String} [integrity]
 * @property {Boolean} [keepalive]
 * @property {*} [window]
 */

/**
 * @param {String} uri
 * @param {RequestInit} option
 * @return {Promise<Response> | Error}
 */
function server(uri, option) {
  const { method, body, throwMessageWhenErrorStatus = false, ...other } = option

  if (!method) {
    return new Error('Method is required')
  }

  const options = {
    ...other,
    throwMessageWhenErrorStatus,
    handleResponse
  }

  if (method === 'get') {
    return Fetch.get(uri, body, options)
  }

  return Fetch.connect(uri, method, body, options)
}

/**
 * @param {Response} res
 * @return {Response}
 */
function handleResponse(res) {
  return res
}

Resource.setServer(server)

export default Resource

