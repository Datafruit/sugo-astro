/**
 * 调度管理所有websocket,根据不同的参数分配给不同的controller或者service处理
 * 
 */
import _ from 'lodash'
import ioServer from 'socket.io'
import serviceDict from './service.config'
import config from '../config'

const messageType = {
  register: 'register', //把连接注册到serviceName指定的服务,一个连接可以注册多个服务,只能由前端发往后端
  cancel: 'cancel', //注销指定服务,注销后,该服务将无法再使用该连接推送消息(除非重新注册),只能由前端发往后端
  message: 'message', //普通的消息,触发指定service的特定指定事件
  request: 'request' //请求类型,类似ajax,前端会期待服务在短时间内返回一个结果,在service内实现request方法即可对接,支持await,直接return结果即可
}

//socket服务器对象
let server = null
//已经被注册的模块,key为模块名,vlaue为WS实例
const registerMap = new Map()

/**
 * @description 获取socket.io服务端对象
 * @export
 * @param {any} app koa实例对象
 * @returns 
 */
export default function getServer(app) {
  const clusterId = Number(process.env.NODE_APP_INSTANCE || 0)
  //仅仅在第一个实例注册ws服务，这样就不会出现请求不匹配
  if (clusterId > 0) return app
  if(server) return server
  try {
    // 默认以sdk_ws_port自动生成临时端口（最终会转发到主程序服务端口)
    const port = (Number(config.site.sdk_ws_port) - 1) || 8886
    server = new ioServer(port)
    server.attach(app)
    server.on('connection', handleConn)
    return server
  } catch(e) {
    console.error('get socket.io server error =>', e)
  }
}

function handleConn(socket) {//新socket接入
  socket.use(function(packet, next) {
    packet
    next()
  })

  socket.__sugo = {
    services: {}
  }

  socket.on(messageType.register, handleRegister)
  socket.on(messageType.cancel, handleCancel)
  socket.on(messageType.message, handleMessage)
  socket.on(messageType.request, handleRequest)
  
  // 服务器重启后自动加入房间
  let {room} = socket.handshake.query
  if (room) {
    handleRegister.call(socket, room)
  }
  
  socket.on('disconnect', function() {
    Object.keys(this.__sugo.services).forEach(room => {
      handleCancel.call(this, room)
    })
  })

  socket.on('error', function(err) {
    throw err
  })
}

/**
 * 处理普通消息
 * 检查完是否注册后触发对应service内的事件
 */
function handleMessage(serviceName, eventName, data, id) {
  //触发事件,传递数据
  if(this.rooms[getRoomName(serviceName, 'register')]) {
    //触发对应服务内的事件
    const service = serviceDict[serviceName]
    service.emit(eventName, this.id, data, id)
  } else {
    sendMsg(this, serviceName, eventName, {
      error: 1,
      msg: '未注册服务'
    }, {id})
  }
}

/**
 * 传递socketId给要注册的模块,id是模块调用socket的主要依据
 */
async function handleRegister(serviceName, data) {
  //注册类型
  const serviceInst = serviceDict[serviceName]
  let ws = registerMap.get(serviceName) 
  if(!ws) {//还没有操作实例
    ws = new WS(serviceName)
    registerMap.set(serviceName, ws)
  }
  await register(this, serviceName)
  const success = await serviceInst.register(this.id, data, ws)
  if(!success){
    await cancel(this, serviceName)
  }
  serviceChange(this)
}

/**
 * 注销服务,该服务将无法再往该连接推送消息
 */
async function handleCancel(serviceName) {
  const service = serviceDict[serviceName]
  service.cancel(this.id)
  await cancel(this, serviceName)
  serviceChange(this)
}

/**
 * 一个类似ajax的请求,前端会期待在短时间内收到一个response
 * @param {String} serviceName 
 * @param {any} data 
 * @param {String} id 
 */
async function handleRequest(serviceName, data, id) {
  const service = serviceDict[serviceName]
  let res = await service.request(data, id)
  this.emit('response', res, id)
}

//注册服务
function register(socket, serviceName) {
  return new Promise(resolve => {
    socket.__sugo.services[serviceName] = serviceName
    socket.join(getRoomName(serviceName, 'register'), resolve)
  })
}

//注销服务
function cancel(socket, service) {
  return new Promise(resolve => {
    socket.leave(getRoomName(service, 'register'), resolve)
    const rooms = getServiceRooms(socket, service)
    rooms.forEach(room => socket.leave(room))
    delete socket.__sugo.services[service]
  })
}

function serviceChange(socket) {
  let services = Object.keys(socket.__sugo.services)
  socket.emit('serviceChange', services)
}

/**
 * 判断一个room名是否是service房间
 * @param {String} room 
 */
function isServiceRoom(room) {
  return /^\w+\|register$/.test(room)
}

//获取服务room名
function getRoomName(service, type, suffix) {
  if(_.isArray(suffix)) {
    return suffix.map(s => `${service}|${type}|${s}`)
  }
  return suffix ? `${service}|${type}|${suffix}` : `${service}|${type}`
}

/**
 * 获取一个service给socket打的所有tag
 * @param {String} service 
 */
function getServiceRooms(socket, service) {
  const prefix = `${service}|`
  let rooms = []
  for(let room in socket.rooms) {
    if(room.indexOf(prefix) === 0) {
      rooms.push(room)
    }
  }
  return rooms
}

function getConnById(id) {
  return server.sockets.sockets[id]
}

function sendMsg(socket, serviceName, event, data, opt = {}) {
  socket.emit('message', serviceName, event, data, opt)
}





/**
 * 其他模块用于操作连接的操作类,将会在连接注册服务时传递给服务模块使用
 */

class WS {
  constructor(serviceName) {
    Object.defineProperties(this, {
      'name': {
        value: serviceName,
        writable: false
      }
    })
  }
  
  /**
   * 给指定socket打标签,标签可作为一个标识,对连接进行分类, 一个连接可拥有多个标签
   * @param {String} id socket的id
   * @param {String} tag 标签字符串或是标签数组
   */
  addTag(id, tag) {
    const socket = getConnById(id)
    if (!socket || !this.verify(socket)) return
    let _tag = getRoomName(this.name, 'tag', tag)
    socket.join(_tag)
  }

  removeTag(id, tag) {
    const socket = getConnById(id)
    if (!socket || !this.verify(socket)) return
    let _tag = getRoomName(this.name, 'tag', tag)
    socket.leave(_tag)
  }

  /**
   * 给拥有特定标签的连接推送一条消息
   * @param {String} tag 标签
   * @param {String} event 触发的事件
   * @param {any} data 要推送的数据
   * @param {Object} opt 预留参数,暂时没用
   */
  pushByTag(tag, event, data, opt) {
    let _tag = getRoomName(this.name, 'tag', tag)
    server.to(_tag).emit('message', this.name, event, data, opt)
    // server.sockets[0].to(_tag).emit('message', this.name, event, data, opt)
  }

  /**
   * 给指定id的连接推送一条消息
   * @param {String} id socketId
   * @param {String} event 触发的事件
   * @param {any} data 
   * @param {Object} opt 预留参数,暂时没用
   */
  pushById(id, event, data, opt) {
    const socket = getConnById(id)
    if (!socket || !this.verify(socket)) return
    sendMsg(socket, this.name, event, data, opt)
  }
  
  getSocketById(sessionId) {
    return getConnById(sessionId)
  }

  //校验当前模块是否可以对某连接进行操作
  verify(socket) {
    let serviceRoom = getRoomName(this.name, 'register')
    return !!socket.rooms[serviceRoom]
  }
}
