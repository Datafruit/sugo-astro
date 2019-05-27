/**
 * Created on 06/02/2017.
 */

import { message, notification } from 'antd'

/**
 * @typedef {Object} MessageType
 * @property {Object} message
 * @property {Object} notification
 */
const MessageType = {
  message,
  notification
}

function getArgs (messageType, content, duration, other) {
  switch (messageType) {
    case 'message':
      return [content, duration]
    case 'notification':
      return [{
        description: content,
        duration,
        ...other
      }]
  }
}

/**
 * 捕获消息，统一处理消息，需要统一定义错误消息
 * 此装饰器监听组件 props.message
 * @see {UIMessage}
 * @param {ReactComponent} component
 */
function catchMessage (component) {
  const proto = component.prototype
  const definedComponentDidUpdate = proto.componentDidUpdate
  proto.componentDidUpdate = function () {
    
    if (definedComponentDidUpdate) {
      try {
        definedComponentDidUpdate.apply(this, Array.prototype.slice.call(arguments))
      } catch (e) {
        debug('catchMessage.componentDidUpdate => ', e.message || e.stack)
      }
    }
    
    /** @type {UIMessage | null} */
    const _message = this.state.message
    if (!_message) return this
    
    try {
      const { messageType = 'message', type, content, during, ...other } = _message
      const method = MessageType[messageType]
      if (method) method[type].apply(null, getArgs(messageType, content, during, other))
    } catch (e) {
      debug(e.message)
    }
    
    // 清掉 message
    this.setState({ message: null })
    return this
  }
  
  proto.sendMessage = function (content, type = 'info', key = void 0) {
    this.setState({ message: { type, content, key } })
  }
}

export { catchMessage }
