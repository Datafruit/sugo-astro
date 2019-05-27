/**
 * Created on 06/02/2017.
 */
import _ from 'lodash'
import { UIActionTypes } from '../constants'
import { MessageTypes } from '../project/constants'

/**
 * @typedef {Object} UIMessage
 * @property {number} during
 * @property {('success'|'error'|'info'| 'warning')} type
 * @property {('message|notification')} messageType
 * @property {React.ReactNode|String} content
 * @see {MessageType}
 */

/**
 * @typedef {Object} Messages
 * @property {UIMessage | null} message
 */

/**
 * 确定消息类型
 * @param {string} type
 * @return {('success'|'error'|'info'| 'warning')}
 */
function message_ui_type (type) {
  switch (type) {
    case MessageTypes.InterfaceError:
    case MessageTypes.Notification:
      return 'info'
    default:
      return 'warning'
  }
}

/**
 * 确定消息内容
 * @param content
 * @param type
 * @return {React.ReactNode|String}
 */
function message_content (type, content) {
  switch (type) {
    /** @see {Response} */
    case MessageTypes.InterfaceError:
      return content.message
    default:
      return content
  }
}

/**
 * @return {UIMessage}
 */
function create_message ({ messageType = 'message', type, content, during = 2.5, ...other }) {
  return {
    content: message_content(type, content),
    type: message_ui_type(type),
    messageType,
    during,
    ...other
  }
}

function base_assign (state, next) {
  return _.assign(state, { message: null }, next)
}

/**
 * @type {Messages}
 */
const InitState = {
  message: null
}

function reducer (state = InitState, action) {
  switch (action.type) {
    case UIActionTypes.Message:
      return base_assign(state, { message: create_message(action.model) })
    default:
      return { message: null }
  }
}

export { reducer }
