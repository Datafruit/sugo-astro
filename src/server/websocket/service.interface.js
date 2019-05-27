/**
 * service的基本类,所有需要注册websocket的服务都需要继承本类
 * 只包含一些基本方法
 */
import EventEmitter from 'events'

class SocketServiceBase extends EventEmitter {
  constructor(name) {
    super()
  }

  register(id, data) {
    //新连接注册进来请求服务
    //可以在这里执行一些初始化的操作
    return true
  }

  cancel(id) {
    //前端注销服务,本服务已经无法再发送信息给前端,只能做一些清理数据的工作
  }

  request(data) {
    //前端发出一个请求,前端会期待短时间内返回一个结果,如同一个ajax,把结果直接return则可以返回给前端
    return null
  }
}

export default SocketServiceBase
