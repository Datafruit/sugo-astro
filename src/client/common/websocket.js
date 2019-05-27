/**
 * 统一处理websocket的收发,添加必要信息,处理格式
 */
import EventEmitter from 'events'
import io from 'socket.io-client'
import shortid from 'shortid'

let socket = null

export default async function getSocket(opts = {}) {
  if(!socket) {
    //连接socket
    return await new Promise((resolve, reject) => {
      let { protocol, host } = window.location
      let { ws_url } = window.sugo
      if (!ws_url) {
        ws_url = `${protocol.indexOf('https') > -1 ? 'wss' : 'ws'}://${host}`
      }
      const _socket = io(ws_url, { transports: ['websocket', 'polling'], ...opts })
      _socket.on('connect', () => resolve(socket))
      _socket.on('connect_error', reject)
      socket = new SugoSocket(_socket)
    })
  }
  
  return socket
}

class SugoSocket extends EventEmitter{
  constructor(socket) {
    super()
    this._request = {}
    this._emitterDict = {}
    this.socket = socket
    this.services = []
    socket.on('serviceChange', this.serviceChange)
    socket.on('message', this.handleMessage)
    socket.on('response', this.handleResponse)
  }
  //注册服务
  register(serviceName, data = {}) {
    if(this.isRegister(serviceName)) return
    this.socket.emit('register', serviceName, data)
    this._emitterDict[serviceName] = new EventEmitter()
  }
  //注销服务
  cancel(serviceName) {
    if(!this.isRegister(serviceName)) return
    this.socket.emit('cancel', serviceName)
    delete this._emitterDict[serviceName]
  }

  //发送一条消息给指定service,会触发service的指定事件,传递data
  sendTo(service, event, data) {
    if(this.isRegister(service)) {
      let id = shortid()
      this.socket.emit('message', service, event, data, id)
      return id
    } else {
      console.warn(`${service} 服务未注册`)
      return false
    }
  }

  //收到serviceChange事件后调用
  serviceChange = (services) => {
    this.services = services
  }

  //所有service发出的消息都经过这里处理
  handleMessage = (serviceName, event, ...other) => {
    const emitter = this._emitterDict[serviceName]
    emitter ? emitter.emit(event, ...other) : null
  }

  getEventName(service, event) {
    return `${service}|${event}`
  }

  request(service, data) {//指定的service必须在短时间内返回一个response,然后会触发handleResponse,可以当作一个ajax使用
    if(this.isRegister(service)) {
      return new Promise(resolve => {
        let id = shortid()
        this.socket.emit('request', service, data, id)
        this._request[id] = resolve
      })
    } else {
      console.warn(`${service} 服务未注册`)
      return false
    }
  }

  handleResponse = (data, id) => { //收到一个response,调用回调方法
    this._request[id] ? this._request[id](data) : null
    delete this._request[id]
  }

  isRegister(service) {//是否已经注册过该服务
    return !!this._emitterDict[service]
  }

  on(service, event, callback) {//监听指定服务的指定事件
    const emitter = this._emitterDict[service]
    emitter ? emitter.on(event, callback) : null
  }

  off(service, event, callback) {//移除指定服务指定事件的接听
    const emitter = this._emitterDict[service]
    emitter ? emitter.removeListener(event, callback) : null
  }
}
